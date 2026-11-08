from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.schemas.common import BasisEnum

class EstimatedImpact(BaseModel):
    accepted_actions: int
    saving_kg_month: float
    basis: BasisEnum = BasisEnum.estimated

class MeasuredImpact(BaseModel):
    available: bool = False
    baseline_kg: Optional[float] = None
    current_kg: Optional[float] = None
    change_kg: Optional[float] = None
    basis: BasisEnum = BasisEnum.measured
    note: str

class ActionImpactItem(BaseModel):
    action_key: str
    estimated_kg_month: float
    measured_kg_month: Optional[float] = None

class ImpactSummaryResponse(BaseModel):
    estimated: EstimatedImpact
    measured: MeasuredImpact
    by_action: List[ActionImpactItem]
