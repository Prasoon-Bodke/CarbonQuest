from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class ChatGrounding(BaseModel):
    footprint_period: str
    factor_sources: List[str]
    recommendation_ids: Optional[List[str]] = None

class ChatMessageResponse(BaseModel):
    session_id: str
    reply: str
    degraded: bool = False
    grounding: ChatGrounding
    disclaimer: str = "Estimates based on published emission factors, not measured emissions."
