from sqlalchemy.orm import Session
from app.models import Activity, EmissionRecord, EmissionFactor, Profile
from app.services.carbon.factors import FactorService
from app.services.carbon.confidence import compute_confidence
from typing import Tuple, List, Optional
import uuid

class CarbonEngine:
    @staticmethod
    def calculate_emission(
        db: Session,
        activity: Activity,
    ) -> EmissionRecord:
        """
        Deterministic calculation: kg_co2e = quantity * factor.kg_co2e_per_unit.
        Idempotent: updates existing emission record if already present for activity.
        """
        profile = db.query(Profile).filter(Profile.id == activity.user_id).first()
        user_region = profile.region_code if profile else "IN"

        factor = FactorService.get_factor(db, activity.activity_key, user_region, as_of_date=activity.occurred_on)
        if not factor:
            factor = db.query(EmissionFactor).filter(EmissionFactor.activity_key == activity.activity_key).first()

        if not factor:
            factor_val = 0.1
            factor_id = "default_factor"
            factor_region = "IN"
        else:
            factor_val = factor.kg_co2e_per_unit
            factor_id = factor.id
            factor_region = factor.region_code

        kg_co2e = round(activity.quantity * factor_val, 3)

        confidence, reasons = compute_confidence(
            source=activity.source,
            factor_region=factor_region,
            user_region=user_region,
            validation_score=activity.validation_score,
        )

        existing = (
            db.query(EmissionRecord)
            .filter(EmissionRecord.activity_id == activity.id)
            .first()
        )

        calc_inputs = {
            "quantity": activity.quantity,
            "unit": activity.unit,
            "factor_value": factor_val,
            "activity_key": activity.activity_key,
        }

        if existing:
            existing.emission_factor_id = factor_id
            existing.kg_co2e = kg_co2e
            existing.calc_inputs = calc_inputs
            existing.confidence = confidence
            existing.confidence_reasons = reasons
            db.commit()
            db.refresh(existing)
            return existing

        record = EmissionRecord(
            id=str(uuid.uuid4()),
            activity_id=activity.id,
            user_id=activity.user_id,
            emission_factor_id=factor_id,
            kg_co2e=kg_co2e,
            calc_inputs=calc_inputs,
            confidence=confidence,
            confidence_reasons=reasons,
        )

        db.add(record)
        db.commit()
        db.refresh(record)
        return record
