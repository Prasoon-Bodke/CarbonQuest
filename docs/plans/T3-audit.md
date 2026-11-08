# Teammate 3 Audit: AI and Adaptive Intelligence Module (`docs/plans/T3-audit.md`)

**Date**: 2026-11-08  
**Role**: AI and Adaptive-Intelligence Engineer (Teammate 3)  
**Branch**: `feat/ai-prototype`  
**Scope**: `backend/app/ai/**`, `backend/tests/ai/**`, `docs/ai/**`  
**Boundaries**: Does not touch `frontend/**`, `backend/app/main.py`, models, migrations, or backend core services.

---

## 1. Baseline Test Run & Environment Audit

- `python -m pytest tests/ai -v`:
  - `tests/ai/test_adaptive.py::test_adaptive_beta_bernoulli_skip_update`: PASSED
  - `tests/ai/test_adaptive.py::test_adaptive_accept_update`: PASSED
  - Total: 2 passed in 0.45s.
- Overall backend test suite (`python -m pytest tests/ -v`): 21 passed in 1.95s.

---

## 2. Audit Table of AI Endpoints & Modules

The AI module router (`backend/app/ai/router.py`) mounts the following endpoints:

| Endpoint / Module | Implemented | Returns Real Data | Tested | Gap / Action Required |
|---|---|---|---|---|
| `POST /recommendations/generate` | Yes | Partial | Partial | **Gap**: Cycle number is hardcoded to `3` (`router.py:36`). Candidate generation (`candidates.py`) only filters by category, ignoring user hotspots and cooldowns. `changes_since_last_cycle` is hardcoded static string. Need dynamic cycle detection from user history and dynamic diffing. |
| `GET /recommendations` | Yes | Yes | No | **Real**: Fetches user recommendations from DB via `AIRepository.get_user_recommendations`. Filters by status if provided. |
| `GET /recommendations/{id}/explanation` | Partial | Partial | No | **Gap**: Does not enforce user ownership check (404/403 for unauthorized users). Does not return grounding fact breakdown. |
| `POST /recommendations/{id}/feedback` | Yes | Yes | Partial | **Gap**: Feedback update in `update.py` does not handle all 6 reason codes (`not_relevant`, `already_doing`, `other`, partial acceptance for `modified`). Does not verify recommendation ownership or validate transition conflicts (e.g. 409 if already responded). |
| `POST /action-logs` | Yes | Yes | No | **Status**: Prototype supports basic action log creation. Calls `ActionCatalog` fallback. Post-prototype for full verification. |
| `GET /action-logs` | Yes | Yes | No | **Status**: Retrieves action logs for user from DB. |
| `GET /adaptive/profile` | Yes | Yes | Yes | **Real**: Returns transparent explainable Beta-Bernoulli parameters (`action_stats`, `category_weights`, `difficulty_tolerance`, `cost_sensitivity`). |
| `GET /adaptive/metrics` | Partial | Partial | No | **Gap**: `AdaptiveMetricsService` returns a hardcoded 3-cycle progression array (`trend = [{"cycle": 1, ...}, ...]`) rather than computing acceptance trend dynamically from `recommendation_feedback` rows. |
| `POST /chat/messages` | Partial | Degraded / Fallback | No | **Status**: Per Main Plan conflict C4 and prototype scope, chat is POST-PROTOTYPE. Clean fallback exists; router delegates to `ChatService`. |
| `GET /chat/sessions` | Partial | DB query | No | **Status**: POST-PROTOTYPE. |
| `GET /chat/sessions/{id}` | Partial | DB query | No | **Status**: POST-PROTOTYPE. |
| `Scoring Engine` (`scoring.py`, `ranker.py`) | Yes | Yes | Partial | **Gap**: Scoring uses 4 weights, but ties are not deterministically broken by `action_key`. Cooldown logic does not enforce explicit rank demotion when skipped. |
| `Explanation Builder & Validator` (`builder.py`, `validator.py`) | Partial | Partial | No | **Gap**: `ExplanationValidator` only checks if numbers exceed 1000 kg! It does NOT reject numbers absent from the allowed fact set, does NOT reject invented action names, and does NOT enforce sentence bounds. |

---

## 3. Explicit Audit Questions & Findings

