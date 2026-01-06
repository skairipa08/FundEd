from fastapi import Request, HTTPException
from typing import Optional
import httpx
from datetime import datetime, timezone


async def get_current_user(request: Request, db) -> Optional[dict]:
    """
    Get current user from session token.
    Checks cookie first, then Authorization header.
    """
    session_token = None
    
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    # Find session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    return user_doc


async def require_auth(request: Request, db) -> dict:
    """
    Require authentication. Raises 401 if not authenticated.
    """
    user = await get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_role(request: Request, db, allowed_roles: list) -> dict:
    """
    Require specific role(s). Raises 403 if not authorized.
    """
    user = await require_auth(request, db)
    if user.get("role") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


async def exchange_session_id(session_id: str) -> dict:
    """
    Exchange session_id from Emergent Auth for user data and session_token.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session ID")
        
        return response.json()
