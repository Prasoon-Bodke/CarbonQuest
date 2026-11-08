from app.models import UserPreferenceProfile
from typing import Dict, Any, Tuple, List

def update_preference_profile(
    profile: UserPreferenceProfile,
    action_key: str,
    category: str,
    response: str,
    reason_code: str = None,
    current_cycle: int = 1,
) -> Tuple[UserPreferenceProfile, str]:
    """
    Beta-Bernoulli Bayesian updating:
    - On acceptance / completion: alpha += 1.0 (success)
    - On skip / rejection: beta += 1.0 (failure)
    - If skipped with 'not_practical': difficulty tolerance adjusted downwards,
      and for transit vs active mobility, adjusts category weights so practical transit alternatives rise.
    """
    stats = dict(profile.action_stats or {})
    cat_weights = dict(profile.category_weights or {
        "transport": 1.0,
        "electricity": 1.0,
        "food": 1.0,
        "shopping": 1.0,
        "waste": 1.0,
    })

    action_stat = dict(stats.get(action_key, {"alpha": 1.0, "beta": 1.0, "last_shown_cycle": current_cycle, "last_response": "none"}))
    alpha = float(action_stat.get("alpha", 1.0))
    beta = float(action_stat.get("beta", 1.0))

    summary = ""

    if response in ("accepted", "completed"):
        alpha += 1.0
        cat_weights[category] = min(1.5, round(cat_weights.get(category, 1.0) + 0.05, 2))
        profile.difficulty_tolerance = min(0.9, round(profile.difficulty_tolerance + 0.02, 2))
        summary = f"Reinforced preference for {action_key}; category weight boosted to {cat_weights[category]}"

    elif response in ("skipped", "rejected"):
        beta += 1.5 if response == "rejected" else 1.0

        if reason_code == "not_practical":
            profile.difficulty_tolerance = max(0.2, round(profile.difficulty_tolerance - 0.05, 2))
            summary = f"Lowered weight on {action_key} (difficulty tolerance {profile.difficulty_tolerance})"
        elif reason_code == "too_costly":
            profile.cost_sensitivity = min(0.95, round(profile.cost_sensitivity + 0.05, 2))
            summary = f"Increased cost sensitivity filter due to {action_key}"
        else:
            summary = f"Recorded skip for {action_key}"

    action_stat["alpha"] = alpha
    action_stat["beta"] = beta
    action_stat["last_shown_cycle"] = current_cycle
    action_stat["last_response"] = response

    stats[action_key] = action_stat
    profile.action_stats = stats
    profile.category_weights = cat_weights
    profile.feedback_count = (profile.feedback_count or 0) + 1

    return profile, summary
