from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CategoryEnum(str, Enum):
    transport = "transport"
    electricity = "electricity"
    food = "food"
    shopping = "shopping"
    waste = "waste"

class SourceEnum(str, Enum):
    manual = "manual"
    csv = "csv"
    strava = "strava"
    maps = "maps"

class ValidationStatusEnum(str, Enum):
    accepted = "accepted"
    flagged = "flagged"
    rejected = "rejected"

class RecommendationStatusEnum(str, Enum):
    proposed = "proposed"
    accepted = "accepted"
    modified = "modified"
    skipped = "skipped"
    rejected = "rejected"
    completed = "completed"
    expired = "expired"

class FeedbackResponseEnum(str, Enum):
    accepted = "accepted"
    modified = "modified"
    skipped = "skipped"
    rejected = "rejected"

class ReasonCodeEnum(str, Enum):
    not_practical = "not_practical"
    too_costly = "too_costly"
    not_relevant = "not_relevant"
    already_doing = "already_doing"
    other = "other"

class BasisEnum(str, Enum):
    estimated = "estimated"
    measured = "measured"

class PeriodEnum(str, Enum):
    day = "day"
    week = "week"
    month = "month"

class PaginatedParams(BaseModel):
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
