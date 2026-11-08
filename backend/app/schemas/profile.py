from pydantic import BaseModel
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
