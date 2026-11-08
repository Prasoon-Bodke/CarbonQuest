from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models import Profile, Activity, EmissionRecord, Recommendation, ActionLog, Simulation
from datetime import datetime, timezone

router = APIRouter()

@router.get("/me/export", tags=["Privacy"])
def export_my_data(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    activities = db.query(Activity).filter(Activity.user_id == user_id).all()
    recommendations = db.query(Recommendation).filter(Recommendation.user_id == user_id).all()
    action_logs = db.query(ActionLog).filter(ActionLog.user_id == user_id).all()
    simulations = db.query(Simulation).filter(Simulation.user_id == user_id).all()

    return {
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "profile": {
            "display_name": profile.display_name if profile else None,
            "region_code": profile.region_code if profile else "IN",
            "household_size": profile.household_size if profile else 2,
            "monthly_target_kg": profile.monthly_target_kg if profile else 100.0,
            "preferences": profile.preferences if profile else {},
        },
        "activities_count": len(activities),
        "activities": [
            {
                "id": a.id,
                "category": a.category,
                "activity_key": a.activity_key,
                "quantity": a.quantity,
                "unit": a.unit,
                "occurred_on": str(a.occurred_on),
                "source": a.source,
            }
            for a in activities
        ],
        "recommendations_count": len(recommendations),
        "action_logs_count": len(action_logs),
        "simulations_count": len(simulations),
    }

@router.delete("/me", tags=["Privacy"])
def delete_my_data(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if profile:
        # Cascade delete deletes activities, emission records, recommendations, preference profile, etc.
        db.delete(profile)
        db.commit()

    return {"status": "ok", "message": "All user data, records, and preferences permanently erased"}
