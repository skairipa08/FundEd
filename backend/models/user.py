from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    STUDENT = "student"
    DONOR = "donor"
    INSTITUTION = "institution"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class VerificationDocument(BaseModel):
    type: str
    url: Optional[str] = None
    verified: bool = False


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole = UserRole.DONOR
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole = UserRole.DONOR


class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[UserRole] = None


class StudentProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:12]}")
    user_id: str
    country: str
    field_of_study: str
    university: str
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verification_documents: List[VerificationDocument] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentProfileCreate(BaseModel):
    country: str
    field_of_study: str
    university: str
    verification_documents: Optional[List[VerificationDocument]] = []
