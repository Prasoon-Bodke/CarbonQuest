from sqlalchemy.orm import Session
from app.ai.chat.prompts import CHAT_SYSTEM_PROMPT
from app.ai.chat.guardrails import check_guardrails
from app.ai.chat.context import ChatContextBuilder
from app.ai.llm.client import GroqClient
from app.ai.llm.fallback import DeterministicFallback
from app.models import ChatSession, ChatMessage
from typing import Dict, Any, Optional
import uuid

class ChatService:
    @staticmethod
    async def process_chat(
        db: Session,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        # 1. Guardrails check
        passed, guardrail_msg = check_guardrails(message)
        if not passed:
            return {
                "session_id": session_id or str(uuid.uuid4()),
                "reply": guardrail_msg,
                "degraded": False,
                "grounding": {
                    "footprint_period": "2026-11",
                    "factor_sources": ["System Guardrail"],
                },
                "disclaimer": "Estimates based on published emission factors, not measured emissions.",
            }

        # 2. Get or create session
        if not session_id:
            chat_session = ChatSession(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title="Climate Advisory Session",
            )
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)
            session_id = chat_session.id

        # 3. Context builder
        context = ChatContextBuilder.build_context(db, user_id)
        system_prompt = f"{CHAT_SYSTEM_PROMPT}\n\nGROUNDING CONTEXT:\n{context['context_prompt']}"

        # 4. LLM call with fallback
        reply, degraded = await GroqClient.chat_completion(
            system_prompt=system_prompt,
            user_prompt=message,
        )

        # 5. Persist message history
        user_msg_record = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="user",
            content=message,
        )
        assistant_msg_record = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content=reply,
            context_refs={"period": context["period"]},
            degraded=degraded,
        )
        db.add(user_msg_record)
        db.add(assistant_msg_record)
        db.commit()

        return {
            "session_id": session_id,
            "reply": reply,
            "degraded": degraded,
            "grounding": {
                "footprint_period": context["period"],
                "factor_sources": context["factor_sources"],
            },
            "disclaimer": "Estimates based on published emission factors, not measured emissions.",
        }
