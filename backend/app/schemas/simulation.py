from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.common import BasisEnum

class ScenarioInput(BaseModel):
    label: str
    change_type: str
    activity_key: str
    params: Dict[str, Any] = Field(default_factory=dict)

class SimulationRequest(BaseModel):
    scenarios: List[ScenarioInput]

class ScenarioAssumption(BaseModel):
    key: str
    label: str
    value: float
    unit: str
    source: str

class FeasibilityScore(BaseModel):
    difficulty: int
    cost_level: int

class ScenarioResult(BaseModel):
    label: str
    projected_kg_month: float
    saving_kg_month: float
    saving_pct: float
    basis: BasisEnum = BasisEnum.estimated
    confidence: float
    feasibility: FeasibilityScore
    assumptions: List[ScenarioAssumption]

class SimulationResponse(BaseModel):
    id: str
    baseline_kg_month: float
    results: List[ScenarioResult]
