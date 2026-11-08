import pytest
from app.services.validation.rules import validate_activity
from app.services.carbon.impact import project_scenario

def test_hand_computed_factor_math():
    # Sourced values from emission_factors_seed.csv / SOURCES.md
    factors = {
        "transport.car_petrol_km": 0.174,
        "electricity.grid_kwh": 0.820,
        "food.meal_non_veg": 2.150,
        "shopping.clothing_item": 8.500,
        "waste.landfill_kg": 0.950,
    }

    # 1. Transport: 100 km petrol car
    assert round(100.0 * factors["transport.car_petrol_km"], 3) == 17.4

    # 2. Electricity: 50 kWh grid
    assert round(50.0 * factors["electricity.grid_kwh"], 3) == 41.0

    # 3. Food: 10 non-veg meals
    assert round(10.0 * factors["food.meal_non_veg"], 3) == 21.5

    # 4. Shopping: 2 clothing items
    assert round(2.0 * factors["shopping.clothing_item"], 3) == 17.0

    # 5. Waste: 20 kg landfill waste
    assert round(20.0 * factors["waste.landfill_kg"], 3) == 19.0

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
