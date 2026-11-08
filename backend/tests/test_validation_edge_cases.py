import pytest
from app.services.validation.rules import validate_activity, check_z_score

def test_validation_positive_quantity():
    # Negative quantity rejected
    status, score, reasons = validate_activity("transport", "transport.bus_km", -2.0, {})
    assert status == "rejected"
    assert "greater than 0" in reasons[0]

    # Zero quantity rejected
    status, score, reasons = validate_activity("electricity", "electricity.grid_kwh", 0.0, {})
    assert status == "rejected"

def test_validation_speed_limits():
    # Physically impossible cycling speed (e.g. 60 km in 30 min = 120 km/h)
    status, score, reasons = validate_activity(
        "transport",
        "transport.two_wheeler_petrol_km",
        60.0,
        {"mode": "bicycle", "duration_min": 30},
    )
    assert status == "rejected"
    assert "impossible speed" in reasons[0].lower()

    # Moderate urban speed flagged rather than rejected
    status, score, reasons = validate_activity(
        "transport",
        "transport.two_wheeler_petrol_km",
        15.0,
        {"mode": "bicycle", "duration_min": 24}, # 37.5 km/h > 35 max typical
    )
    assert status == "flagged"
    assert score < 1.0

def test_validation_distance_caps():
    # Impossible single non-flight trip (>2000 km)
    status, score, reasons = validate_activity(
        "transport",
        "transport.car_petrol_km",
        2500.0,
        {"mode": "car"},
    )
    assert status == "rejected"
    assert "exceeds" in reasons[0].lower() and "plausible" in reasons[0].lower()

def test_validation_daily_caps():
    # Plausible AC hours (3 hours)
    status, score, reasons = validate_activity(
        "electricity",
        "electricity.ac_hours",
        3.0,
        {},
        daily_existing_total=5.0,
    )
    assert status == "accepted"

    # Cumulative AC hours exceeding 24 hours in a single day
    status, score, reasons = validate_activity(
        "electricity",
        "electricity.ac_hours",
        6.0,
        {},
        daily_existing_total=20.0, # 20 + 6 = 26 > 24 cap
    )
    assert status == "rejected"
    assert "exceeds daily cap" in reasons[0]

def test_validation_z_score_detection():
    # Normal history: mean = 15 km, std = 2 km
    history = [14.0, 15.0, 16.0, 15.5, 14.5, 15.0]
    
    # Normal entry: 16 km -> no outlier
    z, reason = check_z_score(16.0, history, min_history=5, threshold=3.0)
    assert reason is None

    # Outlier entry: 65 km (> 20 standard deviations away)
    z, reason = check_z_score(65.0, history, min_history=5, threshold=3.0)
    assert z > 3.0
    assert "statistical outlier" in reason

    status, score, reasons = validate_activity(
        "transport",
        "transport.two_wheeler_petrol_km",
        65.0,
        {},
        history=history,
    )
    assert status == "flagged"
    assert any("outlier" in r for r in reasons)
