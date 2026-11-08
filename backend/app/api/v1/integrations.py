from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user

router = APIRouter()

@router.get("/integrations/strava/connect", tags=["Integrations"])
def connect_strava(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return {
        "status": "ready",
        "auth_url": "https://www.strava.com/oauth/authorize?client_id=demo&response_type=code&scope=activity:read_all",
    }

@router.post("/integrations/strava/sync", tags=["Integrations"])
def sync_strava(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return {
        "status": "synced",
        "synced_activities": 0,
        "message": "Strava sync completed (mock/stretch mode)",
    }
