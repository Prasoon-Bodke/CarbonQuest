from sqlalchemy.orm import Session
from app.models import EmissionFactor
from app.repositories.factor import EmissionFactorRepository
from typing import Optional, List
from datetime import date

class FactorService:
    @staticmethod
    def get_factor(
        db: Session,
        activity_key: str,
        region_code: str = "IN",
        as_of_date: Optional[date] = None,
    ) -> Optional[EmissionFactor]:
        repo = EmissionFactorRepository(db)
        factor = repo.get_active_factor(activity_key, region_code, as_of_date)
        if not factor and region_code != "IN":
            # Fallback to IN baseline if regional factor is absent
            factor = repo.get_active_factor(activity_key, "IN", as_of_date)
        return factor

    @staticmethod
    def list_active_factors(
        db: Session,
        category: Optional[str] = None,
        as_of_date: Optional[date] = None,
    ) -> List[EmissionFactor]:
        repo = EmissionFactorRepository(db)
        return repo.list_active(category, as_of_date)
