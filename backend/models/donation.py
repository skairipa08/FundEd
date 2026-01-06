from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class PaymentStatus(str, Enum):
    INITIATED = "initiated"
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    EXPIRED = "expired"


class Donation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    donation_id: str = Field(default_factory=lambda: f"donation_{uuid.uuid4().hex[:12]}")
    campaign_id: str
    donor_id: Optional[str] = None
    donor_name: str
    donor_email: Optional[str] = None
    amount: float
    anonymous: bool = False
    stripe_session_id: Optional[str] = None
    payment_status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DonationCreate(BaseModel):
    campaign_id: str
    amount: float
    donor_name: Optional[str] = "Anonymous"
    anonymous: bool = False


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    session_id: str  # Stripe session ID
    campaign_id: str
    donor_id: Optional[str] = None
    donor_name: str
    donor_email: Optional[str] = None
    amount: float
    currency: str = "usd"
    anonymous: bool = False
    payment_status: PaymentStatus = PaymentStatus.INITIATED
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
