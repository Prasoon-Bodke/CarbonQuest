from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import ActionCatalog
from app.repositories.base import BaseRepository

class ActionCatalogRepository(BaseRepository[ActionCatalog]):
    def __init__(self, db: Session):
        super().__init__(ActionCatalog, db)

    def get_by_action_key(self, action_key: str) -> Optional[ActionCatalog]:
        return (
            self.db.query(ActionCatalog)
            .filter(ActionCatalog.action_key == action_key, ActionCatalog.is_active == True)
            .first()
        )

    def list_active(self, category: Optional[str] = None) -> List[ActionCatalog]:
        query = self.db.query(ActionCatalog).filter(ActionCatalog.is_active == True)
        if category:
            query = query.filter(ActionCatalog.category == category)
        return query.order_by(ActionCatalog.category, ActionCatalog.difficulty).all()
