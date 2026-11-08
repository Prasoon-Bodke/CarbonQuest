"""
Unit tests for estimate_saving function (Section 3.5 frozen interface).
Tests the savings estimation against user's actual 30-day baseline footprint.
"""

import pytest
from datetime import date, timedelta
from sqlalchemy.orm import Session
from unittest.mock import Mock, MagicMock, patch

from app.services.carbon.impact import estimate_saving, SavingEstimate, project_scenario
from app.models import ActionCatalog, EmissionRecord, Activity, Profile


class TestProjectScenario:
    """Test the core project_scenario function used by estimate_saving."""

    def test_project_scenario_ac_hours_reduction(self):
        """Test AC hours reduction scenario."""
        result = project_scenario(
            baseline_kg=128.0,
            change_type="reduce_quantity",
            activity_key="electricity.ac_hours",
            params={"delta_per_day": 1.0, "ac_power_kw": 1.5},
        )

        assert "projected_kg_month" in result
        assert "saving_kg_month" in result
        assert "confidence" in result
        assert "assumptions" in result
        assert result["saving_kg_month"] > 0
        assert result["projected_kg_month"] < 128.0
        assert 0.7 <= result["confidence"] <= 0.8

    def test_project_scenario_bus_transit_shift(self):
        """Test shift from auto to bus transit."""
        result = project_scenario(
            baseline_kg=128.0,
            change_type="shift_mode",
            activity_key="transport.bus_km",
            params={"trips_per_week": 2, "trip_distance_km": 10.0},
        )

        assert result["saving_kg_month"] > 0
        assert result["projected_kg_month"] < 128.0

    def test_project_scenario_plant_based_meal_swap(self):
        """Test plant-based meal swap scenario."""
        result = project_scenario(
            baseline_kg=128.0,
            change_type="swap_item",
            activity_key="food.meal_veg",
            params={"swaps_per_week": 2},
        )

        assert result["saving_kg_month"] > 0
        assert len(result["assumptions"]) > 0
        # Check for meal delta assumption
        meal_assumption = next((a for a in result["assumptions"] if "meal" in a["key"].lower()), None)
        assert meal_assumption is not None

    def test_project_scenario_composting(self):
        """Test composting scenario."""
        result = project_scenario(
            baseline_kg=128.0,
            change_type="shift_mode",
            activity_key="waste.compost_kg",
            params={"kg_per_week": 3.0},
        )

        assert result["saving_kg_month"] > 0

    def test_project_scenario_unknown_defaults_to_10_percent(self):
        """Test unknown scenario defaults to 10% savings."""
        result = project_scenario(
            baseline_kg=100.0,
            change_type="unknown_type",
            activity_key="unknown.key",
            params={},
        )

        assert result["saving_kg_month"] == 10.0  # 10% of 100
        assert result["projected_kg_month"] == 90.0
        assert result["confidence"] == 0.70


