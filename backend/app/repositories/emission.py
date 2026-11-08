from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from collections import defaultdict
from app.models import EmissionRecord, Activity, EmissionFactor
from app.repositories.base import BaseRepository

class EmissionRepository(BaseRepository[EmissionRecord]):
    def __init__(self, db: Session):
        super().__init__(EmissionRecord, db)

    def get_by_activity_id(self, activity_id: str) -> Optional[EmissionRecord]:
        return (
            self.db.query(EmissionRecord)
            .filter(EmissionRecord.activity_id == activity_id)
            .first()
        )

    def get_record_with_factor(self, record_id: str) -> Optional[Tuple[EmissionRecord, Optional[EmissionFactor]]]:
        row = (
            self.db.query(EmissionRecord, EmissionFactor)
            .outerjoin(EmissionFactor, EmissionRecord.emission_factor_id == EmissionFactor.id)
            .filter(EmissionRecord.id == record_id)
            .first()
        )
        if not row:
            return None
        return row[0], row[1]

    def aggregate_for_period(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
    ) -> Tuple[float, List[Dict[str, Any]], int]:
        rows = (
            self.db.query(Activity.category, func.sum(EmissionRecord.kg_co2e), func.count(EmissionRecord.id))
            .join(EmissionRecord, Activity.id == EmissionRecord.activity_id)
            .filter(
                EmissionRecord.user_id == user_id,
                Activity.occurred_on >= start_date,
                Activity.occurred_on <= end_date,
            )
            .group_by(Activity.category)
            .all()
        )

        total_kg = sum(float(r[1]) for r in rows) if rows else 0.0
        total_count = sum(int(r[2]) for r in rows) if rows else 0

        by_category = []
        for cat, kg, _ in rows:
            kg_val = float(kg)
            share = round((kg_val / max(0.001, total_kg)) * 100, 1) if total_kg > 0 else 0.0
            by_category.append({
                "category": cat,
                "kg_co2e": round(kg_val, 3),
                "share_pct": share,
            })

        return round(total_kg, 3), by_category, total_count

    def aggregate_timeseries(
        self,
        user_id: str,
        months_back: int = 4,
    ) -> List[Dict[str, Any]]:
        rows = (
            self.db.query(Activity.occurred_on, EmissionRecord.kg_co2e)
            .join(EmissionRecord, Activity.id == EmissionRecord.activity_id)
            .filter(EmissionRecord.user_id == user_id)
            .all()
        )
        if not rows:
            return []

        # Bucket by YYYY-MM
        buckets = defaultdict(float)
        for occurred_on, kg in rows:
            bucket_key = occurred_on.strftime("%b %Y")
            buckets[bucket_key] += kg

        return [{"label": k, "total_kg": round(v, 3)} for k, v in buckets.items()]

    def get_records_with_activity(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Tuple[EmissionRecord, Activity]]:
        query = (
            self.db.query(EmissionRecord, Activity)
            .join(Activity, EmissionRecord.activity_id == Activity.id)
            .filter(EmissionRecord.user_id == user_id)
        )
        if start_date:
            query = query.filter(Activity.occurred_on >= start_date)
        if end_date:
            query = query.filter(Activity.occurred_on <= end_date)
        return query.all()
