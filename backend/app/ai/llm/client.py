import httpx
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings
from app.ai.config import ai_config
from app.ai.llm.fallback import DeterministicFallback
import logging

logger = logging.getLogger(__name__)

class GroqClient:
    @staticmethod
    async def chat_completion(
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
    ) -> Tuple[str, bool]:
        """
        Calls Groq API (model llama-3.3-70b-versatile).
        Returns: (reply_text, degraded: bool)
        """
        if not settings.LLM_ENABLED or not settings.GROQ_API_KEY:
            logger.info("Groq API key not set or LLM disabled; using deterministic template fallback.")
            return DeterministicFallback.generate_chat_reply(
                message=user_prompt,
                footprint_period="2026-11",
                total_kg=128.0,
                top_hotspot="Transport (petrol two-wheeler)",
            ), True

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": settings.GROQ_MODEL or ai_config.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature if temperature is not None else ai_config.TEMPERATURE,
            "max_tokens": ai_config.MAX_TOKENS,
        }

        try:
            async with httpx.AsyncClient(timeout=float(settings.LLM_TIMEOUT_S)) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if response.status_code == 200:
                    data = response.json()
                    reply = data["choices"][0]["message"]["content"].strip()
                    return reply, False
                else:
                    logger.warning(f"Groq API returned error status {response.status_code}: {response.text}")
                    return DeterministicFallback.generate_chat_reply(
                        message=user_prompt,
                        footprint_period="2026-11",
                        total_kg=128.0,
                        top_hotspot="Transport (petrol two-wheeler)",
                    ), True
        except Exception as e:
            logger.warning(f"Groq API exception ({type(e).__name__}): {e}; degrading gracefully.")
            return DeterministicFallback.generate_chat_reply(
                message=user_prompt,
                footprint_period="2026-11",
                total_kg=128.0,
                top_hotspot="Transport (petrol two-wheeler)",
            ), True
