from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date

class GoalCreate(BaseModel):
    goal_type: str # monthly_cap, reduce_pct, category_cap
    target_value: float
    category: Optional[str] = None
    start_date: date
    end_date: date

class GoalRead(BaseModel):
    id: str
    user_id: str
    goal_type: str
    target_value: float
    category: Optional[str] = None
    start_date: date
    end_date: date
    status: str
