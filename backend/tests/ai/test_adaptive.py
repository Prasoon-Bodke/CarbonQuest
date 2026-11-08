import pytest
from app.models import UserPreferenceProfile
from app.ai.adaptive.update import update_preference_profile
from app.ai.recommender.cooldown import CooldownManager

def test_adaptive_beta_bernoulli_skip_update():
    profile = UserPreferenceProfile(
        user_id="test-user",
        action_stats={},
        category_weights={"transport": 1.0, "electricity": 1.0},
        difficulty_tolerance=0.6,
        cost_sensitivity=0.5,
        feedback_count=0,
    )

    action_key = "transport.cycle_short_commute"

    # User skips action because it is not practical
    updated_profile, summary = update_preference_profile(
        profile=profile,
        action_key=action_key,
        category="transport",
        response="skipped",
        reason_code="not_practical",
        current_cycle=1,
    )

    stat = updated_profile.action_stats[action_key]
    assert stat["beta"] > stat["alpha"]
    assert stat["last_response"] == "skipped"
    assert updated_profile.difficulty_tolerance < 0.6
    assert "Lowered weight" in summary

    # Verify cooldown manager penalizes this skipped action
    penalty = CooldownManager.get_penalty(action_key, updated_profile.action_stats, current_cycle=1)
    assert penalty > 0.0

def test_adaptive_accept_update():
    profile = UserPreferenceProfile(
        user_id="test-user-2",
        action_stats={},
        category_weights={"transport": 1.0, "electricity": 1.0},
        difficulty_tolerance=0.6,
        cost_sensitivity=0.5,
        feedback_count=0,
    )

    action_key = "transport.shift_auto_to_bus"

    # User accepts action
    updated_profile, summary = update_preference_profile(
        profile=profile,
        action_key=action_key,
        category="transport",
        response="accepted",
        current_cycle=1,
    )

    stat = updated_profile.action_stats[action_key]
    assert stat["alpha"] > stat["beta"]
    assert stat["last_response"] == "accepted"
    assert updated_profile.category_weights["transport"] > 1.0
