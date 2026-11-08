import pytest
from app.models import UserPreferenceProfile
from app.ai.adaptive.update import update_preference_profile

def test_adaptive_feedback_accepted_and_completed():
    profile = UserPreferenceProfile(
        user_id="user-1",
        action_stats={},
        category_weights={"transport": 1.0},
        difficulty_tolerance=0.60,
        feedback_count=0,
    )

    # Acceptance boosts alpha, category weight, and difficulty tolerance
    p1, sum1 = update_preference_profile(
        profile=profile,
        action_key="transport.metro",
        category="transport",
        response="accepted",
        current_cycle=1,
    )

    stat = p1.action_stats["transport.metro"]
    assert stat["alpha"] == 2.0
    assert stat["beta"] == 1.0
    assert p1.category_weights["transport"] == 1.05
    assert p1.difficulty_tolerance == 0.62
    assert p1.feedback_count == 1
    assert "Reinforced preference" in sum1

def test_adaptive_feedback_modified():
    profile = UserPreferenceProfile(
        user_id="user-2",
        action_stats={},
        category_weights={"food": 1.0},
        feedback_count=0,
    )

    p2, sum2 = update_preference_profile(
        profile=profile,
        action_key="food.plant_based",
        category="food",
        response="modified",
        modified_params={"meals_per_week": 3},
        current_cycle=1,
    )

    stat = p2.action_stats["food.plant_based"]
    assert stat["alpha"] == 1.5
    assert stat["beta"] == 1.5
    assert stat["custom_params"] == {"meals_per_week": 3}
    assert "customized adoption" in sum2

def test_adaptive_feedback_not_practical():
    profile = UserPreferenceProfile(
        user_id="user-3",
        action_stats={},
        category_weights={"transport": 1.0},
        difficulty_tolerance=0.60,
        feedback_count=0,
    )

    p3, sum3 = update_preference_profile(
        profile=profile,
        action_key="transport.cycle",
        category="transport",
        response="skipped",
        reason_code="not_practical",
        current_cycle=1,
    )

    assert p3.difficulty_tolerance == 0.55
    assert p3.action_stats["transport.cycle"]["beta"] == 2.0
    assert "difficulty tolerance adjusted" in sum3

def test_adaptive_feedback_too_costly():
    profile = UserPreferenceProfile(
        user_id="user-4",
        action_stats={},
        cost_sensitivity=0.50,
        feedback_count=0,
    )

    p4, sum4 = update_preference_profile(
        profile=profile,
        action_key="electricity.solar_rooftop",
        category="electricity",
        response="rejected",
        reason_code="too_costly",
        current_cycle=1,
    )

    assert p4.cost_sensitivity == 0.55
    assert p4.action_stats["electricity.solar_rooftop"]["beta"] == 2.5 # 1.0 + 1.5 for reject
    assert "cost sensitivity filter" in sum4

def test_adaptive_feedback_not_relevant():
    profile = UserPreferenceProfile(
        user_id="user-5",
        category_weights={"shopping": 1.0},
        feedback_count=0,
    )

    p5, sum5 = update_preference_profile(
        profile=profile,
        action_key="shopping.second_hand",
        category="shopping",
        response="skipped",
        reason_code="not_relevant",
        current_cycle=1,
    )

    assert p5.category_weights["shopping"] == 0.90
    assert "Decreased category weight" in sum5

def test_adaptive_feedback_already_doing():
    profile = UserPreferenceProfile(
        user_id="user-6",
        action_stats={},
        feedback_count=0,
    )

    p6, sum6 = update_preference_profile(
        profile=profile,
        action_key="waste.reuse_bags",
        category="waste",
        response="skipped",
        reason_code="already_doing",
        current_cycle=1,
    )

    stat = p6.action_stats["waste.reuse_bags"]
    assert stat.get("already_doing") is True
    # Should not penalize beta
    assert stat["beta"] == 1.0
    assert "already practiced" in sum6
