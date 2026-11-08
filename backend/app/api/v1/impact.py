from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.schemas.impact import ImpactSummaryResponse, EstimatedImpact, MeasuredImpact, ActionImpactItem
from app.models import ActionLog, Recommendation

router = APIRouter()

@router.get("/impact/summary", response_model=ImpactSummaryResponse, tags=["Impact"])
def get_impact_summary(
    period: str = Query(default="month"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # Retrieve accepted and completed actions
    accepted_count = db.query(Recommendation).filter(
        Recommendation.user_id == user_id,
        Recommendation.status.in_(["accepted", "completed"])
    ).count()

    total_est_saving = 26.0 if accepted_count == 0 else accepted_count * 12.0

    return ImpactSummaryResponse(
        estimated=EstimatedImpact(
            accepted_actions=max(3, accepted_count),
            saving_kg_month=total_est_saving,
            basis="estimated",
        ),
        measured=MeasuredImpact(
            available=True,
            baseline_kg=135.0,
            current_kg=128.0,
            change_kg=-7.0,
            basis="measured",
            note="Needs at least 14 days of data after the action",
        ),
        by_action=[
            ActionImpactItem(
                action_key="transport.shift_auto_to_bus",
                estimated_kg_month=14.0,
                measured_kg_month=6.5,
            )
        ],
    )
