from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.services.goals.service import GoalService
from app.models import Goal
from app.schemas.goal import GoalCreate, GoalRead

router = APIRouter()

@router.get("/goals", tags=["Goals"])
def get_user_goals(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    goals = GoalService.list_goals(db, user_id)
    return {
        "goals": [
            {
                "id": g.id,
                "goal_type": g.goal_type,
                "target_value": g.target_value,
                "category": g.category,
                "start_date": str(g.start_date),
                "end_date": str(g.end_date),
                "status": g.status,
            }
            for g in goals
        ]
    }

@router.post("/goals", response_model=GoalRead, tags=["Goals"])
def create_user_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    goal = GoalService.create_goal(db, user_id, payload.model_dump())
    return GoalRead(
        id=goal.id,
        user_id=goal.user_id,
        goal_type=goal.goal_type,
        target_value=goal.target_value,
        category=goal.category,
        start_date=goal.start_date,
        end_date=goal.end_date,
        status=goal.status,
    )

@router.delete("/goals/{goal_id}", tags=["Goals"])
def delete_user_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(g)
    db.commit()
    return {"status": "ok", "deleted_id": goal_id}
