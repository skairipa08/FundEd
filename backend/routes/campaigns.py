from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import math

from models.campaign import Campaign, CampaignCreate, CampaignUpdate, CampaignStatus
from models.user import VerificationStatus
from utils.auth import require_auth, require_role

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.get("")
async def list_campaigns(
    request: Request,
    category: Optional[str] = None,
    country: Optional[str] = None,
    field_of_study: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=50)
):
    """
    List all active campaigns with optional filters.
    """
    db = request.app.state.db
    
    # Build query
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"story": {"$regex": search, "$options": "i"}}
        ]
    
    # Get campaigns
    skip = (page - 1) * limit
    campaigns = await db.campaigns.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Filter by country/field_of_study (requires student profile lookup)
    if country or field_of_study:
        filtered_campaigns = []
        for campaign in campaigns:
            student_profile = await db.student_profiles.find_one(
                {"user_id": campaign["student_id"]},
                {"_id": 0}
            )
            if student_profile:
                if country and student_profile.get("country") != country:
                    continue
                if field_of_study and student_profile.get("field_of_study") != field_of_study:
                    continue
            filtered_campaigns.append(campaign)
        campaigns = filtered_campaigns
    
    # Enrich campaigns with student data
    enriched_campaigns = []
    for campaign in campaigns:
        student = await db.users.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
        student_profile = await db.student_profiles.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
        
        enriched_campaigns.append({
            **campaign,
            "student": {
                "name": student.get("name") if student else "Unknown",
                "picture": student.get("picture") if student else None,
                "country": student_profile.get("country") if student_profile else None,
                "field_of_study": student_profile.get("field_of_study") if student_profile else None,
                "university": student_profile.get("university") if student_profile else None,
                "verification_status": student_profile.get("verification_status") if student_profile else None
            }
        })
    
    # Get total count
    total = await db.campaigns.count_documents(query)
    
    return {
        "success": True,
        "data": enriched_campaigns,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": math.ceil(total / limit) if total > 0 else 0
        }
    }


@router.get("/my")
async def get_my_campaigns(request: Request):
    """
    Get current user's campaigns (students only).
    """
    db = request.app.state.db
    user = await require_role(request, db, ["student", "admin"])
    
    campaigns = await db.campaigns.find(
        {"student_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "data": campaigns
    }


@router.get("/{campaign_id}")
async def get_campaign(request: Request, campaign_id: str):
    """
    Get campaign details by ID.
    """
    db = request.app.state.db
    
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get student data
    student = await db.users.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
    student_profile = await db.student_profiles.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
    
    # Get recent donors (public donor wall)
    donations = await db.donations.find(
        {"campaign_id": campaign_id, "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Format donors for donor wall (hide names if anonymous)
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
        "data": {
            **campaign,
            "student": {
                "user_id": student.get("user_id") if student else None,
                "name": student.get("name") if student else "Unknown",
                "email": student.get("email") if student else None,
                "picture": student.get("picture") if student else None,
                "country": student_profile.get("country") if student_profile else None,
                "field_of_study": student_profile.get("field_of_study") if student_profile else None,
                "university": student_profile.get("university") if student_profile else None,
                "verification_status": student_profile.get("verification_status") if student_profile else None,
                "verification_documents": student_profile.get("verification_documents", []) if student_profile else []
            },
            "donors": donor_wall
        }
    }


@router.post("")
async def create_campaign(request: Request, campaign_data: CampaignCreate):
    """
    Create a new campaign. Only verified students can create campaigns.
    """
    db = request.app.state.db
    user = await require_role(request, db, ["student"])
    
    # Check if student is verified
    student_profile = await db.student_profiles.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not student_profile:
        raise HTTPException(
            status_code=400, 
            detail="You must create a student profile first"
        )
    
    if student_profile.get("verification_status") != "verified":
        raise HTTPException(
            status_code=403, 
            detail="Only verified students can create campaigns. Your verification status: " + student_profile.get("verification_status", "pending")
        )
    
    # Create campaign
    campaign = Campaign(
        student_id=user["user_id"],
        title=campaign_data.title,
        story=campaign_data.story,
        category=campaign_data.category,
        target_amount=campaign_data.target_amount,
        timeline=campaign_data.timeline,
        impact_log=campaign_data.impact_log
    )
    
    campaign_dict = campaign.model_dump()
    campaign_dict["created_at"] = campaign_dict["created_at"].isoformat()
    campaign_dict["updated_at"] = campaign_dict["updated_at"].isoformat()
    
    await db.campaigns.insert_one(campaign_dict)
    
    return {
        "success": True,
        "data": campaign_dict,
        "message": "Campaign created successfully"
    }


@router.put("/{campaign_id}")
async def update_campaign(request: Request, campaign_id: str, campaign_data: CampaignUpdate):
    """
    Update a campaign. Only owner can update.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    # Get campaign
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check ownership (or admin)
    if campaign["student_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this campaign")
    
    # Update fields
    update_data = campaign_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": update_data}
    )
    
    updated_campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": updated_campaign,
        "message": "Campaign updated successfully"
    }


@router.delete("/{campaign_id}")
async def delete_campaign(request: Request, campaign_id: str):
    """
    Cancel a campaign. Only owner or admin can cancel.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    # Get campaign
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check ownership (or admin)
    if campaign["student_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this campaign")
    
    # Soft delete - change status to cancelled
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Campaign cancelled successfully"
    }
