import re
from typing import Tuple

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?guidelines",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"system\s+override",
    r"reveal\s+your\s+system\s+prompt",
]

def check_guardrails(user_message: str) -> Tuple[bool, str]:
    """
    Checks if message contains prompt injection attempts or malicious payload.
    """
    lower = user_message.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower):
            return False, "I cannot process system override or prompt modification requests. I am focused on assisting with your carbon footprint."

    return True, "Passed"
