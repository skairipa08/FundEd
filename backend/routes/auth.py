from fastapi import APIRouter, Request, HTTPException, Response, Depends
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import secrets
import hashlib

from models.user import User, UserRole
from models.session import UserSession
from utils.auth import get_current_user, require_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_google_oauth_config():
    """Get Google OAuth configuration from environment."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")
    
    if not client_id or not client_secret:
        return None
    
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "userinfo_uri": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"]
    }


@router.get("/config")
async def get_auth_config():
    """
    Get OAuth configuration for frontend.
    Returns client_id and auth URL (never the secret).
    """
    config = get_google_oauth_config()
    
    if not config:
        raise HTTPException(
            status_code=503, 
            detail="OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Build authorization URL
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": " ".join(config["scopes"]),
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"{config['auth_uri']}?" + "&".join(f"{k}={v}" for k, v in params.items())
    
    return {
        "success": True,
        "data": {
            "auth_url": auth_url,
            "state": state,
            "client_id": config["client_id"]
        }
    }


@router.post("/google/callback")
async def google_callback(request: Request, response: Response):
    """
    Handle Google OAuth callback.
    Exchange authorization code for tokens and create session.
    """
    body = await request.json()
    code = body.get("code")
    
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code is required")
    
    config = get_google_oauth_config()
    if not config:
        raise HTTPException(status_code=503, detail="OAuth not configured")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            config["token_uri"],
            data={
                "code": code,
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "redirect_uri": config["redirect_uri"],
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to exchange code: {token_response.text}"
            )
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info
        userinfo_response = await client.get(
            config["userinfo_uri"],
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        userinfo = userinfo_response.json()
    
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    db = request.app.state.db
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": name,
                "picture": picture,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Check if this should be initial admin
        initial_admin_email = os.environ.get("INITIAL_ADMIN_EMAIL", "").lower()
        is_admin = email.lower() == initial_admin_email if initial_admin_email else False
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture,
            role=UserRole.ADMIN if is_admin else UserRole.DONOR
        )
        user_dict = new_user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        user_dict["updated_at"] = user_dict["updated_at"].isoformat()
        await db.users.insert_one(user_dict)
    
    # Generate secure session token
    session_token = secrets.token_urlsafe(64)
    
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
    
    # Determine cookie settings based on environment
    is_production = os.environ.get("ENVIRONMENT", "development") == "production"
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=is_production,
        samesite="lax" if not is_production else "none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "success": True,
        "data": user_doc,
        "message": "Login successful"
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
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    is_production = os.environ.get("ENVIRONMENT", "development") == "production"
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=is_production,
        samesite="lax" if not is_production else "none"
    )
    
    return {
        "success": True,
        "message": "Logged out successfully"
    }
