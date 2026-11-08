import pytest
from app.services.validation.rules import validate_activity
from app.services.carbon.impact import project_scenario

def test_validation_plausibility_rules():
    # Valid bus trip
    status, score, reasons = validate_activity("transport", "transport.bus_km", 12.5, {"mode": "bus", "duration_min": 30})
    assert status == "accepted"
    assert score >= 0.7
    assert len(reasons) == 0

    # Negative quantity rejected
    status, score, reasons = validate_activity("transport", "transport.bus_km", -5.0, {})
    assert status == "rejected"

    # Impossible cycling speed (e.g. 50 km in 20 min = 150 km/h)
    status, score, reasons = validate_activity("transport", "transport.two_wheeler_petrol_km", 50.0, {"mode": "bicycle", "duration_min": 20})
    assert status == "rejected"

def test_project_scenario_shared_logic():
    baseline = 128.0
    calc = project_scenario(
        baseline_kg=baseline,
        change_type="reduce_quantity",
        activity_key="electricity.ac_hours",
        params={"delta_per_day": -1.0, "ac_power_kw": 1.5},
    )
    # 1 hr AC / day = 1.5 kW * 30 days * 0.82 kg/kWh / 2 = 18.45 kg saving
    assert calc["saving_kg_month"] > 0
    assert calc["projected_kg_month"] == round(baseline - calc["saving_kg_month"], 1)
    assert calc["confidence"] > 0.7
