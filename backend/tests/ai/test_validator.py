import pytest
from app.ai.explain.validator import ExplanationValidator

def test_validator_allowed_saving_number_passes():
    text = "Adopting bus transit saves 14.0 kg CO2e monthly."
    valid, reason = ExplanationValidator.validate(
        explanation=text,
        expected_saving_kg=14.0,
        allowed_numbers=[14.0],
    )
    assert valid is True
    assert reason == "Valid"

def test_validator_ungrounded_number_fails():
    text = "This action will miraculously reduce your footprint by 95.5 kg CO2e every week."
    valid, reason = ExplanationValidator.validate(
        explanation=text,
        expected_saving_kg=14.0,
        allowed_numbers=[14.0],
    )
    assert valid is False
    assert "Ungrounded number '95.5'" in reason

def test_validator_sentence_count_bounds():
    # 0 sentences (empty)
    valid_empty, _ = ExplanationValidator.validate("", expected_saving_kg=10.0)
    assert valid_empty is False

    # 4 sentences (too long)
    too_long = (
        "This is sentence one. "
        "This is sentence two. "
        "This is sentence three. "
        "This is sentence four."
    )
    valid_long, reason_long = ExplanationValidator.validate(
        too_long,
        expected_saving_kg=10.0,
        allowed_numbers=[],
    )
    assert valid_long is False
    assert "Sentence count 4 outside required range" in reason_long

    # 2 sentences (valid)
    valid_text = "Transport contributes heavily to your monthly total. Shifting to bus trips saves 12.0 kg CO2e."
    valid_ok, reason_ok = ExplanationValidator.validate(
        valid_text,
        expected_saving_kg=12.0,
        allowed_numbers=[12.0],
    )
    assert valid_ok is True

def test_validator_ungrounded_comparative_percentage_claim():
    text = "This easy habit reduces your emissions by 85% without effort."
    valid, reason = ExplanationValidator.validate(
        explanation=text,
        expected_saving_kg=10.0,
        allowed_numbers=[10.0],
    )
    assert valid is False
    assert "Ungrounded comparative percentage claim: 85.0%" in reason

def test_validator_invented_category_rejected():
    text = "In your nuclear sector, this action saves 10.0 kg."
    valid, reason = ExplanationValidator.validate(
        explanation=text,
        expected_saving_kg=10.0,
        allowed_numbers=[10.0],
        allowed_categories=["transport", "electricity"],
    )
    assert valid is False
    assert "Invented category 'nuclear'" in reason
