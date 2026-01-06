from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
import os
import stripe

from models.donation import Donation, PaymentTransaction, PaymentStatus
from utils.auth import get_current_user

router = APIRouter(prefix="/donations", tags=["Donations"])


@router.post("/checkout")
async def create_checkout(request: Request):
    """
    Create a Stripe checkout session for donation.
    """
    db = request.app.state.db
    body = await request.json()
    
    campaign_id = body.get("campaign_id")
    amount = body.get("amount")
    donor_name = body.get("donor_name", "Anonymous")
    donor_email = body.get("donor_email")
    anonymous = body.get("anonymous", False)
    origin_url = body.get("origin_url")
    
    if not campaign_id or not amount:
        raise HTTPException(status_code=400, detail="campaign_id and amount are required")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url is required")
    
    # Verify campaign exists and is active
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.get("status") != "active":
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")
    
    # Get current user if authenticated
    user = await get_current_user(request, db)
    donor_id = user.get("user_id") if user else None
    if user and not donor_name:
        donor_name = user.get("name", "Anonymous")
    if user and not donor_email:
        donor_email = user.get("email")
    
    # Initialize Stripe
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    stripe.api_key = stripe_api_key
    
    # Build success and cancel URLs
    success_url = f"{origin_url}/donate/success?session_id={{CHECKOUT_SESSION_ID}}&campaign_id={campaign_id}"
    cancel_url = f"{origin_url}/campaign/{campaign_id}"
    
    try:
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Donation to: {campaign.get('title', 'Campaign')}",
                            "description": f"Supporting {donor_name if not anonymous else 'a student'}'s education",
                        },
                        "unit_amount": int(float(amount) * 100),  # Convert to cents
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "campaign_id": campaign_id,
                "donor_id": donor_id or "",
                "donor_name": donor_name,
                "donor_email": donor_email or "",
                "anonymous": str(anonymous)
            }
        )
        
        # Create payment transaction record
        transaction = PaymentTransaction(
            session_id=session.id,
            campaign_id=campaign_id,
            donor_id=donor_id,
            donor_name=donor_name,
            donor_email=donor_email,
            amount=float(amount),
            currency="usd",
            anonymous=anonymous,
            payment_status=PaymentStatus.INITIATED,
            metadata={
                "campaign_id": campaign_id,
                "donor_name": donor_name,
                "anonymous": anonymous
            }
        )
        
        transaction_dict = transaction.model_dump()
        transaction_dict["created_at"] = transaction_dict["created_at"].isoformat()
        transaction_dict["updated_at"] = transaction_dict["updated_at"].isoformat()
        
        await db.payment_transactions.insert_one(transaction_dict)
        
        return {
            "success": True,
            "data": {
                "url": session.url,
                "session_id": session.id
            }
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{session_id}")
async def get_payment_status(request: Request, session_id: str):
    """
    Get payment status and update records if paid.
    """
    db = request.app.state.db
    
    # Get transaction from database
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed as paid, return cached status
    if transaction.get("payment_status") == "paid":
        return {
            "success": True,
            "data": {
                "status": "complete",
                "payment_status": "paid",
                "amount": transaction.get("amount"),
                "campaign_id": transaction.get("campaign_id")
            }
        }
    
    # Check with Stripe
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    stripe.api_key = stripe_api_key
    
    try:
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Map Stripe status to our status
        new_status = PaymentStatus.PENDING
        if checkout_session.payment_status == "paid":
            new_status = PaymentStatus.PAID
        elif checkout_session.status == "expired":
            new_status = PaymentStatus.EXPIRED
        elif checkout_session.status == "complete" and checkout_session.payment_status != "paid":
            new_status = PaymentStatus.FAILED
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": new_status.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If paid, create donation record and update campaign
        if new_status == PaymentStatus.PAID:
            # Check if donation already exists (prevent double processing)
            existing_donation = await db.donations.find_one(
                {"stripe_session_id": session_id},
                {"_id": 0}
            )
            
            if not existing_donation:
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
                
                await db.donations.insert_one(donation_dict)
                
                # Update campaign raised amount and donor count
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
        
        return {
            "success": True,
            "data": {
                "status": checkout_session.status,
                "payment_status": new_status.value,
                "amount": transaction.get("amount"),
                "campaign_id": transaction.get("campaign_id")
            }
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    
    # Format for public display
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
    
    # Enrich with campaign data
    enriched_donations = []
    for d in donations:
        campaign = await db.campaigns.find_one(
            {"campaign_id": d["campaign_id"]},
            {"_id": 0}
        )
        enriched_donations.append({
            **d,
            "campaign": campaign
        })
    
    return {
        "success": True,
        "data": enriched_donations
    }
