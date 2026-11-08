from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.schemas.common import BasisEnum

class EstimatedImpact(BaseModel):
    accepted_actions: int
    saving_kg_month: float
    basis: BasisEnum = BasisEnum.estimated

class MeasuredImpact(BaseModel):
    available: bool
    baseline_kg: float
    current_kg: float
    change_kg: float
    basis: BasisEnum = BasisEnum.measured
    note: str

class ActionImpactItem(BaseModel):
    action_key: str
    estimated_kg_month: float
    measured_kg_month: float

class ImpactSummaryResponse(BaseModel):
    estimated: EstimatedImpact
    measured: MeasuredImpact
    by_action: List[ActionImpactItem]
