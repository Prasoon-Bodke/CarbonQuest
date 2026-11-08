from typing import List
from sqlalchemy.orm import Session
from app.models import Simulation
from app.repositories.base import BaseRepository

class SimulationRepository(BaseRepository[Simulation]):
    def __init__(self, db: Session):
        super().__init__(Simulation, db)

    def list_by_user(self, user_id: str, limit: int = 50) -> List[Simulation]:
        return (
            self.db.query(Simulation)
            .filter(Simulation.user_id == user_id)
            .order_by(Simulation.created_at.desc())
            .limit(limit)
            .all()
        )
