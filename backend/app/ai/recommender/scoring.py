from typing import Dict, Any, Tuple, List, Optional
from app.models import ActionCatalog, UserPreferenceProfile
from app.ai.config import ai_config

def score_candidate(
    candidate: ActionCatalog,
    saving_kg: float,
    profile: UserPreferenceProfile,
    current_cycle: int,
    cooldown_penalty: float = 0.0,
    hotspot_categories: Optional[List[str]] = None,
) -> Tuple[float, Dict[str, float]]:
    """
    Deterministic explainable weighted scoring per docs/ai/SCORING.md:
    w1: impact (normalized against 25 kg/month benchmark)
    w2: preference (derived from Beta-Bernoulli expected acceptance alpha / (alpha + beta) & category weights)
    w3: feasibility (difficulty level modulated by user difficulty_tolerance)
    w4: goal_fit (alignment with user's top emission hotspots)
    cooldown_penalty: deducted if recently skipped or rejected
    """
    # 1. Normalized impact: 0.10 to 1.0 (capped at 25 kg/month)
    impact_score = min(1.0, max(0.10, saving_kg / 25.0))

    # 2. Preference score: Beta-Bernoulli mean E[theta] = alpha / (alpha + beta)
    action_stat = (profile.action_stats or {}).get(
        candidate.action_key,
        {"alpha": ai_config.ALPHA_PRIOR, "beta": ai_config.BETA_PRIOR}
    )
    alpha = float(action_stat.get("alpha", ai_config.ALPHA_PRIOR))
    beta = float(action_stat.get("beta", ai_config.BETA_PRIOR))
    expected_acceptance = alpha / (alpha + beta) if (alpha + beta) > 0 else 0.50

    category_weight = float((profile.category_weights or {}).get(candidate.category, 1.0))
    pref_score = min(1.0, max(0.10, expected_acceptance * (category_weight / 1.0)))

    # 3. Feasibility: Easy (diff 1-2) = 0.9-0.8, Medium (diff 3) = 0.7, Hard = 0.5-0.4
    diff_val = candidate.difficulty
    if diff_val <= 1:
        feasibility_score = 0.90
    elif diff_val == 2:
        feasibility_score = 0.80
    elif diff_val == 3:
        feasibility_score = 0.70
    elif diff_val == 4:
        feasibility_score = 0.50
    else:
        feasibility_score = 0.40

    # Dampen feasibility if difficulty exceeds user's tolerance
    diff_tolerance = profile.difficulty_tolerance if profile.difficulty_tolerance is not None else 0.60
    if diff_val > 2 and diff_tolerance < 0.55:
        feasibility_score = max(0.20, feasibility_score - (0.55 - diff_tolerance))

    # 4. Goal / Hotspot fit
    hotspot_categories = hotspot_categories or []
    if hotspot_categories and candidate.category in hotspot_categories:
        rank_idx = hotspot_categories.index(candidate.category)
        if rank_idx == 0:
            goal_fit_score = 1.00
        elif rank_idx == 1:
            goal_fit_score = 0.85
        else:
            goal_fit_score = 0.70
    else:
        goal_fit_score = 0.50

    # Weighted calculation
    w_impact = ai_config.WEIGHT_IMPACT
    w_pref = ai_config.WEIGHT_PREFERENCE
    w_feas = ai_config.WEIGHT_FEASIBILITY
    w_goal = ai_config.WEIGHT_GOAL

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
