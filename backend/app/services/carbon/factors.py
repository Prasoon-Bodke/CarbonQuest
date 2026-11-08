from sqlalchemy.orm import Session
from app.models import EmissionFactor
from typing import Optional, List, Dict

class FactorService:
    @staticmethod
    def get_factor(db: Session, activity_key: str, region_code: str = "IN") -> Optional[EmissionFactor]:
        # Fetch active factor matching key and region, latest version
        return (
            db.query(EmissionFactor)
            .filter(
                EmissionFactor.activity_key == activity_key,
                EmissionFactor.region_code == region_code,
            )
            .order_by(EmissionFactor.version.desc())
            .first()
        )

    @staticmethod
    def list_active_factors(db: Session, category: Optional[str] = None) -> List[EmissionFactor]:
        query = db.query(EmissionFactor)
        if category:
            query = query.filter(EmissionFactor.category == category)
        return query.order_by(EmissionFactor.category, EmissionFactor.activity_key).all()
