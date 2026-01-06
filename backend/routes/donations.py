from fastapi import APIRouter, Request, HTTPException, Header
from datetime import datetime, timezone
import os
import stripe
import uuid
import logging

from models.donation import Donation, PaymentTransaction, PaymentStatus
from utils.auth import get_current_user

router = APIRouter(prefix="/donations", tags=["Donations"])
logger = logging.getLogger(__name__)


@router.post("/checkout")
async def create_checkout(request: Request):
    """
    Create a Stripe checkout session for donation.
    Uses idempotency key to prevent duplicate transactions.
    """
    db = request.app.state.db
    body = await request.json()
    
    campaign_id = body.get("campaign_id")
    amount = body.get("amount")
    donor_name = body.get("donor_name", "Anonymous")
    donor_email = body.get("donor_email")
    anonymous = body.get("anonymous", False)
    origin_url = body.get("origin_url")
    idempotency_key = body.get("idempotency_key")  # Client-provided key
    
    if not campaign_id or not amount:
        raise HTTPException(status_code=400, detail="campaign_id and amount are required")
    
    try:
        amount = float(amount)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    if amount <= 0 or amount > 100000:  # Max $100k donation
        raise HTTPException(status_code=400, detail="Amount must be between $0.01 and $100,000")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url is required")
    
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"{campaign_id}_{amount}_{uuid.uuid4().hex[:16]}"
    
    # Check for existing transaction with same idempotency key
    existing = await db.payment_transactions.find_one(
        {"idempotency_key": idempotency_key},
        {"_id": 0}
    )
    if existing:
        return {
            "success": True,
            "data": {
                "url": existing.get("checkout_url"),
                "session_id": existing.get("session_id")
            },
            "message": "Existing checkout session returned"
        }
    
    # Verify campaign exists and is active
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("status") != "active":
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")
    
    # Get current user if authenticated
    user = await get_current_user(request, db)
    donor_id = user.get("user_id") if user else None
    if user and not donor_email:
        donor_email = user.get("email")
    
    # Initialize Stripe
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=503, detail="Payment service not configured")
    
    stripe.api_key = stripe_api_key
    
    success_url = f"{origin_url}/donate/success?session_id={{CHECKOUT_SESSION_ID}}&campaign_id={campaign_id}"
    cancel_url = f"{origin_url}/campaign/{campaign_id}"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Donation: {campaign.get('title', 'Campaign')[:50]}",
                        "description": f"Supporting education",
                    },
                    "unit_amount": int(amount * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=donor_email if donor_email else None,
            metadata={
                "campaign_id": campaign_id,
                "donor_id": donor_id or "",
                "donor_name": donor_name,
                "anonymous": str(anonymous),
                "idempotency_key": idempotency_key
            },
            idempotency_key=idempotency_key
        )
        
        # Create transaction record
        transaction = PaymentTransaction(
            session_id=session.id,
            campaign_id=campaign_id,
            donor_id=donor_id,
            donor_name=donor_name,
            donor_email=donor_email,
            amount=amount,
            currency="usd",
            anonymous=anonymous,
            payment_status=PaymentStatus.INITIATED,
            metadata={
                "idempotency_key": idempotency_key,
                "checkout_url": session.url
            }
        )
        
        transaction_dict = transaction.model_dump()
        transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
        transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
        transaction_dict["idempotency_key"] = idempotency_key
        transaction_dict["checkout_url"] = session.url
        
        await db.payment_transactions.insert_one(transaction_dict)
        
        return {
            "success": True,
            "data": {
                "url": session.url,
                "session_id": session.id
            }
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{session_id}")
async def get_payment_status(request: Request, session_id: str):
    """
    Get payment status. Primarily for polling after webhook.
    """
    db = request.app.state.db
    
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "success": True,
        "data": {
            "status": transaction.get("payment_status"),
            "payment_status": transaction.get("payment_status"),
            "amount": transaction.get("amount"),
            "campaign_id": transaction.get("campaign_id")
        }
    }


@router.get("/campaign/{campaign_id}")
async def get_campaign_donations(request: Request, campaign_id: str):
    """
    Get public donor wall for a campaign.
    """
    db = request.app.state.db
    
    donations = await db.donations.find(
        {"campaign_id": campaign_id, "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    donor_wall = []
    for d in donations:
        donor_wall.append({
            "name": "Anonymous" if d.get("anonymous") else d.get("donor_name", "Anonymous"),
            "amount": d.get("amount"),
            "date": d.get("created_at"),
            "anonymous": d.get("anonymous", False)
        })
    
    return {
        "success": True,
        "data": donor_wall
    }


@router.get("/my")
async def get_my_donations(request: Request):
    """
    Get current user's donation history.
    """
    db = request.app.state.db
    user = await get_current_user(request, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    donations = await db.donations.find(
        {"donor_id": user["user_id"], "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    enriched_donations = []
    for d in donations:
        campaign = await db.campaigns.find_one(
            {"campaign_id": d["campaign_id"]},
            {"_id": 0}
        )
        enriched_donations.append({**d, "campaign": campaign})
    
    return {
        "success": True,
        "data": enriched_donations
    }
