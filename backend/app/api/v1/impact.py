from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.schemas.impact import ImpactSummaryResponse, EstimatedImpact, MeasuredImpact, ActionImpactItem
from app.models import Recommendation, ActionCatalog

router = APIRouter()

@router.get("/impact/summary", response_model=ImpactSummaryResponse, tags=["Impact"])
def get_impact_summary(
    period: str = Query(default="month"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Task 10: Reads recommendations table read-only for accepted action count
    and summed estimated saving. Sets measured.available = false per prototype scope.
    """
    recs = (
        db.query(Recommendation, ActionCatalog)
        .join(ActionCatalog, Recommendation.action_id == ActionCatalog.id)
        .filter(
            Recommendation.user_id == user_id,
            Recommendation.status.in_(["accepted", "completed"]),
        )
        .all()
    )

    accepted_count = len(recs)
    total_est_saving = sum(r[0].estimated_saving_kg_month for r in recs)

    by_action = [
        ActionImpactItem(
            action_key=a.action_key,
            estimated_kg_month=round(r.estimated_saving_kg_month, 1),
            measured_kg_month=None,
        )
        for r, a in recs
    ]

    return ImpactSummaryResponse(
        estimated=EstimatedImpact(
            accepted_actions=accepted_count,
            saving_kg_month=round(total_est_saving, 1),
            basis="estimated",
        ),
        measured=MeasuredImpact(
            available=False,
            baseline_kg=None,
            current_kg=None,
            change_kg=None,
            basis="measured",
            note="Measured impact verification pipeline requires at least 14 days of activity telemetry following check-in (POST-PROTOTYPE)",
        ),
        by_action=by_action,
    )
