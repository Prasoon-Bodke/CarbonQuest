from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.deps import get_db, get_current_user
from app.repositories.catalog import ActionCatalogRepository
from app.schemas.catalog import ActionCatalogResponse, ActionDef

router = APIRouter()

@router.get("/actions/catalog", response_model=ActionCatalogResponse, tags=["Actions Catalog"])
def get_catalog(
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    repo = ActionCatalogRepository(db)
    actions = repo.list_active(category=category)
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
