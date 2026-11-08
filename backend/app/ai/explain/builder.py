import logging
from typing import Tuple, List, Optional
from app.ai.llm.client import GroqClient
from app.ai.llm.fallback import DeterministicFallback
from app.ai.explain.validator import ExplanationValidator

logger = logging.getLogger(__name__)

class ExplanationBuilder:
    @staticmethod
    async def build_explanation(
        action_title: str,
        category: str,
        saving_kg: float,
        why_context: str = "",
        allowed_numbers: Optional[List[float]] = None,
        allowed_categories: Optional[List[str]] = None,
    ) -> Tuple[str, str, bool]:
        """
        Builds explanation using Groq Llama 3.3 70B if available,
        verifies it with strict ExplanationValidator, or falls back to template.
        Returns: (explanation_text, explanation_source: 'llm'|'template', degraded: bool)
        """
        template_text = DeterministicFallback.format_recommendation_explanation(
            action_title=action_title,
            category=category,
            saving_kg=saving_kg,
            why_context=why_context,
        )

        facts = [saving_kg]
        if allowed_numbers:
            facts.extend(allowed_numbers)

        system_prompt = (
            "You are an explainable climate advisor for CarbonQuest. "
            "STRICT OPERATIONAL RULES:\n"
            "1. Explain in 1 or 2 concise, encouraging sentences why this action is recommended.\n"
            "2. NEVER invent, extrapolate, or mention any numbers except the exact provided saving.\n"
            f"3. The exact computed saving is: {saving_kg:.1f} kg CO2e/month.\n"
            "4. Do NOT make comparative percentage claims (e.g. 'reduces by X%')."
        )
        user_prompt = (
            f"Action: {action_title}\n"
            f"Category: {category}\n"
            f"Grounding saving: {saving_kg:.1f} kg CO2e/month\n"
            f"Context: {why_context}"
        )

        reply, degraded = await GroqClient.chat_completion(system_prompt, user_prompt)
        if degraded:
            return template_text, "template", True

        # Strict validation
        is_valid, reason = ExplanationValidator.validate(
            explanation=reply,
            expected_saving_kg=saving_kg,
            allowed_numbers=facts,
            allowed_categories=allowed_categories or [category],
        )

        if not is_valid:
            logger.warning(f"Explanation validation failed ('{reason}'). Degraded to deterministic template.")
            return template_text, "template", True

        return reply, "llm", False
