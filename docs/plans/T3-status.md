# Teammate 3 Status: AI and Adaptive Intelligence Module (`docs/plans/T3-status.md`)

**Date**: 2026-11-08  
**Role**: AI and Adaptive-Intelligence Engineer (Teammate 3)  
**Branch**: `feat/ai-prototype`  
**Milestone**: PROTOTYPE Complete  

---

## 1. Summary of Completed Work

All tasks assigned to Teammate 3 in `docs/plans/T3-plan.md` have been implemented, strictly preserving the boundary invariants (no changes to `frontend/`, `backend/app/main.py`, models, migrations, or backend core services).

### Evidence of Completed Prototype Features

1. **Deterministic Weighted Scoring Engine**:
   - Implemented in `backend/app/ai/recommender/scoring.py` and `ranker.py`.
   - Normalizes impact against 25 kg/month benchmark ($w_{\text{impact}}=0.35$), preference ($w_{\text{pref}}=0.30$), feasibility ($w_{\text{feas}}=0.20$), and hotspot goal fit ($w_{\text{goal}}=0.15$).
   - Explicit deterministic tie-breaking by `(-score, candidate.action_key)`.
   - Documented in `docs/ai/SCORING.md`.
   - *Evidence*: `tests/ai/test_scoring.py` (3 tests passed).

2. **Hotspot-Aware Candidate Generation & Cooldown**:
   - Implemented in `backend/app/ai/recommender/candidates.py` and `cooldown.py`.
   - Automatically prioritizes categories from `get_hotspots()` while suppressing actions marked `already_doing` or completed in current cycle.
   - Applies cooldown deductions (0.35 for recent reject, 0.20 for skip, 0.10 for receded).
   - *Evidence*: `test_scoring_cooldown_penalty_deduction` passed.

3. **Explainable Beta-Bernoulli Conjugate Updating**:
   - Implemented in `backend/app/ai/adaptive/update.py`.
   - Handles all responses: `accepted`, `completed`, `modified` (partial acceptance), `skipped`, `rejected`.
   - Handles all reason codes: `not_practical` (decreases difficulty tolerance), `too_costly` (increases cost sensitivity), `not_relevant` (decreases category weight), `already_doing` (suppression without preference penalty), `other`.
   - *Evidence*: `tests/ai/test_adaptive.py` (2 tests passed) and `tests/ai/test_adaptive_feedback.py` (6 tests passed).

4. **Dynamic Cycle Progression & Diffing**:
   - Implemented in `backend/app/ai/router.py`.
   - Cycle is dynamically determined as `max(cycle) + 1` from database.
   - Computes dynamic `changes_since_last_cycle` detailing skipped/rejected items from previous cycle and explanation notes.
   - *Evidence*: `tests/ai/test_visible_adaptation.py` verified across cycles 1 and 2.

5. **Visible Adaptation Guarantee**:
   - Proven end-to-end: skipping an action as `not_practical` causes it to rank lower/cooldown in the subsequent cycle, elevating a lower-difficulty alternative from the same category, and reflecting in `changes_since_last_cycle`.
   - *Evidence*: `tests/ai/test_visible_adaptation.py::test_visible_adaptation_lifecycle` passed.

6. **Strict Explanation Output Validator & LLM Fallback**:
   - Implemented in `backend/app/ai/explain/validator.py` and `builder.py`.
   - Rejects ungrounded numbers, comparative percentage claims not present in fact set, sentence length outside [1, 3], and invented categories.
   - Automatically degrades to `DeterministicFallback` and marks `degraded = True` if validation fails or LLM is unavailable.
   - *Evidence*: `tests/ai/test_validator.py` (5 tests passed).

7. **Cross-Tenant Ownership Isolation & Conflict Prevention**:
   - Implemented in `backend/app/ai/feedback/service.py` and `router.py`.
   - Cross-user feedback and explanation queries return `404 Not Found`.
   - Duplicate feedback on already resolved recommendations returns `409 Conflict`.
   - Cross-module reward hook `on_event` invoked atomically.
   - *Evidence*: `tests/ai/test_ownership.py` passed.

8. **Dynamic Adaptive Metrics**:
   - Implemented in `backend/app/ai/adaptive/metrics.py`.
   - Computes acceptance rates dynamically grouped by recommendation cycle from real database rows.
   - *Evidence*: `tests/ai/test_visible_adaptation.py` (step 5 verified).

