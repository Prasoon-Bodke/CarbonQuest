from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.services.rewards.service import RewardService
from app.schemas.reward import RewardSummaryResponse

router = APIRouter()

@router.get("/rewards/summary", response_model=RewardSummaryResponse, tags=["Rewards"])
def get_summary(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return RewardService.get_summary(db, user_id)

@router.get("/rewards/badges", tags=["Rewards"])
def get_badges(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    summary = RewardService.get_summary(db, user_id)
    return {"badges": summary["badges"]}

@router.get("/rewards/leaderboard", tags=["Rewards"])
def get_leaderboard(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return {
        "leaderboard": [
            {"rank": 1, "display_name": "Rohan M.", "eco_score": 88, "co2_avoided_kg": 42.5, "points": 340},
            {"rank": 2, "display_name": "Priya S.", "eco_score": 82, "co2_avoided_kg": 38.0, "points": 290},
            {"rank": 3, "display_name": "Prasoon Bodke (You)", "eco_score": 68, "co2_avoided_kg": 26.0, "points": 120},
            {"rank": 4, "display_name": "Neha K.", "eco_score": 64, "co2_avoided_kg": 21.0, "points": 95},
        ]
    }

@router.post("/rewards/redeem", tags=["Rewards"])
def redeem_points(
    item_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return {"status": "ok", "message": "Redemption processed for item " + item_id}
