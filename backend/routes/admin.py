from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from typing import Optional
import os

from models.user import UserRole, VerificationStatus, StudentProfile, StudentProfileCreate
from utils.auth import require_role, require_auth

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== User Management ====================

@router.get("/users")
async def list_users(request: Request, role: Optional[str] = None, page: int = 1, limit: int = 50):
    """
    List all users with optional role filter.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    query = {}
    if role:
        query["role"] = role
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {
        "success": True,
        "data": users,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total
        }
    }


@router.put("/users/{user_id}/role")
async def update_user_role(request: Request, user_id: str):
    """
    Update a user's role. Can promote to admin or demote.
    """
    db = request.app.state.db
    admin = await require_role(request, db, ["admin"])
    
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ["donor", "student", "admin", "institution"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Prevent self-demotion
    if user_id == admin["user_id"] and new_role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    # Check user exists
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "role": new_role,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"User role updated to {new_role}"
    }


@router.delete("/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    """
    Delete a user account. Soft delete by setting deleted flag.
    """
    db = request.app.state.db
    admin = await require_role(request, db, ["admin"])
    
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Delete sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {
        "success": True,
        "message": "User deleted"
    }


# ==================== Student Verification ====================

@router.get("/students/pending")
async def list_pending_students(request: Request):
    """
    List all students with pending verification.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    pending_profiles = await db.student_profiles.find(
        {"verification_status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    enriched = []
    for profile in pending_profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            enriched.append({**profile, "user": user})
    
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
    
    enriched = []
    for profile in profiles:
        user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
        if user:
            enriched.append({**profile, "user": user})
    
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
    action = body.get("action")
    reason = body.get("reason", "")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")
    
    profile = await db.student_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    new_status = "verified" if action == "approve" else "rejected"
    
    update_data = {
        "verification_status": new_status,
        "verified_at": datetime.now(timezone.utc).isoformat() if action == "approve" else None,
        "rejection_reason": reason if action == "reject" else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.student_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    # Mark documents as verified if approved
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


# ==================== Campaign Management ====================

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


@router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(request: Request, campaign_id: str):
    """
    Update campaign status (suspend/activate/cancel).
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    body = await request.json()
    new_status = body.get("status")
    reason = body.get("reason", "")
    
    if new_status not in ["active", "suspended", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "status": new_status,
            "status_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Campaign status updated to {new_status}"
    }


# ==================== Platform Statistics ====================

@router.get("/stats")
async def get_platform_stats(request: Request):
    """
    Get platform statistics.
    """
    db = request.app.state.db
    await require_role(request, db, ["admin"])
    
    total_users = await db.users.count_documents({"deleted": {"$ne": True}})
    total_students = await db.users.count_documents({"role": "student", "deleted": {"$ne": True}})
    total_donors = await db.users.count_documents({"role": "donor", "deleted": {"$ne": True}})
    total_admins = await db.users.count_documents({"role": "admin", "deleted": {"$ne": True}})
    
    pending_verifications = await db.student_profiles.count_documents({"verification_status": "pending"})
    verified_students = await db.student_profiles.count_documents({"verification_status": "verified"})
    rejected_students = await db.student_profiles.count_documents({"verification_status": "rejected"})
    
    total_campaigns = await db.campaigns.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    completed_campaigns = await db.campaigns.count_documents({"status": "completed"})
    
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
                "donors": total_donors,
                "admins": total_admins
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


# ==================== Student Profile (Non-Admin) ====================

@router.post("/students/profile", tags=["Students"])
async def create_student_profile(request: Request, profile_data: StudentProfileCreate):
    """
    Create a student profile. This also updates user role to student.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    existing = await db.student_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Student profile already exists")
    
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
