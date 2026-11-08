from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.deps import get_db, get_current_user
from app.repositories.profile import ProfileRepository

router = APIRouter()

@router.get("/me/export", tags=["Privacy"])
def export_my_data(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    repo = ProfileRepository(db)
    data = repo.export_data(user_id)
    profile = data["profile"]
    activities = data["activities"]
    recommendations = data["recommendations"]
    action_logs = data["action_logs"]
    simulations = data["simulations"]

    return {
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "profile": {
            "display_name": profile.display_name if profile else None,
            "region_code": profile.region_code if profile else "IN",
            "household_size": profile.household_size if profile else 2,
            "monthly_target_kg": profile.monthly_target_kg if profile else 100.0,
            "preferences": profile.preferences if profile else {},
            "consent_tracking": profile.consent_tracking if profile else False,
            "consent_leaderboard": profile.consent_leaderboard if profile else False,
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
                "validation_status": a.validation_status,
                "validation_score": a.validation_score,
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
    repo = ProfileRepository(db)
    repo.delete_all(user_id)
    return {"status": "ok", "message": "All personal records, telemetry, and preferences permanently erased"}
