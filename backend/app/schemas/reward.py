from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class StreakInfo(BaseModel):
    current: int
    longest: int

class BadgeRead(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    awarded_at: Optional[datetime] = None

class RewardSummaryResponse(BaseModel):
    eco_score: int
    points_balance: int
    streaks: Dict[str, StreakInfo]
    badges: List[BadgeRead]

class LeaderboardRankItem(BaseModel):
    rank: int
    display_name: str
    eco_score: int
    co2_avoided_kg: float
    points: int
