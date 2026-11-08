from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProfilePreferences(BaseModel):
    ok_modes: List[str] = ["bus", "metro", "bicycle", "two_wheeler"]
    diet: str = "vegetarian"
    budget_level: str = "medium"
    effort_level: str = "medium"

class ProfileRead(BaseModel):
    id: str
    display_name: Optional[str] = None
    age_band: Optional[str] = None
    region_code: str = "IN"
    household_size: int = 2
    monthly_target_kg: Optional[float] = 100.0
    preferences: Dict[str, Any] = {}
    consent_tracking: bool = True
    consent_leaderboard: bool = True
    onboarding_done: bool = False

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    age_band: Optional[str] = None
    region_code: Optional[str] = None
    household_size: Optional[int] = None
    monthly_target_kg: Optional[float] = None
    preferences: Optional[Dict[str, Any]] = None

class ConsentUpdate(BaseModel):
    consent_tracking: bool
    consent_leaderboard: bool

class HabitInput(BaseModel):
    category: str
    activity_key: str
    frequency: str = "daily"  # "daily" or "weekly"
    quantity: float = Field(gt=0)
    unit: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class OnboardingInput(BaseModel):
    display_name: Optional[str] = None
    age_band: Optional[str] = None
    household_size: Optional[int] = 2
    monthly_target_kg: Optional[float] = 100.0
    preferences: Optional[Dict[str, Any]] = None
    habits: List[HabitInput] = Field(default_factory=list)

class OnboardingResponse(BaseModel):
    status: str
    activities_created: int
    profile: ProfileRead
