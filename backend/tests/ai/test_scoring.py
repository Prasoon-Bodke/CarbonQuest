import pytest
from app.models import ActionCatalog, UserPreferenceProfile
from app.ai.recommender.scoring import score_candidate
from app.ai.config import ai_config

def test_deterministic_scoring_formula():
    profile = UserPreferenceProfile(
        user_id="test-user",
        action_stats={"transport.bus": {"alpha": 3.0, "beta": 1.0}},
        category_weights={"transport": 1.1},
        difficulty_tolerance=0.7,
        cost_sensitivity=0.4,
    )

    candidate = ActionCatalog(
        id="act-1",
        action_key="transport.bus",
        title="Ride the bus",
        description="",
        category="transport",
        activity_key="transport.bus_km",
        change_type="shift",
        difficulty=2,
        cost_level=1,
    )

    saving_kg = 15.0 # 15 / 25 = 0.60 impact

    score, breakdown = score_candidate(
        candidate=candidate,
        saving_kg=saving_kg,
        profile=profile,
        current_cycle=1,
        cooldown_penalty=0.0,
        hotspot_categories=["transport", "electricity"],
    )

    assert 0.05 <= score <= 0.99
    assert breakdown["impact"] == 0.60
    assert breakdown["preference"] > 0.50
    assert breakdown["feasibility"] == 0.80
    assert breakdown["goal_fit"] == 1.00 # Top 1 hotspot
    assert breakdown["cooldown_penalty"] == 0.0

def test_scoring_cooldown_penalty_deduction():
    profile = UserPreferenceProfile(
        user_id="test-user",
        action_stats={},
        category_weights={"transport": 1.0},
        difficulty_tolerance=0.6,
    )
    candidate = ActionCatalog(
        id="act-1",
        action_key="transport.test",
        title="Test Action",
        description="",
        category="transport",
        activity_key="transport.km",
        change_type="reduce",
        difficulty=2,
        cost_level=1,
    )

    score_normal, b_normal = score_candidate(
        candidate=candidate,
        saving_kg=10.0,
        profile=profile,
        current_cycle=1,
        cooldown_penalty=0.0,
    )

    score_penalized, b_penalized = score_candidate(
        candidate=candidate,
        saving_kg=10.0,
        profile=profile,
        current_cycle=1,
        cooldown_penalty=0.20,
    )

    assert b_penalized["cooldown_penalty"] == 0.20
    assert score_penalized < score_normal
    assert round(score_normal - score_penalized, 2) == 0.20

def test_deterministic_tie_breaking():
    cand_a = ActionCatalog(
        id="act-a",
        action_key="a_action",
        title="A",
        description="",
        category="food",
        activity_key="food.meal",
        change_type="shift",
        difficulty=2,
        cost_level=1,
    )
    cand_b = ActionCatalog(
        id="act-b",
        action_key="b_action",
        title="B",
        description="",
        category="food",
        activity_key="food.meal",
        change_type="shift",
        difficulty=2,
        cost_level=1,
    )

    profile = UserPreferenceProfile(
        user_id="u-1",
        action_stats={},
        category_weights={"food": 1.0},
    )

    score_a, _ = score_candidate(cand_a, saving_kg=10.0, profile=profile, current_cycle=1)
    score_b, _ = score_candidate(cand_b, saving_kg=10.0, profile=profile, current_cycle=1)

    assert score_a == score_b

    # Sort tuple (-score, action_key) ensures cand_a ranks before cand_b
    items = [(score_b, cand_b), (score_a, cand_a)]
    sorted_items = sorted(items, key=lambda x: (-x[0], x[1].action_key))
    assert sorted_items[0][1].action_key == "a_action"
    assert sorted_items[1][1].action_key == "b_action"
