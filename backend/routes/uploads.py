from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from typing import Optional
import os
import uuid
import httpx
import hashlib
import hmac
import time
import json
import base64

from utils.auth import require_auth

router = APIRouter(prefix="/uploads", tags=["Uploads"])


def get_cloudinary_config():
    """Get Cloudinary configuration from environment."""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    if not all([cloud_name, api_key, api_secret]):
        return None
    
    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "api_secret": api_secret
    }


def generate_cloudinary_signature(params: dict, api_secret: str) -> str:
    """Generate Cloudinary signature for signed uploads."""
    sorted_params = sorted(params.items())
    params_string = "&".join(f"{k}={v}" for k, v in sorted_params)
    signature = hashlib.sha1((params_string + api_secret).encode()).hexdigest()
    return signature


@router.get("/config")
async def get_upload_config(request: Request):
    """
    Get upload configuration for frontend.
    Returns signed upload params for direct browser upload to Cloudinary.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    config = get_cloudinary_config()
    if not config:
        raise HTTPException(
            status_code=503,
            detail="File uploads not configured. Set CLOUDINARY_* environment variables."
        )
    
    timestamp = int(time.time())
    folder = f"funded/{user['user_id']}"
    
    # Parameters for signed upload
    params = {
        "timestamp": timestamp,
        "folder": folder,
        "upload_preset": "funded_uploads"  # Optional: create this preset in Cloudinary
    }
    
    signature = generate_cloudinary_signature(params, config["api_secret"])
    
    return {
        "success": True,
        "data": {
            "cloud_name": config["cloud_name"],
            "api_key": config["api_key"],
            "signature": signature,
            "timestamp": timestamp,
            "folder": folder,
            "upload_url": f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/auto/upload"
        }
    }


@router.post("/image")
async def upload_image(request: Request, file: UploadFile = File(...), folder: str = Form(default="general")):
    """
    Server-side image upload to Cloudinary.
    Use this for profile pictures and campaign images.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    config = get_cloudinary_config()
    if not config:
        raise HTTPException(status_code=503, detail="File uploads not configured")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_types}")
    
    # Read file content
    content = await file.read()
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    timestamp = int(time.time())
    public_id = f"funded/{folder}/{user['user_id']}_{uuid.uuid4().hex[:8]}"
    
    params = {
        "timestamp": timestamp,
        "public_id": public_id
    }
    signature = generate_cloudinary_signature(params, config["api_secret"])
    
    # Upload to Cloudinary
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/image/upload",
            data={
                "timestamp": timestamp,
                "public_id": public_id,
                "signature": signature,
                "api_key": config["api_key"]
            },
            files={"file": (file.filename, content, file.content_type)}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to upload image")
        
        result = response.json()
    
    return {
        "success": True,
        "data": {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format")
        }
    }


@router.post("/document")
async def upload_document(request: Request, file: UploadFile = File(...), doc_type: str = Form(...)):
    """
    Upload verification document.
    Supports images and PDFs.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    config = get_cloudinary_config()
    if not config:
        raise HTTPException(status_code=503, detail="File uploads not configured")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: images and PDFs")
    
    content = await file.read()
    
    # Validate file size (max 20MB for documents)
    max_size = 20 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB")
    
    timestamp = int(time.time())
    public_id = f"funded/documents/{user['user_id']}_{doc_type}_{uuid.uuid4().hex[:8]}"
    
    params = {
        "timestamp": timestamp,
        "public_id": public_id,
        "resource_type": "auto"
    }
    signature = generate_cloudinary_signature(params, config["api_secret"])
    
    # Upload to Cloudinary
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/auto/upload",
            data={
                "timestamp": timestamp,
                "public_id": public_id,
                "signature": signature,
                "api_key": config["api_key"],
                "resource_type": "auto"
            },
            files={"file": (file.filename, content, file.content_type)}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to upload document")
        
        result = response.json()
    
    return {
        "success": True,
        "data": {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "doc_type": doc_type,
            "original_filename": file.filename,
            "format": result.get("format")
        }
    }


@router.delete("/{public_id:path}")
async def delete_file(request: Request, public_id: str):
    """
    Delete a file from Cloudinary.
    Users can only delete their own files.
    """
    db = request.app.state.db
    user = await require_auth(request, db)
    
    # Verify the file belongs to the user
    if user["user_id"] not in public_id and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Cannot delete files belonging to other users")
    
    config = get_cloudinary_config()
    if not config:
        raise HTTPException(status_code=503, detail="File uploads not configured")
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "public_id": public_id
    }
    signature = generate_cloudinary_signature(params, config["api_secret"])
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/image/destroy",
            data={
                "timestamp": timestamp,
                "public_id": public_id,
                "signature": signature,
                "api_key": config["api_key"]
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to delete file")
    
    return {
        "success": True,
        "message": "File deleted successfully"
    }
