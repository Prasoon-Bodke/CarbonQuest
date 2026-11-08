from pydantic import BaseModel
from typing import Dict, Any, List

class ActionStat(BaseModel):
    alpha: float
    beta: float
    last_shown_cycle: int
    last_response: str

class AdaptiveProfileResponse(BaseModel):
    user_id: str
    action_stats: Dict[str, Any]
    category_weights: Dict[str, float]
    difficulty_tolerance: float
    cost_sensitivity: float
    feedback_count: int
    model_version: str
    explanation: str

class TrendPoint(BaseModel):
    cycle: int
    acceptance_rate: float
    total_actions: int

class AdaptiveMetricsResponse(BaseModel):
    user_id: str
    overall_acceptance_rate: float
    trend: List[TrendPoint]
