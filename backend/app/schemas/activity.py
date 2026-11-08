from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from app.schemas.common import CategoryEnum, SourceEnum, ValidationStatusEnum

class ActivityCreate(BaseModel):
    category: CategoryEnum
    activity_key: str
    quantity: float = Field(gt=0)
    unit: str
    occurred_on: date
    source: SourceEnum = SourceEnum.manual
    metadata: Dict[str, Any] = Field(default_factory=dict)

class EmissionFactorRef(BaseModel):
    id: str
    value: float
    unit: str
    source_name: str
    source_year: int

class EmissionResult(BaseModel):
    id: str
    kg_co2e: float
    factor: EmissionFactorRef
    confidence: float
    confidence_reasons: List[str]

class ActivityReadItem(BaseModel):
    id: str
    category: str
    activity_key: str
    quantity: float
    unit: str
    occurred_on: date
    source: str
    validation_status: str
    validation_score: float
    validation_reasons: List[str] = []

class ActivityCreateResponse(BaseModel):
    activity: ActivityReadItem
    emission: Optional[EmissionResult] = None

class ActivityListResponse(BaseModel):
    items: List[ActivityReadItem]
    total: int
    limit: int
    offset: int
