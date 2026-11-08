from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import date
from app.models import EmissionFactor
from app.repositories.base import BaseRepository

class EmissionFactorRepository(BaseRepository[EmissionFactor]):
    def __init__(self, db: Session):
        super().__init__(EmissionFactor, db)

    def get_active_factor(
        self,
        activity_key: str,
        region_code: str = "IN",
        as_of_date: Optional[date] = None,
    ) -> Optional[EmissionFactor]:
        target_date = as_of_date or date.today()
        return (
            self.db.query(EmissionFactor)
            .filter(
                EmissionFactor.activity_key == activity_key,
                EmissionFactor.region_code == region_code,
                or_(EmissionFactor.valid_from == None, EmissionFactor.valid_from <= target_date),
                or_(EmissionFactor.valid_to == None, EmissionFactor.valid_to >= target_date),
            )
            .order_by(EmissionFactor.version.desc())
            .first()
        )

    def list_active(
        self,
        category: Optional[str] = None,
        as_of_date: Optional[date] = None,
    ) -> List[EmissionFactor]:
        target_date = as_of_date or date.today()
        query = self.db.query(EmissionFactor).filter(
            or_(EmissionFactor.valid_from == None, EmissionFactor.valid_from <= target_date),
            or_(EmissionFactor.valid_to == None, EmissionFactor.valid_to >= target_date),
        )
        if category:
            query = query.filter(EmissionFactor.category == category)
        return query.order_by(EmissionFactor.category, EmissionFactor.activity_key).all()
