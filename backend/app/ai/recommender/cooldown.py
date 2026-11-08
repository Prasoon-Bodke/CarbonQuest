from typing import Dict, Any
from app.ai.config import ai_config

class CooldownManager:
    @staticmethod
    def get_penalty(action_key: str, action_stats: Dict[str, Any], current_cycle: int) -> float:
        """
        Returns cooldown penalty (0.0 to 0.35) for recently skipped/rejected actions per docs/ai/SCORING.md.
        """
        stat = (action_stats or {}).get(action_key)
        if not stat:
            return 0.0

        last_resp = stat.get("last_response")
        last_cycle = stat.get("last_shown_cycle", 0)

        if last_resp in ("rejected", "skipped"):
            cycle_diff = current_cycle - last_cycle
            if cycle_diff <= 1:
                return ai_config.PENALTY_REJECTED if last_resp == "rejected" else ai_config.PENALTY_SKIPPED
            elif cycle_diff <= 2:
                return ai_config.PENALTY_RECEDED

        return 0.0
