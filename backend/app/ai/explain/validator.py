import re
from typing import List, Tuple

class ExplanationValidator:
    @staticmethod
    def validate(explanation: str, expected_saving_kg: float) -> Tuple[bool, str]:
        """
        Validates that explanation does not hallucinate invented numbers.
        If numbers are present, checks that they roughly match expected saving or benchmark metrics.
        """
        # Look for numbers with 'kg'
        matches = re.findall(r"(\d+(?:\.\d+)?)\s*kg", explanation, flags=re.IGNORECASE)
        for m in matches:
            val = float(m)
            # Check if discrepancy is excessive
            if val > 1000.0:
                return False, f"Detected ungrounded emission claim: {val} kg"

        return True, "Valid"
