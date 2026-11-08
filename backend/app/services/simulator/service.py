from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.services.carbon.impact import project_scenario
from app.models import Simulation
import uuid

class SimulatorService:
    @staticmethod
    def run_simulation(
        db: Session,
        user_id: str,
        scenarios: List[Dict[str, Any]],
        baseline_kg_month: float = 128.0,
    ) -> Dict[str, Any]:
        results = []
        for s in scenarios:
            calc = project_scenario(
                baseline_kg=baseline_kg_month,
                change_type=s.get("change_type", "reduce_quantity"),
                activity_key=s.get("activity_key", ""),
                params=s.get("params", {}),
            )

            saving_pct = round((calc["saving_kg_month"] / max(1.0, baseline_kg_month)) * 100, 1)

            results.append({
                "label": s.get("label", "Custom Scenario"),
                "projected_kg_month": calc["projected_kg_month"],
                "saving_kg_month": calc["saving_kg_month"],
                "saving_pct": saving_pct,
                "basis": "estimated",
                "confidence": calc["confidence"],
                "feasibility": {"difficulty": 2, "cost_level": 1},
                "assumptions": calc["assumptions"],
            })

        sim_id = str(uuid.uuid4())
        # Store simulation history
        sim_record = Simulation(
            id=sim_id,
            user_id=user_id,
            scenario=scenarios,
            baseline_kg_month=baseline_kg_month,
            projected_kg_month=results[0]["projected_kg_month"] if results else baseline_kg_month,
            saving_kg_month=results[0]["saving_kg_month"] if results else 0.0,
            basis="estimated",
            confidence=results[0]["confidence"] if results else 0.8,
            assumptions=results[0]["assumptions"] if results else [],
        )
        db.add(sim_record)
        db.commit()

        return {
            "id": sim_id,
            "baseline_kg_month": baseline_kg_month,
            "results": results,
        }