### (a) Are all 12 router endpoints real, or are some fakes/hardcoded? Which ones?
- **Real Endpoints**:
  - `POST /recommendations/generate` executes real candidate selection and calls T2's `estimate_saving()`, storing rows in DB.
  - `GET /recommendations` queries the `recommendations` table for the authenticated user.
  - `POST /recommendations/{id}/feedback` persists `RecommendationFeedback` and updates `user_preference_profile`.
  - `GET /adaptive/profile` returns real user profile parameters from DB.
  - `POST /action-logs` and `GET /action-logs` interact directly with DB.
- **Fakes / Hardcoded / Gaps**:
  - In `POST /recommendations/generate`:
    - `cycle = 3` is hardcoded at line 36.
    - `changes_since_last_cycle` at line 101 is hardcoded to `["Transit actions prioritized higher based on positive response history and commute share."]`.
  - In `GET /adaptive/metrics`:
    - The `trend` array is hardcoded with static values for cycles 1, 2, and 3.
  - `GET /recommendations/{id}/explanation` returns raw DB fields without verifying user ownership or providing fact-grounded context.
  - Chat endpoints (`/chat/*`) use template fallback and are post-prototype per C4.

### (b) Does scoring actually call `estimate_saving` and produce deterministic values, or does it guess?
- **Finding**: Scoring **actually calls** `app.services.carbon.impact.estimate_saving()` in `RecommendationRanker.generate_and_rank()`. It receives real `SavingEstimate` objects containing deterministic `saving_kg_month` and `assumptions`.
- **Gaps**:
  - The candidate selector does not query `get_hotspots()` to prioritize user hotspot categories.
  - Tie-breaking is not explicitly specified (python `sort` is stable, but candidate order depends on DB catalog query order). Ties must break deterministically by `action_key`.

### (c) What responses does `update.py` handle today? Which of the 6 reasons does it handle?
- **Current responses handled**:
  - `accepted` and `completed`: `alpha += 1.0`, category weight +0.05, `difficulty_tolerance` +0.02.
  - `skipped` and `rejected`: `beta += 1.0` (or `1.5` for rejected).
- **Current reasons handled**:
  - `not_practical`: reduces `difficulty_tolerance` by 0.05.
  - `too_costly`: increases `cost_sensitivity` by 0.05.
- **Gaps**:
  - `not_relevant`: must decrease category weight for that action's category by 0.10 (clamped to 0.50).
  - `already_doing`: suppresses the action from future candidate sets without lowering user preference for the category.
  - `other`: standard Beta update without modifier penalty.
  - `modified`: partially accepted (e.g. `alpha += 0.5`, `beta += 0.5`), updating parameters to user-specified values.

### (d) Where does the adaptive profile persist? Does it survive a restart?
- **Finding**: Persists in the `user_preference_profile` table via `AIRepository.get_or_create_preference_profile()`.
- **Persistence Verification**: Backed by PostgreSQL/SQLite DDL (`UserPreferenceProfile` SQLAlchemy model). Fields `action_stats` (JSON), `category_weights` (JSON), `difficulty_tolerance` (Float), `cost_sensitivity` (Float), and `feedback_count` (Integer) survive database and server restarts cleanly.

### (e) Does `explain/validator.py` actually check anything, or does it have gaps?
- **Critical Finding**: It has a major gap. It only checks `if val > 1000.0: return False`.
- It does NOT check whether numbers match computed savings or assumptions in the grounding context.
- It does NOT verify that mentioned action names match known catalog actions.
- It does NOT enforce sentence count boundaries (1 to 3 sentences).
- It does NOT check for ungrounded comparative claims (e.g. "reduces your footprint by 80%").

### (f) Are there emission factors or carbon arithmetic hiding in `app/ai`?
- **Finding**: **None**. `backend/app/ai/` contains zero emission factor tables and zero emission calculations. All carbon numbers, savings, baselines, and assumptions are fetched directly from T2's frozen interfaces (`estimate_saving`, `get_footprint_summary`, `get_hotspots`, `get_action_catalog`).

### (g) How are cycle numbers and `changes_since_last_cycle` computed right now?
- **Finding**:
  - `cycle = 3` is hardcoded in `router.py`.
  - `changes_since_last_cycle` is a static 1-element string list in `router.py`.
- **Requirement**: Must be dynamic:
  - Active cycle is determined from existing recommendations: `max(rec.cycle for rec in user_recs) + 1` (or 1 if none).
  - `changes_since_last_cycle` must be generated by comparing previous cycle recommendations against newly generated cycle recommendations, surfacing explainable reasons (e.g. "Cycling short commute ranked lower because it was skipped as not_practical").
