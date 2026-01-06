from fastapi import APIRouter, Request, HTTPException, Header
from datetime import datetime, timezone
import os
import stripe
import logging

from models.donation import Donation, PaymentStatus

router = APIRouter(prefix="/stripe", tags=["Stripe Webhooks"])
logger = logging.getLogger(__name__)


async def process_successful_payment(db, session_id: str, metadata: dict):
    """
    Process a successful payment - create donation and update campaign.
    Uses transaction-like pattern with idempotency check.
    """
    # Check if already processed (idempotency)
    existing_donation = await db.donations.find_one(
        {"stripe_session_id": session_id},
        {"_id": 0}
    )
    if existing_donation:
        logger.info(f"Payment {session_id} already processed, skipping")
        return
    
    # Get transaction record
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        logger.error(f"Transaction not found for session {session_id}")
        return
    
    # Create donation record
    donation = Donation(
        campaign_id=transaction["campaign_id"],
        donor_id=transaction.get("donor_id"),
        donor_name=transaction.get("donor_name", "Anonymous"),
        donor_email=transaction.get("donor_email"),
        amount=transaction["amount"],
        anonymous=transaction.get("anonymous", False),
        stripe_session_id=session_id,
        payment_status=PaymentStatus.PAID
    )
    
    donation_dict = donation.model_dump()
    donation_dict["created_at"] = donation_dict["created_at"].isoformat()
    donation_dict["stripe_payment_intent"] = metadata.get("payment_intent")
    
    await db.donations.insert_one(donation_dict)
    
    # Update transaction status
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": "paid",
            "stripe_payment_intent": metadata.get("payment_intent"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update campaign
    await db.campaigns.update_one(
        {"campaign_id": transaction["campaign_id"]},
        {
            "$inc": {
                "raised_amount": transaction["amount"],
                "donor_count": 1
            },
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Check if campaign reached target
    campaign = await db.campaigns.find_one(
        {"campaign_id": transaction["campaign_id"]},
        {"_id": 0}
    )
    if campaign and campaign.get("raised_amount", 0) >= campaign.get("target_amount", 0):
        await db.campaigns.update_one(
            {"campaign_id": transaction["campaign_id"]},
            {"$set": {"status": "completed"}}
        )
    
    logger.info(f"Successfully processed payment {session_id}")


async def process_payment_failure(db, session_id: str):
    """Handle failed payment."""
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": "failed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    logger.info(f"Marked payment {session_id} as failed")


async def process_refund(db, payment_intent_id: str, refund_amount: float):
    """Handle refund."""
    # Find donation by payment intent
    donation = await db.donations.find_one(
        {"stripe_payment_intent": payment_intent_id},
        {"_id": 0}
    )
    
    if not donation:
        logger.warning(f"No donation found for refunded payment intent {payment_intent_id}")
        return
    
    # Update donation status
    await db.donations.update_one(
        {"stripe_payment_intent": payment_intent_id},
        {"$set": {
            "payment_status": "refunded",
            "refund_amount": refund_amount,
            "refunded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update campaign totals
    await db.campaigns.update_one(
        {"campaign_id": donation["campaign_id"]},
        {
            "$inc": {
                "raised_amount": -refund_amount,
                "donor_count": -1
            },
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"Processed refund for payment intent {payment_intent_id}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """
    Handle Stripe webhooks with signature verification.
    """
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
    if not stripe_api_key:
        logger.error("Stripe API key not configured")
        return {"error": "Stripe not configured"}
    
    stripe.api_key = stripe_api_key
    payload = await request.body()
    
    # Verify webhook signature
    if webhook_secret:
        if not stripe_signature:
            logger.warning("Missing Stripe signature header")
            raise HTTPException(status_code=400, detail="Missing signature")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, webhook_secret
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Development mode - parse without verification
        logger.warning("Webhook signature verification disabled - set STRIPE_WEBHOOK_SECRET for production")
        try:
            import json
            data = json.loads(payload)
            event = stripe.Event.construct_from(data, stripe_api_key)
        except Exception as e:
            logger.error(f"Failed to parse webhook: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid payload")
    
    db = request.app.state.db
    event_type = event.type
    
    logger.info(f"Received Stripe webhook: {event_type}")
    
    try:
        if event_type == "checkout.session.completed":
            session = event.data.object
            if session.payment_status == "paid":
                await process_successful_payment(
                    db, 
                    session.id,
                    {"payment_intent": session.payment_intent}
                )
        
        elif event_type == "checkout.session.async_payment_succeeded":
            session = event.data.object
            await process_successful_payment(
                db,
                session.id,
                {"payment_intent": session.payment_intent}
            )
        
        elif event_type == "checkout.session.async_payment_failed":
            session = event.data.object
            await process_payment_failure(db, session.id)
        
        elif event_type == "checkout.session.expired":
            session = event.data.object
            await db.payment_transactions.update_one(
                {"session_id": session.id},
                {"$set": {
                    "payment_status": "expired",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        elif event_type == "charge.refunded":
            charge = event.data.object
            refund_amount = charge.amount_refunded / 100  # Convert from cents
            await process_refund(db, charge.payment_intent, refund_amount)
        
        return {"success": True, "event_type": event_type}
    
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {str(e)}")
        # Return 200 to prevent Stripe retries for processing errors
        return {"success": False, "error": str(e)}
