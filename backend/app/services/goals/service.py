from sqlalchemy.orm import Session
from app.models import Goal
from typing import List, Dict, Any, Optional
import uuid

class GoalService:
    @staticmethod
    def list_goals(db: Session, user_id: str) -> List[Goal]:
        return db.query(Goal).filter(Goal.user_id == user_id).all()

    @staticmethod
    def create_goal(db: Session, user_id: str, goal_data: Dict[str, Any]) -> Goal:
        goal = Goal(
            id=str(uuid.uuid4()),
            user_id=user_id,
            goal_type=goal_data["goal_type"],
            target_value=goal_data["target_value"],
            category=goal_data.get("category"),
            start_date=goal_data["start_date"],
            end_date=goal_data["end_date"],
            status="active",
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal
