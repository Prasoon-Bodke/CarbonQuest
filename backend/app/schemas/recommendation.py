from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date
from app.schemas.common import BasisEnum, FeedbackResponseEnum, ReasonCodeEnum

class ScoreBreakdown(BaseModel):
    impact: float
    preference: float
    feasibility: float
    goal_fit: float
    cooldown_penalty: float

class RecommendationItem(BaseModel):
    id: str
    action_key: str
    title: str
    estimated_saving_kg_month: float
    basis: BasisEnum = BasisEnum.estimated
    difficulty: int
    cost_level: int
    priority_rank: int
    score: float
    score_breakdown: ScoreBreakdown
    explanation: str
    status: str

class AdaptationSummary(BaseModel):
    feedback_count: int
    changes_since_last_cycle: List[str]

class RecommendationGenerateRequest(BaseModel):
    max_items: int = Field(default=5, ge=1, le=20)
    focus_category: Optional[str] = None

class RecommendationGenerateResponse(BaseModel):
    cycle: int
    degraded: bool = False
    items: List[RecommendationItem]
    adaptation: AdaptationSummary

class RecommendationFeedbackRequest(BaseModel):
    response: FeedbackResponseEnum
    reason_code: Optional[ReasonCodeEnum] = None
    note: Optional[str] = ""
    modified_params: Optional[Dict[str, Any]] = None

class FeedbackRewardSummary(BaseModel):
    points_awarded: int
    badges_awarded: List[str]

class FeedbackProfileUpdate(BaseModel):
    feedback_count: int
    summary: str

class RecommendationFeedbackResponse(BaseModel):
    recommendation: Dict[str, Any]
    profile_update: FeedbackProfileUpdate
    rewards: FeedbackRewardSummary

class ActionLogCreate(BaseModel):
    recommendation_id: Optional[str] = None
    action_key: Optional[str] = None
    performed_on: date
    quantity: float = 1.0
    unit: str = "trips"
    note: Optional[str] = ""

class ActionLogRead(BaseModel):
    id: str
    recommendation_id: Optional[str] = None
    action_id: str
    performed_on: date
    quantity: float
    unit: str
    note: Optional[str] = ""
