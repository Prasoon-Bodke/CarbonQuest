from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date
from app.schemas.common import BasisEnum

class CategorySplit(BaseModel):
    category: str
    kg_co2e: float
    share_pct: float

class FootprintSummary(BaseModel):
    period: str
    period_start: str
    period_end: str
    total_kg_co2e: float
    basis: BasisEnum = BasisEnum.estimated
    by_category: List[CategorySplit]
    previous_period_total_kg: Optional[float] = None
    change_pct: Optional[float] = None
    confidence: float
    confidence_label: str
    activity_count: int

class HotspotItem(BaseModel):
    rank: int
    category: str
    activity_key: str
    kg_co2e: float
    share_pct: float
    vs_previous_pct: float
    why: str

class FootprintHotspotsResponse(BaseModel):
    period: str
    hotspots: List[HotspotItem]

class FootprintExplainResponse(BaseModel):
    emission_record_id: str
    formula: str
    quantity: float
    unit: str
    factor_value: float
    factor_unit: str
    source_name: str
    source_year: int
    confidence: float
    confidence_reasons: List[str]
