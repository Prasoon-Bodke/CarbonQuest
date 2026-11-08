from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ActionDef(BaseModel):
    id: str
    action_key: str
    title: str
    description: str
    category: str
    activity_key: str
    change_type: str
    default_params: Dict[str, Any]
    difficulty: int
    cost_level: int
    tags: List[str]

class ActionCatalogResponse(BaseModel):
    actions: List[ActionDef]
