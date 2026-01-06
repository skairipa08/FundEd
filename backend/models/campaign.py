from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class CampaignCategory(str, Enum):
    TUITION = "tuition"
    BOOKS = "books"
    LAPTOP = "laptop"
    HOUSING = "housing"
    TRAVEL = "travel"
    EMERGENCY = "emergency"


class CampaignStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    campaign_id: str = Field(default_factory=lambda: f"campaign_{uuid.uuid4().hex[:12]}")
    student_id: str
    title: str
    story: str
    category: CampaignCategory
    target_amount: float
    raised_amount: float = 0.0
    donor_count: int = 0
    timeline: str
    impact_log: Optional[str] = None
    status: CampaignStatus = CampaignStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CampaignCreate(BaseModel):
    title: str
    story: str
    category: CampaignCategory
    target_amount: float
    timeline: str
    impact_log: Optional[str] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    story: Optional[str] = None
    category: Optional[CampaignCategory] = None
    target_amount: Optional[float] = None
    timeline: Optional[str] = None
    impact_log: Optional[str] = None
    status: Optional[CampaignStatus] = None
