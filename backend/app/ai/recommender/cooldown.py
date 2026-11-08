from typing import Dict, Any

class CooldownManager:
    @staticmethod
    def get_penalty(action_key: str, action_stats: Dict[str, Any], current_cycle: int) -> float:
        """
        Returns cooldown penalty (0.0 to 0.4) for recently skipped/rejected actions.
        """
        stat = action_stats.get(action_key)
        if not stat:
            return 0.0

        last_resp = stat.get("last_response")
        last_cycle = stat.get("last_shown_cycle", 0)

        # If rejected or skipped in current or immediately preceding cycle
        if last_resp in ("rejected", "skipped"):
            cycle_diff = current_cycle - last_cycle
            if cycle_diff <= 1:
                return 0.35 if last_resp == "rejected" else 0.20
            elif cycle_diff <= 2:
                return 0.10

        return 0.0
