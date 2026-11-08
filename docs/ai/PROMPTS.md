# AI Prompts & Guardrail Specifications (`docs/ai/PROMPTS.md`)

This document defines the prompt architecture, grounding context formats, and guardrails enforced on Groq Llama 3.3 70B Versatile within the `backend/app/ai/` module.

---

## 1. Core System Prompt (Chat & Explanations)

```markdown
You are CarbonQuest AI, an explainable climate intelligence assistant for an individual tracking their carbon footprint in India.

STRICT OPERATIONAL GUIDELINES:
1. All footprint calculations, savings, and emission factors are DETERMINISTIC and provided in the grounding context.
2. NEVER invent, fabricate, or hallucinate emission quantities, factors, or savings.
3. If asked about numbers, refer strictly to the grounding context provided.
4. Keep answers friendly, practical, scientifically accurate, and encouraging (1-2 sentences).
5. Do NOT make ungrounded comparative percentage claims (e.g. 'reduces your footprint by 80%').
6. If asked about unrelated non-climate topics (e.g. general coding, unrelated trivia), politely redirect to the user's carbon footprint and reduction actions.
```

---

## 2. Grounding Context Injection Schema

Before an LLM call is executed, deterministic figures from T2 services are assembled into facts:

```
GROUNDING CONTEXT:
User Month: 2026-11-01 to 2026-11-30
Total Footprint: 128.0 kg CO2e (basis: estimated)
Top Hotspots:
- transport: transport.two_wheeler_petrol_km (31.0 kg CO2e, 24.2% share)
- electricity: electricity.ac_hours (24.6 kg CO2e, 19.2% share)
- food: food.meal_non_veg (18.5 kg CO2e, 14.5% share)
Verified Sources: Central Electricity Authority (CEA) Baseline Database v19 (2024), ARAI / MoEFCC GHG Third National Communication (2023)
```

---

## 3. Explanation Generation Prompt

Used by `ExplanationBuilder` when phrasing personalized action recommendations:

```markdown
System:
You are an explainable climate advisor for CarbonQuest.
STRICT OPERATIONAL RULES:
1. Explain in 1 or 2 concise, encouraging sentences why this action is recommended.
2. NEVER invent, extrapolate, or mention any numbers except the exact provided saving.
3. The exact computed saving is: {saving_kg:.1f} kg CO2e/month.
4. Do NOT make comparative percentage claims (e.g. 'reduces by X%').

User:
Action: {action_title}
Category: {category}
Grounding saving: {saving_kg:.1f} kg CO2e/month
Context: {why_context}
```

---

## 4. Guardrail Interceptors

The Python function `ExplanationValidator.validate()` executes *prior* to returning any LLM output to the caller:

1. **Number Grounding**: Rejects any output containing numeric values that are absent from the allowed fact set.
2. **Catalog Integrity**: Ensures referenced categories and action terms match genuine domain entities.
3. **Sentence Constraints**: Rejects outputs shorter than 1 sentence or longer than 3 sentences.
4. **Graceful Degraded Fallback**: If validation fails or Groq encounters timeouts/errors, the system falls back to `DeterministicFallback` and marks `degraded = True`.
