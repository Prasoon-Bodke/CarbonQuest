from sqlalchemy.orm import Session
from app.models import EmissionRecord, Activity
from typing import List, Dict, Any
from collections import defaultdict

class HotspotService:
    @staticmethod
    def calculate_hotspots(
        db: Session,
        user_id: str,
        period: str = "month",
        top_n: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Ranks top emission activities for the user.
        """
        records = (
            db.query(EmissionRecord, Activity)
            .join(Activity, EmissionRecord.activity_id == Activity.id)
            .filter(EmissionRecord.user_id == user_id)
            .all()
        )

        if not records:
            # Baseline illustrative Pune demo defaults
            return [
                {
                    "rank": 1,
                    "category": "transport",
                    "activity_key": "transport.two_wheeler_petrol_km",
                    "kg_co2e": 31.0,
                    "share_pct": 24.2,
                    "vs_previous_pct": 8.0,
                    "why": "Largest single motorized commute source this month",
                },
                {
                    "rank": 2,
                    "category": "electricity",
                    "activity_key": "electricity.ac_hours",
                    "kg_co2e": 24.6,
                    "share_pct": 19.2,
                    "vs_previous_pct": -2.0,
                    "why": "Daily cooling load during afternoon peak hours",
                },
                {
                    "rank": 3,
                    "category": "food",
                    "activity_key": "food.meal_non_veg",
                    "kg_co2e": 18.5,
                    "share_pct": 14.5,
                    "vs_previous_pct": 0.0,
                    "why": "Non-vegetarian meal footprint vs plant-based options",
                },
            ][:top_n]

        totals_by_key = defaultdict(float)
        category_by_key = {}
        total_footprint = 0.0

        for rec, act in records:
            totals_by_key[act.activity_key] += rec.kg_co2e
            category_by_key[act.activity_key] = act.category
            total_footprint += rec.kg_co2e

        sorted_items = sorted(totals_by_key.items(), key=lambda x: x[1], reverse=True)[:top_n]

        hotspots = []
        for rank, (act_key, kg) in enumerate(sorted_items, start=1):
            share = round((kg / max(1.0, total_footprint)) * 100, 1)
            hotspots.append({
                "rank": rank,
                "category": category_by_key[act_key],
                "activity_key": act_key,
                "kg_co2e": round(kg, 1),
                "share_pct": share,
                "vs_previous_pct": 0.0,
                "why": f"Top #{rank} driver representing {share}% of your logged footprint",
            })

        return hotspots
