from typing import Tuple
from app.ai.llm.client import GroqClient
from app.ai.llm.fallback import DeterministicFallback
from app.ai.explain.validator import ExplanationValidator

class ExplanationBuilder:
    @staticmethod
    async def build_explanation(
        action_title: str,
        category: str,
        saving_kg: float,
        why_context: str = "",
    ) -> Tuple[str, str, bool]:
        """
        Builds explanation using Groq Llama 3.3 70B if available,
        verifies it with ExplanationValidator, or falls back to template.
        Returns: (explanation_text, explanation_source: 'llm'|'template', degraded: bool)
        """
        template_text = DeterministicFallback.format_recommendation_explanation(
            action_title=action_title,
            category=category,
            saving_kg=saving_kg,
            why_context=why_context,
        )

        system_prompt = (
            "You are a concise climate advisor. Explain why this specific sustainability action is recommended. "
            "STRICT RULES: Do NOT invent new numbers or savings. Mention only the provided saving of "
            f"{saving_kg:.1f} kg CO2e/month. Keep the explanation to 1 or 2 clear sentences."
        )
        user_prompt = f"Action: {action_title} in {category}. Why context: {why_context}. Saving: {saving_kg:.1f} kg CO2e/month."

        reply, degraded = await GroqClient.chat_completion(system_prompt, user_prompt)
        if degraded:
            return template_text, "template", True

        is_valid, _ = ExplanationValidator.validate(reply, saving_kg)
        if not is_valid:
            return template_text, "template", True

        return reply, "llm", False
