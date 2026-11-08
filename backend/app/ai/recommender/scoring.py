from typing import Dict, Any, Tuple
from app.models import ActionCatalog, UserPreferenceProfile

def score_candidate(
    candidate: ActionCatalog,
    saving_kg: float,
    profile: UserPreferenceProfile,
    current_cycle: int,
    cooldown_penalty: float = 0.0,
) -> Tuple[float, Dict[str, float]]:
    """
    Deterministic explainable weighted scoring:
    w1: impact (normalized against 25 kg target)
    w2: preference (derived from Beta-Bernoulli expected acceptance alpha / (alpha + beta) & category weights)
    w3: feasibility (difficulty & cost levels)
    w4: goal_fit
    cooldown_penalty: penalty deducted if recently skipped/rejected
    """
    # 1. Normalized impact: 0 to 1.0 (capped at 25 kg/month)
    impact_score = min(1.0, max(0.1, saving_kg / 20.0))

    # 2. Preference score: Beta-Bernoulli mean E[theta] = alpha / (alpha + beta)
    action_stat = profile.action_stats.get(candidate.action_key, {"alpha": 1.0, "beta": 1.0})
    alpha = float(action_stat.get("alpha", 1.0))
    beta = float(action_stat.get("beta", 1.0))
    expected_acceptance = alpha / (alpha + beta)

    category_weight = float(profile.category_weights.get(candidate.category, 1.0))
    pref_score = min(1.0, max(0.1, expected_acceptance * (category_weight / 1.0)))

    # 3. Feasibility: Easy (diff 1-2) = 0.9-0.8, Medium (diff 3) = 0.6, Hard = 0.4
    diff_val = candidate.difficulty
    if diff_val <= 2:
        feasibility_score = 0.9 - (diff_val - 1) * 0.1
    elif diff_val == 3:
        feasibility_score = 0.7
    else:
        feasibility_score = 0.4

    # 4. Goal fit: default 0.6
    goal_fit_score = 0.6

    # Weighted calculation
    w_impact = 0.35
    w_pref = 0.30
    w_feas = 0.20
    w_goal = 0.15

    raw_score = (
        (impact_score * w_impact)
        + (pref_score * w_pref)
        + (feasibility_score * w_feas)
        + (goal_fit_score * w_goal)
        - cooldown_penalty
    )

    final_score = round(max(0.05, min(0.99, raw_score)), 2)

    breakdown = {
        "impact": round(impact_score, 2),
        "preference": round(pref_score, 2),
        "feasibility": round(feasibility_score, 2),
        "goal_fit": round(goal_fit_score, 2),
        "cooldown_penalty": round(cooldown_penalty, 2),
    }

    return final_score, breakdown