class TestEstimateSaving:
    """Test the estimate_saving function with database integration."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    @pytest.fixture
    def mock_action_catalog(self):
        """Create a mock ActionCatalog."""
        action = Mock(spec=ActionCatalog)
        action.action_key = "electricity.ac_hours"
        action.change_type = "reduce_quantity"
        action.default_params = {"delta_per_day": 1.0, "ac_power_kw": 1.5}
        return action

    @pytest.fixture
    def mock_emission_rows(self):
        """Create mock emission records for 30-day baseline."""
        # Return 30 days of activity with ~4.2 kg/day = ~128 kg/month
        rows = []
        for i in range(30):
            rows.append((4.2, date.today() - timedelta(days=i)))
        return rows

    def test_estimate_saving_with_sufficient_history(self, mock_db, mock_action_catalog, mock_emission_rows):
        """Test estimate_saving with >= 14 days of history."""
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action_catalog

        # Mock the join query for EmissionRecord and Activity
        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_emission_rows

        # Mock Profile query
        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert isinstance(result, SavingEstimate)
        assert result.action_key == "electricity.ac_hours"
        assert result.baseline_kg_month == pytest.approx(126.0, rel=0.1)  # 30 * 4.2
        assert result.saving_kg_month > 0
        assert result.basis == "estimated"
        assert 0.5 <= result.confidence <= 0.8
        assert len(result.assumptions) > 0

    def test_estimate_saving_with_insufficient_history(self, mock_db, mock_action_catalog):
        """Test estimate_saving with < 14 days of history applies confidence penalty."""
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action_catalog

        # Only 7 days of activity
        few_rows = [(4.2, date.today() - timedelta(days=i)) for i in range(7)]
        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = few_rows

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert result.confidence < 0.8  # Penalty applied
        # Check for history penalty assumption
        penalty_assumption = next((a for a in result.assumptions if "history" in a["key"].lower()), None)
        assert penalty_assumption is not None
        assert penalty_assumption["value"] == 7

    def test_estimate_saving_no_history_uses_profile_target(self, mock_db):
        """Test estimate_saving falls back to profile monthly_target_kg when no history."""
        # Set up ActionCatalog query
        mock_action = Mock(spec=ActionCatalog)
        mock_action.action_key = "electricity.ac_hours"
        mock_action.activity_key = "electricity.ac_hours"
        mock_action.change_type = "reduce_quantity"
        mock_action.default_params = {"delta_per_day": 1.0, "ac_power_kw": 1.5}

        action_query = Mock()
        action_query.filter().first.return_value = mock_action

        # Set up Profile query
        mock_profile = Mock(spec=Profile)
        mock_profile.monthly_target_kg = 150.0
        profile_query = Mock()
        profile_query.filter().first.return_value = mock_profile

        # Mock db.query to return different queries based on model
        def query_side_effect(*args, **kwargs):
            # ActionCatalog query: db.query(ActionCatalog).filter(...)
            if len(args) == 1 and args[0] == ActionCatalog:
                return action_query
            # Profile query: db.query(Profile).filter(...)
            elif len(args) == 1 and args[0] == Profile:
                return profile_query
            # EmissionRecord query: db.query(EmissionRecord.kg_co2e, Activity.occurred_on)
            elif len(args) == 2 and args[0] == EmissionRecord.kg_co2e:
                # Return empty rows for no history
                emission_query = Mock()
                emission_query.join.return_value = emission_query
                emission_query.filter.return_value = emission_query
                emission_query.all.return_value = []
                return emission_query
            else:
                return Mock()

        mock_db.query.side_effect = query_side_effect

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert result.baseline_kg_month == 150.0
        assert result.confidence <= 0.6  # Further reduced for no history

    def test_estimate_saving_no_history_no_profile_uses_default(self, mock_db, mock_action_catalog):
        """Test estimate_saving uses default 128.0 when no history and no profile."""
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action_catalog

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert result.baseline_kg_month == 128.0

    def test_estimate_saving_cycling_action(self, mock_db):
        """Test estimate_saving for cycling action."""
        mock_action = Mock(spec=ActionCatalog)
        mock_action.action_key = "transport.cycle_commute"
        mock_action.change_type = "shift_mode"
        mock_action.default_params = {"trips_per_week": 2, "trip_distance_km": 3.0}
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [(5.0, date.today() - timedelta(days=i)) for i in range(30)]

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "transport.cycle_commute")

        assert result.saving_kg_month > 0
        # Check for two wheeler factor assumption
        tw_assumption = next((a for a in result.assumptions if "two_wheeler" in a["key"]), None)
        assert tw_assumption is not None

    def test_estimate_saving_meal_swap_action(self, mock_db):
        """Test estimate_saving for plant-based meal swap."""
        mock_action = Mock(spec=ActionCatalog)
        mock_action.action_key = "food.veg_meal_swap"
        mock_action.change_type = "swap_item"
        mock_action.default_params = {"swaps_per_week": 3}
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [(4.0, date.today() - timedelta(days=i)) for i in range(30)]

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "food.veg_meal_swap")

        assert result.saving_kg_month > 0
        assert result.baseline_kg_month == 120.0  # 30 * 4.0

    def test_estimate_saving_uses_merged_params(self, mock_db, mock_action_catalog):
        """Test that user-provided params override action defaults."""
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action_catalog

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [(4.2, date.today() - timedelta(days=i)) for i in range(30)]

        mock_db.query(Profile).filter().first.return_value = None

        # User provides custom delta_per_day
        user_params = {"delta_per_day": 2.0, "ac_power_kw": 2.0}
        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours", user_params)

        # Should use user's 2.0 hours/day instead of default 1.0
        assert result.saving_kg_month > 0

    def test_estimate_saving_returns_saving_estimate_object(self, mock_db, mock_action_catalog):
        """Test that estimate_saving returns SavingEstimate with all fields."""
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action_catalog

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [(4.2, date.today() - timedelta(days=i)) for i in range(30)]

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert isinstance(result, SavingEstimate)
        assert hasattr(result, "action_key")
        assert hasattr(result, "baseline_kg_month")
        assert hasattr(result, "projected_kg_month")
        assert hasattr(result, "saving_kg_month")
        assert hasattr(result, "basis")
        assert hasattr(result, "confidence")
        assert hasattr(result, "assumptions")
        assert hasattr(result, "factor_ids")

    def test_saving_estimate_to_dict(self):
        """Test SavingEstimate.to_dict() serialization."""
        estimate = SavingEstimate(
            action_key="test.action",
            baseline_kg_month=100.0,
            projected_kg_month=90.0,
            saving_kg_month=10.0,
            basis="estimated",
            confidence=0.85,
            assumptions=[{"key": "test", "label": "Test", "value": 1.0, "unit": "kg", "source": "Test"}],
            factor_ids=["factor1"],
        )

        d = estimate.to_dict()

        assert d["action_key"] == "test.action"
        assert d["baseline_kg_month"] == 100.0
        assert d["projected_kg_month"] == 90.0
        assert d["saving_kg_month"] == 10.0
        assert d["basis"] == "estimated"
        assert d["confidence"] == 0.85
        assert len(d["assumptions"]) == 1
        assert d["factor_ids"] == ["factor1"]


class TestEdgeCases:
    """Test edge cases for estimate_saving."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return Mock(spec=Session)

    def test_estimate_saving_projected_never_negative(self, mock_db):
        """Test that projected kg never goes negative."""
        mock_action = Mock(spec=ActionCatalog)
        mock_action.action_key = "electricity.ac_hours"
        mock_action.change_type = "reduce_quantity"
        mock_action.default_params = {"delta_per_day": 10.0, "ac_power_kw": 5.0}  # Extreme params
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [(1.0, date.today() - timedelta(days=i)) for i in range(30)]

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert result.projected_kg_month >= 0.0

    def test_estimate_saving_confidence_bounded(self, mock_db):
        """Test confidence is bounded between 0.3 and 1.0."""
        mock_action = Mock(spec=ActionCatalog)
        mock_action.action_key = "electricity.ac_hours"
        mock_action.change_type = "reduce_quantity"
        mock_action.default_params = {"delta_per_day": 1.0, "ac_power_kw": 1.5}
        mock_db.query(ActionCatalog).filter().first.return_value = mock_action

        mock_query = Mock()
        mock_db.query(EmissionRecord.kg_co2e, Activity.occurred_on).join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []

        mock_db.query(Profile).filter().first.return_value = None

        result = estimate_saving(mock_db, "test-user", "electricity.ac_hours")

        assert 0.3 <= result.confidence <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])