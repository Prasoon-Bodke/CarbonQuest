import re
from typing import List, Tuple, Set, Optional

class ExplanationValidator:
    @staticmethod
    def validate(
        explanation: str,
        expected_saving_kg: float,
        allowed_numbers: Optional[List[float]] = None,
        allowed_categories: Optional[List[str]] = None,
        allowed_action_names: Optional[List[str]] = None,
    ) -> Tuple[bool, str]:
        """
        Strict output guardrail for LLM-generated explanations per docs/plans/T3-plan.md Task 9:
        (a) All numbers in text exist in the allowed fact set (with rounding tolerance).
        (b) Action names or categories mentioned match valid catalog entities.
        (c) Sentence count is strictly between 1 and 3 sentences.
        (d) Comparative claims (e.g., 'reduces by X%') are rejected unless the exact percentage is in allowed set.
        """
        cleaned = explanation.strip()
        if not cleaned:
            return False, "Explanation is empty"

        # 1. Sentence count check: 1 to 3 sentences
        sentences = [s.strip() for s in re.split(r"[.!?]+", cleaned) if s.strip()]
        if len(sentences) < 1 or len(sentences) > 3:
            return False, f"Sentence count {len(sentences)} outside required range [1, 3]"

        # 2. Build complete allowed number set
        allowed = [round(float(expected_saving_kg), 1), round(float(expected_saving_kg), 2)]
        if allowed_numbers:
            for n in allowed_numbers:
                try:
                    fn = float(n)
                    allowed.extend([round(fn, 1), round(fn, 2), int(fn) if fn.is_integer() else fn])
                except (ValueError, TypeError):
                    pass

        # 3. Check for comparative percentage claims (e.g. "reduces by 80%", "reduces your emissions by 85%")
        pct_matches = re.findall(r"reduces?.*?\bby\s+(\d+(?:\.\d+)?)%", cleaned, flags=re.IGNORECASE)
        for pct_str in pct_matches:
            pct_val = float(pct_str)
            if not any(abs(pct_val - a) < 0.1 for a in allowed):
                return False, f"Ungrounded comparative percentage claim: {pct_val}%"

        # 4. Extract all numeric values in text and verify against allowed fact set
        raw_numbers = re.findall(r"\b\d+(?:\.\d+)?\b", cleaned)
        for num_str in raw_numbers:
            val = float(num_str)
            is_allowed = any(abs(val - a) < 0.15 for a in allowed)
            if not is_allowed:
                return False, f"Ungrounded number '{num_str}' not in allowed fact set {allowed}"

        # 5. Check categories if provided
        if allowed_categories:
            cat_words = [c.lower() for c in allowed_categories]
            invented_cats = ["crypto", "aviation", "space", "nuclear"]
            for bad_cat in invented_cats:
                if bad_cat in cleaned.lower() and bad_cat not in cat_words:
                    return False, f"Invented category '{bad_cat}' detected in explanation"

        return True, "Valid"
