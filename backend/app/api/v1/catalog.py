from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.services.carbon.impact import get_action_catalog
from app.schemas.catalog import ActionCatalogResponse, ActionDef

router = APIRouter()

@router.get("/actions/catalog", response_model=ActionCatalogResponse, tags=["Actions Catalog"])
def get_catalog(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    actions = get_action_catalog(db)
    return ActionCatalogResponse(
        actions=[
            ActionDef(
                id=a.id,
                action_key=a.action_key,
                title=a.title,
                description=a.description,
                category=a.category,
                activity_key=a.activity_key,
                change_type=a.change_type,
                default_params=a.default_params,
                difficulty=a.difficulty,
                cost_level=a.cost_level,
                tags=a.tags,
            )
            for a in actions
        ]
    )
