from fastapi import APIRouter, Request, HTTPException, Response
from datetime import datetime, timezone, timedelta
import uuid

from models.user import User, UserRole
from models.session import UserSession
from utils.auth import exchange_session_id, get_current_user, require_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/session")
async def create_session(request: Request, response: Response):
    """
    Exchange session_id for session_token.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Exchange session_id with Emergent Auth
    auth_data = await exchange_session_id(session_id)
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    if not email or not session_token:
        raise HTTPException(status_code=400, detail="Invalid auth data received")
    
    db = request.app.state.db
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        # Update existing user
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": name,
                "picture": picture,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        role = existing_user.get("role", "donor")
    else:
        # Create new user as donor by default
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture,
            role=UserRole.DONOR
        )
        user_dict = new_user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        user_dict["updated_at"] = user_dict["updated_at"].isoformat()
        await db.users.insert_one(user_dict)
        role = "donor"
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = UserSession(
        session_id=f"session_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_dict)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    # Get full user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": user_doc,
        "message": "Session created successfully"
    }


@router.get("/me")
async def get_me(request: Request):
    """
    Get current authenticated user.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    # Get student profile if user is a student
    student_profile = None
    if user.get("role") == "student":
        student_profile = await db.student_profiles.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0}
        )
    
    return {
        "success": True,
        "data": {
            **user,
            "student_profile": student_profile
        }
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Logout and clear session.
    """
    db = request.app.state.db
    user = await get_current_user(request, db)
    
    if user:
        # Delete session from database
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    # Clear cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {
        "success": True,
        "message": "Logged out successfully"
    }
