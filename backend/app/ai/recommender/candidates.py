from sqlalchemy.orm import Session
from typing import List, Optional
from app.services.carbon.impact import get_action_catalog
from app.models import ActionCatalog

class CandidateBuilder:
    @staticmethod
    def get_candidates(db: Session, focus_category: Optional[str] = None) -> List[ActionCatalog]:
        catalog = get_action_catalog(db)
        if focus_category:
            return [a for a in catalog if a.category == focus_category]
        return catalog
