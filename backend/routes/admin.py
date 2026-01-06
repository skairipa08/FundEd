from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from typing import Optional

from models.user import UserRole, VerificationStatus, StudentProfile, StudentProfileCreate
from utils.auth import require_role, require_auth

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/students/pending")
async def list_pending_students(request: Request):
    """
    List all students with pending verification.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    # Get all pending student profiles
    pending_profiles = await db.student_profiles.find(
        {"verification_status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with user data
    enriched = []
    for profile in pending_profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            enriched.append({
                **profile,
                "user": user
            })
    
    return {
        "success": True,
        "data": enriched
    }


@router.get("/students")
async def list_all_students(request: Request, status: Optional[str] = None):
    """
    List all students, optionally filtered by verification status.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    query = {}
    if status:
        query["verification_status"] = status
    
    profiles = await db.student_profiles.find(query, {"_id": 0}).to_list(500)
    
    # Enrich with user data
    enriched = []
    for profile in profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            enriched.append({
                **profile,
                "user": user
            })
    
    return {
        "success": True,
        "data": enriched
    }


@router.put("/students/{user_id}/verify")
async def verify_student(request: Request, user_id: str):
    """
    Approve or reject a student's verification.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    body = await request.json()
    action = body.get("action")  # "approve" or "reject"
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")
    
    # Get student profile
    profile = await db.student_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    new_status = "verified" if action == "approve" else "rejected"
    
    # Update profile
    await db.student_profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "verification_status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If approved, also mark documents as verified
    if action == "approve" and profile.get("verification_documents"):
        docs = profile["verification_documents"]
        for doc in docs:
            doc["verified"] = True
        await db.student_profiles.update_one(
            {"user_id": user_id},
            {"$set": {"verification_documents": docs}}
        )
    
    return {
        "success": True,
        "message": f"Student {action}d successfully"
    }


@router.get("/campaigns")
async def list_all_campaigns(request: Request, status: Optional[str] = None):
    """
    List all campaigns (admin view).
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).to_list(500)
    
    # Enrich with student data
    enriched = []
    for campaign in campaigns:
        student = await db.users.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
        student_profile = await db.student_profiles.find_one({"user_id": campaign["student_id"]}, {"_id": 0})
        enriched.append({
            **campaign,
            "student": student,
            "student_profile": student_profile
        })
    
    return {
        "success": True,
        "data": enriched
    }


@router.get("/stats")
async def get_platform_stats(request: Request):
    """
    Get platform statistics.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    # Count users by role
    total_users = await db.users.count_documents({})
    total_students = await db.users.count_documents({"role": "student"})
    total_donors = await db.users.count_documents({"role": "donor"})
    
    # Student verification stats
    pending_verifications = await db.student_profiles.count_documents({"verification_status": "pending"})
    verified_students = await db.student_profiles.count_documents({"verification_status": "verified"})
    rejected_students = await db.student_profiles.count_documents({"verification_status": "rejected"})
    
    # Campaign stats
    total_campaigns = await db.campaigns.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    completed_campaigns = await db.campaigns.count_documents({"status": "completed"})
    
    # Donation stats
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": "$amount"},
            "total_donations": {"$sum": 1}
        }}
    ]
    donation_stats = await db.donations.aggregate(pipeline).to_list(1)
    
    total_raised = donation_stats[0]["total_amount"] if donation_stats else 0
    total_donations = donation_stats[0]["total_donations"] if donation_stats else 0
    
    return {
        "success": True,
        "data": {
            "users": {
                "total": total_users,
                "students": total_students,
                "donors": total_donors
            },
            "verifications": {
                "pending": pending_verifications,
                "verified": verified_students,
                "rejected": rejected_students
            },
            "campaigns": {
                "total": total_campaigns,
                "active": active_campaigns,
                "completed": completed_campaigns
            },
            "donations": {
                "total_amount": total_raised,
                "total_count": total_donations
            }
        }
    }


# Student profile endpoints (accessible by students)
@router.post("/students/profile", tags=["Students"])
async def create_student_profile(request: Request, profile_data: StudentProfileCreate):
    """
    Create a student profile. This also updates user role to student.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    # Check if profile already exists
    existing = await db.student_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Student profile already exists")
    
    # Create profile
    profile = StudentProfile(
        user_id=user["user_id"],
        country=profile_data.country,
        field_of_study=profile_data.field_of_study,
        university=profile_data.university,
        verification_documents=profile_data.verification_documents or []
    )
    
    profile_dict = profile.model_dump()
    profile_dict["created_at"] = profile_dict["created_at"].isoformat()
    profile_dict["updated_at"] = profile_dict["updated_at"].isoformat()
    
    await db.student_profiles.insert_one(profile_dict)
    
    # Update user role to student
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "role": "student",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "data": profile_dict,
        "message": "Student profile created. Awaiting verification."
    }
