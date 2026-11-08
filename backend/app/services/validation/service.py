import hashlib
from typing import Dict, Any, Tuple, List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.services.validation.rules import validate_activity
from app.repositories.activity import ActivityRepository

def calculate_dedupe_hash(user_id: str, activity_key: str, occurred_on: str, quantity: float) -> str:
    raw = f"{user_id}:{activity_key}:{occurred_on}:{quantity}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

class ValidationService:
    @staticmethod
    def validate(
        user_id: str,
        category: str,
        activity_key: str,
        quantity: float,
        occurred_on: str,
        metadata: Dict[str, Any],
        db: Optional[Session] = None,
        exclude_activity_id: Optional[str] = None,
    ) -> Tuple[str, float, List[str], str]:
        daily_total = 0.0
        history: List[float] = []

        if db:
            repo = ActivityRepository(db)
            try:
                occ_date = date.fromisoformat(occurred_on)
                daily_total = repo.get_daily_total_quantity(user_id, activity_key, occ_date)
                history = repo.get_history_for_key(user_id, activity_key, limit=50)
            except Exception:
                pass

        status, score, reasons = validate_activity(
            category=category,
            activity_key=activity_key,
            quantity=quantity,
            metadata=metadata,
            history=history,
            daily_existing_total=daily_total,
        )
        dedupe = calculate_dedupe_hash(user_id, activity_key, occurred_on, quantity)
        return status, score, reasons, dedupe
