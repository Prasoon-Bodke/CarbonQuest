from sqlalchemy.orm import Session
from app.services.carbon.impact import get_footprint_summary, get_hotspots, get_factor_sources
from typing import Dict, Any

class ChatContextBuilder:
    @staticmethod
    def build_context(db: Session, user_id: str) -> Dict[str, Any]:
        footprint = get_footprint_summary(db, user_id, period="month")
        hotspots = get_hotspots(db, user_id, period="month", top_n=3)

        keys = [h["activity_key"] for h in hotspots if "activity_key" in h]
        sources = get_factor_sources(db, keys)
        source_names = [f"{s['source_name']} ({s['source_year']})" for s in sources]
        if not source_names:
            source_names = [
                "Central Electricity Authority (CEA) Baseline Database v19 (2024)",
                "ARAI / MoEFCC GHG Third National Communication (2023)",
            ]

        context_prompt = (
            f"User Month: {footprint.get('period_start', '2026-11-01')} to {footprint.get('period_end', '2026-11-30')}\n"
            f"Total Footprint: {footprint.get('total_kg_co2e', 128.0)} kg CO2e (basis: {footprint.get('basis', 'estimated')})\n"
            f"Top Hotspots:\n"
        )
        for h in hotspots:
            context_prompt += f"- {h.get('category')}: {h.get('activity_key')} ({h.get('kg_co2e')} kg CO2e, {h.get('share_pct')}% share)\n"

        context_prompt += f"Verified Sources: {', '.join(source_names)}\n"

        return {
            "context_prompt": context_prompt,
            "period": "2026-11",
            "factor_sources": source_names,
            "total_kg": footprint.get("total_kg_co2e", 128.0),
            "top_hotspot": hotspots[0]["activity_key"] if hotspots else "transport",
        }
