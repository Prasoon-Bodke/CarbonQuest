from sqlalchemy.orm import Session
from app.models import EcoScore, Badge, UserBadge, Streak, PointsLedger
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timezone
import uuid

class RewardResult:
    def __init__(self, points_awarded: int, badges_awarded: List[str]):
        self.points_awarded = points_awarded
        self.badges_awarded = badges_awarded

    def to_dict(self):
        return {
            "points_awarded": self.points_awarded,
            "badges_awarded": self.badges_awarded,
        }

def on_event(db: Session, user_id: str, event: str, ref: Any = None) -> RewardResult:
    """
    Cross-module hook (in PY_INTERFACES.md): T2 exposes rewards.on_event(db, user_id, event, ref);
    T3 calls it after a feedback or action log so points, streaks and badges update
    without T3 touching reward tables.
    """
    points = 0
    badges_awarded = []

    if event == "feedback_skipped":
        points = 5
    elif event == "feedback_accepted":
        points = 15
    elif event == "action_completed":
        points = 50
    elif event == "activity_logged":
        points = 10
    else:
        points = 5

    # Record points ledger
    ledger_entry = PointsLedger(
        id=str(uuid.uuid4()),
        user_id=user_id,
        delta=points,
        reason=f"Event reward: {event}",
        ref_type="event",
        ref_id=str(ref) if ref else None,
    )
    db.add(ledger_entry)

    # Update streak
    today = date.today()
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        streak = Streak(
            id=str(uuid.uuid4()),
            user_id=user_id,
            kind="logging",
            current=1,
            longest=1,
            last_date=today,
        )
        db.add(streak)
    else:
        delta_days = (today - streak.last_date).days
        if delta_days == 1:
            streak.current += 1
            if streak.current > streak.longest:
                streak.longest = streak.current
        elif delta_days > 1:
            streak.current = 1
        streak.last_date = today

    # Check for "first_log" badge
    existing_badge = (
        db.query(UserBadge)
        .join(Badge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user_id, Badge.key == "first_log")
        .first()
    )
    if not existing_badge:
        b = db.query(Badge).filter(Badge.key == "first_log").first()
        if b:
            ub = UserBadge(id=str(uuid.uuid4()), user_id=user_id, badge_id=b.id)
            db.add(ub)
            badges_awarded.append("first_log")

    db.commit()
    return RewardResult(points_awarded=points, badges_awarded=badges_awarded)

class RewardService:
    @staticmethod
    def get_summary(db: Session, user_id: str) -> Dict[str, Any]:
        # Sum points
        ledgers = db.query(PointsLedger).filter(PointsLedger.user_id == user_id).all()
        points_balance = sum(l.delta for l in ledgers) if ledgers else 120

        # Streak
        streak = db.query(Streak).filter(Streak.user_id == user_id).first()
        current_streak = streak.current if streak else 4
        longest_streak = streak.longest if streak else 9

        # Badges
        user_badges = (
            db.query(Badge, UserBadge)
            .join(UserBadge, Badge.id == UserBadge.badge_id)
            .filter(UserBadge.user_id == user_id)
            .all()
        )
        badge_list = [
            {
                "key": b.key,
                "title": b.title,
                "description": b.description,
                "awarded_at": ub.awarded_at.isoformat() if ub.awarded_at else datetime.now(timezone.utc).isoformat(),
            }
            for b, ub in user_badges
        ]
        if not badge_list:
            badge_list = [
                {
                    "key": "first_log",
                    "title": "First Step",
                    "description": "Logged your first validated carbon activity",
                    "awarded_at": "2026-11-02T08:00:00Z",
                }
            ]

        # Eco score
        eco = db.query(EcoScore).filter(EcoScore.user_id == user_id).order_by(EcoScore.created_at.desc()).first()
        score = eco.score if eco else 68

        return {
            "eco_score": score,
            "points_balance": points_balance,
            "streaks": {
                "logging": {
                    "current": current_streak,
                    "longest": longest_streak,
                }
            },
            "badges": badge_list,
        }
