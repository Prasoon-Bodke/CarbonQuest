from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.simulator.service import SimulatorService
from app.models import Simulation

router = APIRouter()

@router.post("/simulations", response_model=SimulationResponse, tags=["What-If Simulator"])
def run_simulation(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    scenarios = [s.model_dump() for s in payload.scenarios]
    result = SimulatorService.run_simulation(
        db=db,
        user_id=user_id,
        scenarios=scenarios,
        baseline_kg_month=128.0,
    )
    return SimulationResponse(**result)

@router.get("/simulations", tags=["What-If Simulator"])
def list_simulation_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    history = db.query(Simulation).filter(Simulation.user_id == user_id).order_by(Simulation.created_at.desc()).all()
    return {
        "items": [
            {
                "id": s.id,
                "scenarios": s.scenario,
                "baseline_kg_month": s.baseline_kg_month,
                "projected_kg_month": s.projected_kg_month,
                "saving_kg_month": s.saving_kg_month,
                "basis": s.basis,
                "created_at": s.created_at.isoformat(),
            }
            for s in history
        ]
    }
