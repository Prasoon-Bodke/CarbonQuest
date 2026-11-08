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
4. Keep answers friendly, practical, scientifically accurate, and encouraging.
5. If asked about unrelated non-climate topics (e.g. general coding, unrelated trivia), politely redirect to the user's carbon footprint and reduction actions.
```

---

## 2. Grounding Context Injection Schema

Before the user message is evaluated, the system prepends deterministic calculations as context:

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
You are a concise climate advisor. Explain why this specific sustainability action is recommended.
STRICT RULES: Do NOT invent new numbers or savings. Mention only the provided saving of {saving_kg:.1f} kg CO2e/month. Keep the explanation to 1 or 2 clear sentences.

User:
Action: {action_title} in {category}. Why context: {why_context}. Saving: {saving_kg:.1f} kg CO2e/month.
```

---

## 4. Guardrail Interceptors

The Python function `check_guardrails` executes *prior* to sending queries to Groq:

- **Prompt Injection Defense**: Detects regex patterns targeting instruction override (e.g., `ignore all previous instructions`, `you are now in developer mode`, `reveal system prompt`).
- **Number Validator**: Output validator rejects LLM responses if fabricated emission figures or unverified reduction claims are detected.
- **Graceful Fallback**: If Groq encounters timeouts or API errors, the deterministic fallback engine generates contextual responses without raising an exception.
