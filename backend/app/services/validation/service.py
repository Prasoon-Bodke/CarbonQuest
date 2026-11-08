import hashlib
from typing import Dict, Any, Tuple, List
from app.services.validation.rules import validate_activity

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
    ) -> Tuple[str, float, List[str], str]:
        status, score, reasons = validate_activity(category, activity_key, quantity, metadata)
        dedupe = calculate_dedupe_hash(user_id, activity_key, occurred_on, quantity)
        return status, score, reasons, dedupe
