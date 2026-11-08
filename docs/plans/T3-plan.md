# Teammate 3 Implementation Plan: AI and Adaptive Intelligence Module (`docs/plans/T3-plan.md`)

**Date**: 2026-11-08  
**Role**: AI and Adaptive-Intelligence Engineer (Teammate 3)  
**Branch**: `feat/ai-prototype`  
**Target Milestone**: Working PROTOTYPE for Recommendation & Adaptive Learning  
**Status**: DRAFT – PENDING HUMAN APPROVAL BEFORE CODE CHANGES

---

## 1. Architectural Invariants & Scope Boundaries

1. **Ownership Scope**:
   - `backend/app/ai/**` (router, recommender, adaptive, feedback, explain, llm, repo, config).
   - `backend/tests/ai/**` (all test modules verifying AI logic).
   - `docs/ai/**` (`PROMPTS.md`, `SCORING.md`, seed data).
   - `docs/plans/T3-*` (audit, plan, status, requests).
2. **Untouchable Boundaries (Strict)**:
   - `frontend/**` (owned by T1).
   - `backend/app/main.py` (owned by T2; already mounts `app.ai.router`).
   - `backend/app/models/**` and `backend/alembic/**` (owned by T2).
   - `backend/app/services/**` (owned by T2).
3. **Data & Contract Invariants**:
   - **T3 → T2 Only**: Call T2's frozen interfaces from `contracts/PY_INTERFACES.md` (`estimate_saving`, `get_footprint_summary`, `get_hotspots`, `get_action_catalog`, `get_factor_sources`, `on_event`).
   - **Zero Carbon Arithmetic in `app/ai`**: Every emission saving, baseline, and factor comes strictly from T2.
   - **Explainable Statistical Learning**: Use Beta-Bernoulli conjugate distributions + transparent weighted scoring. Never call it trained ML.
   - **Strict LLM Guardrails**: The LLM writes words only; all numbers are checked against an allowed fact set by `ExplanationValidator`. If ungrounded or unavailable, fall back cleanly with `degraded = true`.
   - **Visible Adaptation Guarantee**: When a user marks an action as skipped with `not_practical`, that action ranks lower or enters cooldown, and a lower-difficulty alternative from the same category rises.

---

## 2. Implementation Tasks (Tasks 1 to 13)

### Task 1: Audit & Seed Data
- Complete audit report in `docs/plans/T3-audit.md` (done).
- Create `docs/ai/feedback_seed.json` with realistic feedback sequences representing cycles 1 and 2 to demonstrate adaptive learning and acceptance progression across transport, electricity, food, and shopping actions.

### Task 2: Scoring Specification (`docs/ai/SCORING.md`)
- Author comprehensive, reproducible scoring specification in `docs/ai/SCORING.md`:
  - Normalized Impact ($S_{impact} \in [0.1, 1.0]$): $\min(1.0, \max(0.1, \text{saving\_kg} / 25.0))$.
  - Preference Affinity ($S_{pref} \in [0.1, 1.0]$): $\frac{\alpha}{\alpha + \beta} \times \frac{W_{category}}{1.0}$.
  - Feasibility ($S_{feas} \in [0.4, 0.9]$): based on action difficulty (1=0.9, 2=0.8, 3=0.7, 4=0.5, 5=0.4) and cost level penalties.
  - Goal / Hotspot Fit ($S_{goal} \in [0.4, 1.0]$): 1.0 if category is in user's top 2 hotspots, 0.7 if top 3, 0.5 otherwise.
  - Weights: Impact = 0.35, Preference = 0.30, Feasibility = 0.20, Goal/Hotspot Fit = 0.15.
  - Cooldown Deductions: 0.35 if rejected in prior cycle, 0.20 if skipped in prior cycle, 0.10 if 2 cycles prior.
  - **Deterministic Tie-Breaking**: Primary sort key: score (descending); Secondary sort key: `action_key` (alphabetical ascending).

### Task 3: AI Configuration & Hyperparameters (`backend/app/ai/config.py`)
- Define transparent hyperparameters in `AIConfig`:
  - `WEIGHT_IMPACT = 0.35`
  - `WEIGHT_PREFERENCE = 0.30`
  - `WEIGHT_FEASIBILITY = 0.20`
  - `WEIGHT_GOAL = 0.15`
  - `ALPHA_PRIOR = 1.0`, `BETA_PRIOR = 1.0`
  - `COOLDOWN_REJECTED_CYCLES = 2`, `COOLDOWN_SKIPPED_CYCLES = 1`
  - `PENALTY_REJECTED = 0.35`, `PENALTY_SKIPPED = 0.20`
  - `DIFF_TOLERANCE_STEP = 0.05`, `COST_SENSITIVITY_STEP = 0.05`

### Task 4: Candidate Generation with Hotspot Prioritization (`backend/app/ai/recommender/candidates.py`)
- Query `get_action_catalog(db)` from T2.
- Query `get_hotspots(db, user_id)` from T2 to identify user's largest emission sources.
- Filter out actions that are currently accepted/completed in the active cycle or marked `already_doing`.
- Ensure candidate pool includes actions from the user's top hotspots plus viable lower-difficulty alternatives within each category.

