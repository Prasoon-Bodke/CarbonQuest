from app.models import UserPreferenceProfile
from typing import Dict, Any, Tuple, Optional
from app.ai.config import ai_config

def update_preference_profile(
    profile: UserPreferenceProfile,
    action_key: str,
    category: str,
    response: str,
    reason_code: Optional[str] = None,
    current_cycle: int = 1,
    modified_params: Optional[Dict[str, Any]] = None,
) -> Tuple[UserPreferenceProfile, str]:
    """
    Explainable Beta-Bernoulli Bayesian updating:
    - On acceptance / completion: alpha += 1.0 (success), category weight +0.05, diff_tolerance +0.02
    - On modification: alpha += 0.5, beta += 0.5 (partial success)
    - On skip / rejection: beta += 1.0 (or 1.5 for reject)
    - Specific reason handling:
      * not_practical: decreases difficulty_tolerance by 0.05 (min 0.20)
      * too_costly: increases cost_sensitivity by 0.05 (max 0.95)
      * not_relevant: lowers category weight by 0.10 (min 0.40)
      * already_doing: marks action as already adopted, suppressing future proposals without negative category penalty
      * other: standard Beta update
    """
    stats = dict(profile.action_stats or {})
    cat_weights = dict(profile.category_weights or {
        "transport": 1.0,
        "electricity": 1.0,
        "food": 1.0,
        "shopping": 1.0,
        "waste": 1.0,
    })

    action_stat = dict(stats.get(
        action_key,
        {
            "alpha": ai_config.ALPHA_PRIOR,
            "beta": ai_config.BETA_PRIOR,
            "last_shown_cycle": current_cycle,
            "last_response": "none",
        }
    ))
    alpha = float(action_stat.get("alpha", ai_config.ALPHA_PRIOR))
    beta = float(action_stat.get("beta", ai_config.BETA_PRIOR))

    summary = ""

    if response in ("accepted", "completed"):
        alpha += 1.0
        cat_weights[category] = min(1.50, round(cat_weights.get(category, 1.0) + ai_config.CATEGORY_BOOST_STEP, 2))
        profile.difficulty_tolerance = min(0.90, round(profile.difficulty_tolerance + 0.02, 2))
        summary = f"Reinforced preference for {action_key}; category weight boosted to {cat_weights[category]}"

    elif response == "modified":
        alpha += 0.5
        beta += 0.5
        action_stat["custom_params"] = modified_params or {}
        summary = f"Recorded customized adoption of {action_key} with user-adjusted parameters"

    elif response in ("skipped", "rejected"):
        if reason_code == "already_doing":
            # Do not penalize preference; user is already engaged with this action
            action_stat["already_doing"] = True
            summary = f"Marked {action_key} as already practiced; suppressed from future cycles"
        else:
            beta += 1.5 if response == "rejected" else 1.0

            if reason_code == "not_practical":
                profile.difficulty_tolerance = max(0.20, round(profile.difficulty_tolerance - ai_config.DIFF_TOLERANCE_STEP, 2))
                summary = f"Lowered weight on {action_key}; difficulty tolerance adjusted to {profile.difficulty_tolerance:.2f}"
            elif reason_code == "too_costly":
                profile.cost_sensitivity = min(0.95, round(profile.cost_sensitivity + ai_config.COST_SENSITIVITY_STEP, 2))
                summary = f"Increased cost sensitivity filter to {profile.cost_sensitivity:.2f} due to {action_key}"
            elif reason_code == "not_relevant":
                cat_weights[category] = max(0.40, round(cat_weights.get(category, 1.0) - ai_config.CATEGORY_DAMPEN_STEP, 2))
                summary = f"Decreased category weight for {category} to {cat_weights[category]:.2f}"
            else:
                summary = f"Recorded {response} for {action_key}"

    action_stat["alpha"] = alpha
    action_stat["beta"] = beta
    action_stat["last_shown_cycle"] = current_cycle
    action_stat["last_response"] = response
    if reason_code:
        action_stat["last_reason_code"] = reason_code

    stats[action_key] = action_stat
    profile.action_stats = stats
    profile.category_weights = cat_weights
    profile.feedback_count = (profile.feedback_count or 0) + 1

    return profile, summary