---

## 2. Test Execution Results

```
============================= test session starts =============================
platform win32 -- Python 3.13.11, pytest-9.1.1, pluggy-1.5.0
plugins: anyio-4.13.0, asyncio-1.4.0
collected 37 items

tests/ai/test_adaptive.py::test_adaptive_beta_bernoulli_skip_update PASSED [  2%]
tests/ai/test_adaptive.py::test_adaptive_accept_update PASSED            [  5%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_accepted_and_completed PASSED [  8%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_modified PASSED [ 10%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_not_practical PASSED [ 13%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_too_costly PASSED [ 16%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_not_relevant PASSED [ 18%]
tests/ai/test_adaptive_feedback.py::test_adaptive_feedback_already_doing PASSED [ 21%]
tests/ai/test_ownership.py::test_recommendation_ownership_and_conflict PASSED [ 24%]
tests/ai/test_scoring.py::test_deterministic_scoring_formula PASSED      [ 27%]
tests/ai/test_scoring.py::test_scoring_cooldown_penalty_deduction PASSED [ 29%]
tests/ai/test_scoring.py::test_deterministic_tie_breaking PASSED         [ 32%]
tests/ai/test_validator.py::test_validator_allowed_saving_number_passes PASSED [ 35%]
tests/ai/test_validator.py::test_validator_ungrounded_number_fails PASSED [ 37%]
tests/ai/test_validator.py::test_validator_sentence_count_bounds PASSED  [ 40%]
tests/ai/test_validator.py::test_validator_ungrounded_comparative_percentage_claim PASSED [ 43%]
tests/ai/test_validator.py::test_validator_invented_category_rejected PASSED [ 45%]
tests/ai/test_visible_adaptation.py::test_visible_adaptation_lifecycle PASSED [ 48%]
tests/test_api_endpoints.py::test_health_endpoint PASSED                 [ 51%]
tests/test_api_endpoints.py::test_auth_protection_without_token PASSED   [ 54%]
tests/test_api_endpoints.py::test_profile_endpoints PASSED               [ 56%]
tests/test_api_endpoints.py::test_onboarding_cp1_idempotency PASSED      [ 59%]
tests/test_api_endpoints.py::test_activity_lifecycle_post_patch_delete PASSED [ 62%]
tests/test_api_endpoints.py::test_consent_required_check PASSED          [ 64%]
tests/test_api_endpoints.py::test_footprint_summary PASSED               [ 67%]
tests/test_api_endpoints.py::test_footprint_hotspots PASSED              [ 70%]
tests/test_api_endpoints.py::test_simulator_scenario PASSED              [ 72%]
tests/test_api_endpoints.py::test_impact_summary PASSED                  [ 75%]
tests/test_carbon_engine.py::test_hand_computed_factor_math PASSED       [ 78%]
tests/test_carbon_engine.py::test_validation_plausibility_rules PASSED   [ 81%]
tests/test_carbon_engine.py::test_project_scenario_shared_logic PASSED   [ 83%]
tests/test_ownership_isolation.py::test_tenant_isolation_activities PASSED [ 86%]
tests/test_validation_edge_cases.py::test_validation_positive_quantity PASSED [ 89%]
tests/test_validation_edge_cases.py::test_validation_speed_limits PASSED [ 91%]
tests/test_validation_edge_cases.py::test_validation_distance_caps PASSED [ 94%]
tests/test_validation_edge_cases.py::test_validation_daily_caps PASSED   [ 97%]
tests/test_validation_edge_cases.py::test_validation_z_score_detection PASSED [100%]

============================= 37 passed in 1.94s ==============================
```

---

## 3. Pending (POST-PROTOTYPE) Work

As established by the Main Plan and conflict resolutions:
1. **Interactive Conversational Chatbot (Conflict C4)**:
   - Full conversational session continuity with multi-turn memory and tool use is scheduled post-prototype.
   - For the prototype, `/chat/messages` and `/chat/sessions` use graceful fallback grounded in footprint figures.
2. **Third-Party Telemetry & Strava Direct Sync**:
   - Post-prototype.
3. **Advanced Multi-Region Localization Factors**:
   - Prototype utilizes India national benchmarks (CEA Baseline v19, ARAI/MoEFCC); additional international grid profiles are planned for subsequent phases.