### Task 5: Deterministic Weighted Scoring & Ranker (`scoring.py`, `ranker.py`)
- In `scoring.py`: Compute deterministic scores with breakdown components using the defined weights and tie-breaking.
- In `ranker.py`:
  - Invoke `estimate_saving()` for each candidate.
  - Apply cooldown penalties based on profile history.
  - Sort candidates by `(-score, action_key)`.
  - Assign `priority_rank` (1..N).

### Task 6: Cooldown Logic & Dynamic Cycle Tracking (`cooldown.py`, `router.py`)
- In `cooldown.py`: Check `action_stats` for `last_shown_cycle` and `last_response` to apply penalties.
- In `router.py`:
  - Compute active cycle dynamically: query existing recommendations for `user_id` and set `cycle = max(cycle, default=0) + 1`.
  - Compute `changes_since_last_cycle` dynamically by comparing the new top-ranked items with recommendations from `cycle - 1`, explaining ranking shifts (e.g. actions lowered due to skip feedback, alternatives promoted).

### Task 7: Explainable Beta-Bernoulli Update (`backend/app/ai/adaptive/update.py`)
- Update `update_preference_profile` to handle all responses and reason codes per specification:
  - `accepted` / `completed`: `alpha += 1.0`, category weight +0.05, `difficulty_tolerance` +0.02.
  - `modified`: partial acceptance (`alpha += 0.5`, `beta += 0.5`), update default parameters.
  - `skipped` / `rejected`: `beta += 1.0` (or `1.5` for rejected).
  - Reason `not_practical`: decrease `difficulty_tolerance` by 0.05 (min 0.20), lower action rank.
  - Reason `too_costly`: increase `cost_sensitivity` by 0.05 (max 0.95).
  - Reason `not_relevant`: decrease category weight by 0.10 (min 0.40).
  - Reason `already_doing`: flag `already_doing = True` in stats, suppressing without negative preference penalty.
  - Reason `other`: standard Beta update.

### Task 8: Adaptive Metrics Service (`backend/app/ai/adaptive/metrics.py`)
- Replace hardcoded cycle trend with real dynamic computation:
  - Query all `recommendation_feedback` rows for the user.
  - Group feedback by cycle (via recommendation join).
  - Compute real per-cycle acceptance rates and cumulative feedback statistics.

### Task 9: Strict Explanation Validator (`backend/app/ai/explain/validator.py`)
- Implement comprehensive validation checks:
  1. **Number Grounding**: Extract all numeric values in LLM text (using regex). Check that every number appears in the allowed fact set (expected saving, category share, baseline total, or published factor values).
  2. **Catalog Integrity**: Verify action title and category match real catalog items.
  3. **Sentence Constraints**: Ensure response length is between 1 and 3 sentences.
  4. **Comparative Guardrail**: Disallow unverified comparative claims (e.g., "reduces by X%").
- On any failure, log warning and return `(False, reason)` to trigger deterministic fallback.

### Task 10: Explanation Builder & LLM Client (`builder.py`, `client.py`, `fallback.py`)
- Update `ExplanationBuilder`:
  - Collect exact fact set (saving kg, category, user hotspot rank).
  - Construct prompt grounded in facts.
  - If Groq LLM returns text, validate via `ExplanationValidator`.
  - If validation fails or LLM is degraded/timeout, use `DeterministicFallback` and set `degraded = True`.

### Task 11: Feedback Service & Ownership Verification (`feedback/service.py`, `repo.py`, `router.py`)
- Verify recommendation ownership in `FeedbackService` and router:
  - If recommendation belongs to a different user, raise `HTTPException(status_code=404, detail="Recommendation not found")`.
  - Validate transition conflicts: if recommendation is already answered, raise `409 Conflict`.
  - Call T2's `on_event(db, user_id, event, ref)` cross-module hook.

### Task 12: Visible Adaptation Guarantee Test & Demonstration
- Write integration test proving:
  1. Cycle 1: Generate recommendations for a new user. Action A (e.g. `transport.cycle_short_commute`, difficulty 3) ranks high.
  2. User skips Action A with `reason_code = "not_practical"`.
  3. Cycle 2: Generate recommendations. Action A is demoted (cooldown/penalized), and a lower-difficulty alternative from the same category (e.g. `transport.shift_auto_to_bus`, difficulty 2) rises to a top rank.

### Task 13: Full Test Suite (`backend/tests/ai/`)
- `tests/ai/test_scoring.py`: Test deterministic scoring formula, tie-breaking, weights, and components.
- `tests/ai/test_adaptive_feedback.py`: Test all 5 responses (`accepted`, `completed`, `skipped`, `rejected`, `modified`) and 5 reason codes.
- `tests/ai/test_visible_adaptation.py`: End-to-end visible adaptation before/after guarantee.
- `tests/ai/test_validator.py`: Strict validation of allowed numbers, rejection of hallucinations, sentence bounds.
- `tests/ai/test_ownership.py`: Cross-user security and isolation on recommendations and feedback.

---

## 3. Human Approval Gate (Operating Rule 6)

In accordance with Operating Rule 6:
> "Write an implementation plan to docs/plans/T3-plan.md BEFORE coding, then stop and wait for human approval."

No implementation code will be written until the human approves this plan.
