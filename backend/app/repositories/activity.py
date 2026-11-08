from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.models import Activity
from app.repositories.base import BaseRepository

class ActivityRepository(BaseRepository[Activity]):
    def __init__(self, db: Session):
        super().__init__(Activity, db)

    def find_duplicate(self, user_id: str, dedupe_hash: str) -> Optional[Activity]:
        return (
            self.db.query(Activity)
            .filter(Activity.user_id == user_id, Activity.dedupe_hash == dedupe_hash)
            .first()
        )

    def get_daily_total_quantity(self, user_id: str, activity_key: str, occurred_on: date) -> float:
        result = (
            self.db.query(func.coalesce(func.sum(Activity.quantity), 0.0))
            .filter(
                Activity.user_id == user_id,
                Activity.activity_key == activity_key,
                Activity.occurred_on == occurred_on,
                Activity.validation_status != "rejected",
            )
            .scalar()
        )
        return float(result)

    def get_history_for_key(self, user_id: str, activity_key: str, limit: int = 50) -> List[float]:
        rows = (
            self.db.query(Activity.quantity)
            .filter(
                Activity.user_id == user_id,
                Activity.activity_key == activity_key,
                Activity.validation_status.in_(["accepted", "flagged"]),
            )
            .order_by(Activity.occurred_on.desc())
            .limit(limit)
            .all()
        )
        return [float(r[0]) for r in rows]

    def list_user_activities(
        self,
        user_id: str,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Activity], int]:
        query = self.db.query(Activity).filter(Activity.user_id == user_id)
        if category:
            query = query.filter(Activity.category == category)
        total = query.count()
        items = query.order_by(Activity.occurred_on.desc()).offset(offset).limit(limit).all()
        return items, total

    def get_by_user_and_id(self, user_id: str, activity_id: str) -> Optional[Activity]:
        return (
            self.db.query(Activity)
            .filter(Activity.id == activity_id, Activity.user_id == user_id)
            .first()
        )
