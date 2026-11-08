from typing import Tuple, List

def compute_confidence(
    source: str,
    factor_region: str,
    user_region: str,
    validation_score: float,
) -> Tuple[float, List[str]]:
    """
    Computes deterministic confidence score (0.0 to 1.0) and human-auditable reasons.
    """
    score = 0.5
    reasons = []

    if factor_region == user_region:
        score += 0.2
        reasons.append(f"Emission factor region ({factor_region}) exactly matches user regional profile")
    else:
        reasons.append(f"Global default proxy factor used instead of regional ({user_region})")

    if source in ("strava", "maps", "telemetry"):
        score += 0.2
        reasons.append("Empirically validated sensor/GPS telemetry")
    elif source == "csv":
        score += 0.15
        reasons.append("Structured bulk batch dataset")
    else:
        score += 0.1
        reasons.append("Self-reported manual entry")

    if validation_score >= 0.9:
        score += 0.1
        reasons.append("Passed all physical plausibility and speed bounds")
    elif validation_score < 0.7:
        score -= 0.15
        reasons.append("Flagged for moderate deviation from typical consumption baseline")

    final_score = round(max(0.1, min(1.0, score)), 2)
    return final_score, reasons

def get_confidence_label(score: float) -> str:
    # Rule from 3.8: low < 0.4, medium 0.4-0.7, high > 0.7
    if score > 0.7:
        return "high"
    elif score >= 0.4:
        return "medium"
    return "low"
