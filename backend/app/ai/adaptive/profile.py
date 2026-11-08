from typing import Dict, Any

def get_default_action_stat() -> Dict[str, Any]:
    # Beta(alpha=1, beta=1) represents uniform prior
    return {
        "alpha": 1.0,
        "beta": 1.0,
        "last_shown_cycle": 1,
        "last_response": "none",
    }
