from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import date, timedelta
from app.services.carbon.impact import project_scenario
from app.models import Simulation, EmissionRecord, Activity
from app.repositories.simulation import SimulationRepository
import uuid

class SimulatorService:
    @staticmethod
    def run_simulation(
        db: Session,
        user_id: str,
        scenarios: List[Dict[str, Any]],
        baseline_kg_month: Optional[float] = None,
    ) -> Dict[str, Any]:
        # If baseline not provided, derive from user's actual 30-day footprint
        if baseline_kg_month is None or baseline_kg_month <= 0:
            thirty_days_ago = date.today() - timedelta(days=30)
            rows = (
                db.query(EmissionRecord.kg_co2e)
                .join(Activity, EmissionRecord.activity_id == Activity.id)
                .filter(
                    EmissionRecord.user_id == user_id,
                    Activity.occurred_on >= thirty_days_ago,
                )
                .all()
            )
            if rows:
                baseline_kg_month = round(sum(r[0] for r in rows), 1)
            else:
                baseline_kg_month = 128.0

        results = []
        for s in scenarios:
            calc = project_scenario(
                baseline_kg=baseline_kg_month,
                change_type=s.get("change_type", "reduce_quantity"),
                activity_key=s.get("activity_key", ""),
                params=s.get("params", {}),
            )

            saving_kg = calc["saving_kg_month"]
            projected_kg = round(baseline_kg_month - saving_kg, 1)
            saving_pct = round((saving_kg / max(1.0, baseline_kg_month)) * 100, 1)

            results.append({
                "label": s.get("label", "Custom Scenario"),
                "projected_kg_month": projected_kg,
                "saving_kg_month": saving_kg,
                "saving_pct": saving_pct,
                "basis": "estimated",
                "confidence": calc["confidence"],
                "feasibility": {"difficulty": 2, "cost_level": 1},
                "assumptions": calc["assumptions"],
            })

        sim_id = str(uuid.uuid4())
        repo = SimulationRepository(db)
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
        repo.add(sim_record)

        return {
            "id": sim_id,
            "baseline_kg_month": baseline_kg_month,
            "results": results,
        }
