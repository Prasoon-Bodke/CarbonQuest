import math
from typing import Tuple, List, Dict, Any, Optional

# Mode speed limits (km/h) [min_speed, max_speed, max_distance_km]
SPEED_LIMITS = {
    "walk": (2.0, 10.0, 30.0),
    "bicycle": (5.0, 35.0, 100.0),
    "two_wheeler": (10.0, 110.0, 500.0),
    "car": (10.0, 140.0, 1500.0),
    "bus": (8.0, 90.0, 800.0),
    "metro": (15.0, 100.0, 200.0),
    "auto": (8.0, 70.0, 150.0),
}

MAX_DAILY_ACTIVITY = {
    "electricity.grid_kwh": 300.0,
    "electricity.ac_hours": 24.0,
    "food.meal_veg": 10.0,
    "food.meal_non_veg": 10.0,
    "waste.landfill_kg": 50.0,
    "transport.car_petrol_km": 1500.0,
    "transport.car_diesel_km": 1500.0,
    "transport.two_wheeler_petrol_km": 500.0,
    "transport.bus_km": 800.0,
}

def check_z_score(
    quantity: float,
    history: List[float],
    min_history: int = 5,
    threshold: float = 3.0,
) -> Tuple[Optional[float], Optional[str]]:
    """
    Computes statistical Z-score against user's historical values:
    Z = |x - mean| / std_dev
    Only runs once at least `min_history` (5) prior entries exist.
    """
    if len(history) < min_history:
        return None, None
    mean = sum(history) / len(history)
    variance = sum((x - mean) ** 2 for x in history) / len(history)
    std_dev = math.sqrt(variance)
    if std_dev < 1e-4:
        return None, None
    z = abs(quantity - mean) / std_dev
    if z > threshold:
        return round(z, 2), f"Quantity ({quantity}) is a statistical outlier (z={z:.1f} > {threshold}) against your historical average ({mean:.1f})"
    return round(z, 2), None

def validate_activity(
    category: str,
    activity_key: str,
    quantity: float,
    metadata: Dict[str, Any],
    history: Optional[List[float]] = None,
    daily_existing_total: float = 0.0,
) -> Tuple[str, float, List[str]]:
    """
    Intelligent rule-based plausibility validation.
    Returns: (status: 'accepted'|'flagged'|'rejected', score: float, reasons: List[str])
    """
    reasons = []

    if quantity <= 0:
        return "rejected", 0.0, ["Quantity must be greater than 0"]

    # 1. Single entry cap limits
    max_cap = MAX_DAILY_ACTIVITY.get(activity_key)
    if max_cap and quantity > max_cap:
        return "rejected", 0.0, [f"Quantity {quantity} exceeds physical plausible single-entry threshold ({max_cap})"]

    # 2. Cumulative daily cap limits
    if max_cap and (daily_existing_total + quantity) > max_cap:
        return "rejected", 0.0, [
            f"Combined daily quantity ({daily_existing_total + quantity:.1f}) exceeds daily cap ({max_cap}) for {activity_key}"
        ]

    score = 1.0

    # 3. Transport speed and distance checks
    if category == "transport":
        distance = metadata.get("distance_km") or quantity
        duration_min = metadata.get("duration_min")
        mode = metadata.get("mode")

        if distance and distance > 2000.0 and "flight" not in activity_key:
            return "rejected", 0.0, ["Single non-flight transit distance exceeds plausible threshold (>2000 km)"]

        if duration_min and duration_min > 0 and distance and mode:
            speed = distance / (duration_min / 60.0)
            limits = SPEED_LIMITS.get(mode)
            if limits:
                min_spd, max_spd, max_dist = limits
                if speed > max_spd * 1.5:
                    return "rejected", 0.0, [
                        f"Physically impossible speed ({speed:.1f} km/h) for {mode}. Maximum possible is {max_spd} km/h."
                    ]
                if speed > max_spd:
                    score -= 0.35
                    reasons.append(f"Recorded speed ({speed:.1f} km/h) is higher than typical urban speed for {mode}.")
                if distance > max_dist:
                    score -= 0.2
                    reasons.append(f"Trip distance ({distance} km) exceeds typical daily trip bound for {mode}.")

    # 4. Statistical Z-score check against user's own history
    if history and len(history) >= 5:
        z, z_reason = check_z_score(quantity, history, min_history=5, threshold=3.0)
        if z_reason:
            score -= 0.35
            reasons.append(z_reason)

    status = "accepted" if score >= 0.7 else "flagged"
    return status, round(max(0.1, score), 2), reasons
