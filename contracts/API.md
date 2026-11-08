# CarbonQuest REST API Specification (`contracts/API.md`)

- **Base URL**: `/api/v1`
- **Authentication**: Bearer JWT passed in header `Authorization: Bearer <token>` on all endpoints except `GET /health`.
- **Format**: REST + JSON. Snake_case fields. UTC ISO-8601 timestamps. YYYY-MM-DD dates.
- **Precision**: Quantities and kg CO₂e formatted as JSON numbers, rounded to 3 decimal places at API boundary.
- **Pagination**: `limit` (default 50, max 200) and `offset`, returns `total`.

---

## 1. Authentication & Profile

### `GET /me`
- **Owner**: T2
- **Description**: Returns profile, preferences, and baseline parameters of authenticated user.
- **Response**:
```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "display_name": "Aarav Sharma",
  "age_band": "25-34",
  "region_code": "IN",
  "household_size": 2,
  "monthly_target_kg": 100.0,
  "preferences": {
    "ok_modes": ["bus", "metro", "bicycle", "two_wheeler"],
    "diet": "vegetarian",
    "budget_level": "medium",
    "effort_level": "medium"
  },
  "consent_tracking": true,
  "consent_leaderboard": true,
  "onboarding_done": true
}
```

### `PUT /me`
- **Owner**: T2
- **Description**: Updates profile demographics, targets, and preference parameters.

### `POST /me/consents`
- **Owner**: T2
- **Description**: Updates user consent flags for activity tracking and community leaderboard.

### `POST /me/onboarding`
- **Owner**: T2
- **Description**: Sets initial baseline parameters and expands habits into 28 days of validated activities. Strictly idempotent via dedupe_hash.
- **Request**:
```json
{
  "display_name": "Aarav Sharma",
  "monthly_target_kg": 100.0,
  "habits": [
    {
      "category": "transport",
      "activity_key": "transport.two_wheeler_petrol_km",
      "frequency": "daily",
      "quantity": 15.0,
      "unit": "km",
      "metadata": { "mode": "two_wheeler", "duration_min": 35 }
    }
  ]
}
```
- **Response**:
```json
{
  "status": "ok",
  "activities_created": 28,
  "profile": {
    "id": "00000000-0000-0000-0000-000000000001",
    "onboarding_done": true
  }
}
```

### `GET /me/export`
- **Owner**: T2
- **Description**: Machine-readable JSON export of all personal profiles, activity logs, emission records, and recommendations.

### `DELETE /me`
- **Owner**: T2
- **Description**: Irreversible GDPR-compliant purge of user account and associated records.

---

## 2. Activities & Emission Factors

### `GET /emission-factors`
- **Owner**: T2
- **Description**: Lists active published emission factors with source citations and years.

### `POST /activities`
- **Owner**: T2
- **Description**: Submits an activity, runs rule-based plausibility validation, and deterministically computes emission record.
- **Request**:
```json
{
  "category": "transport",
  "activity_key": "transport.bus_km",
  "quantity": 12.5,
  "unit": "km",
  "occurred_on": "2026-11-03",
  "source": "manual",
  "metadata": { "mode": "bus", "duration_min": 40 }
}
```
- **Response**:
```json
{
  "activity": {
    "id": "act-1234",
    "category": "transport",
    "activity_key": "transport.bus_km",
    "quantity": 12.5,
    "unit": "km",
    "occurred_on": "2026-11-03",
    "source": "manual",
    "validation_status": "accepted",
    "validation_score": 0.92,
    "validation_reasons": []
  },
  "emission": {
    "id": "em-5678",
    "kg_co2e": 1.0,
    "factor": {
      "id": "fac-001",
      "value": 0.08,
      "unit": "kg CO2e/km",
      "source_name": "TERI / ARAI Urban Transit Benchmark",
      "source_year": 2023
    },
    "confidence": 0.82,
    "confidence_reasons": [
      "Factor region matches user profile",
      "Valid physical speed limits verified"
    ]
  }
}
```

### `GET /activities`
- **Owner**: T2
- **Description**: Paginated list of logged activities with optional category filter.

### `PATCH /activities/{id}`
- **Owner**: T2
- **Description**: Updates activity details and recalculates deterministic emission record.
- **Request**:
```json
{
  "quantity": 20.0,
  "metadata": { "mode": "metro", "duration_min": 35 }
}
```
- **Response**: Returns updated `activity` and recalculated `emission` record.

### `DELETE /activities/{id}`
- **Owner**: T2
- **Description**: Permanently deletes an activity log and cascades removal of associated emission record.

---

## 3. Footprint & Hotspots

### `GET /footprint/summary?period=month&ref_date=2026-11-01`
- **Owner**: T2
- **Response**:
```json
{
  "period": "month",
  "period_start": "2026-11-01",
  "period_end": "2026-11-30",
  "total_kg_co2e": 128.0,
  "basis": "estimated",
  "by_category": [
    { "category": "transport", "kg_co2e": 40.0, "share_pct": 31.3 },
    { "category": "electricity", "kg_co2e": 32.0, "share_pct": 25.0 },
    { "category": "food", "kg_co2e": 28.0, "share_pct": 21.9 },
    { "category": "shopping", "kg_co2e": 18.0, "share_pct": 14.1 },
    { "category": "waste", "kg_co2e": 10.0, "share_pct": 7.8 }
  ],
  "previous_period_total_kg": 135.0,
  "change_pct": -5.2,
  "target_kg": 100.0,
  "target_used_pct": 128.0,
  "confidence": 0.75,
  "confidence_label": "high",
  "activity_count": 41
}
```

### `GET /footprint/hotspots?period=month`
- **Owner**: T2
- **Response**:
```json
{
  "period": "month",
  "hotspots": [
    {
      "rank": 1,
      "category": "transport",
      "activity_key": "transport.car_petrol_km",
      "kg_co2e": 31.0,
      "share_pct": 24.2,
      "vs_previous_pct": 8.0,
      "why": "Largest single source this month"
    }
  ]
}
```

### `GET /footprint/explain/{emission_record_id}`
- **Owner**: T2
- **Description**: Returns formula, quantity, factor, source, and confidence derivation.

---

## 4. What-If Simulator

### `POST /simulations`
- **Owner**: T2
- **Request**:
```json
{
  "scenarios": [
    {
      "label": "Reduce AC usage by 1 h/day",
      "change_type": "reduce_quantity",
      "activity_key": "electricity.ac_hours",
      "params": { "delta_per_day": -1.0 }
    }
  ]
}
```
- **Response**:
```json
{
  "id": "sim-uuid",
  "baseline_kg_month": 42.0,
  "results": [
    {
      "label": "Reduce AC usage by 1 h/day",
      "projected_kg_month": 30.0,
      "saving_kg_month": 12.0,
      "saving_pct": 28.6,
      "basis": "estimated",
      "confidence": 0.6,
      "feasibility": { "difficulty": 2, "cost_level": 1 },
      "assumptions": [
        {
          "key": "ac_power_kw",
          "label": "AC power draw",
          "value": 1.5,
          "unit": "kW",
          "source": "editable default"
        }
      ]
    }
  ]
}
```

---

## 5. AI Recommendations & Adaptive Learning

### `POST /recommendations/generate`
- **Owner**: T3
- **Request**:
```json
{
  "max_items": 5,
  "focus_category": null
}
```
- **Response**:
```json
{
  "cycle": 3,
  "degraded": false,
  "items": [
    {
      "id": "rec-uuid",
      "action_key": "transport.shift_auto_to_bus",
      "title": "Replace 2 auto trips a week with the bus",
      "estimated_saving_kg_month": 14.0,
      "basis": "estimated",
      "difficulty": 2,
      "cost_level": 1,
      "priority_rank": 1,
      "score": 0.81,
      "score_breakdown": {
        "impact": 0.7,
        "preference": 0.9,
        "feasibility": 0.8,
        "goal_fit": 0.6,
        "cooldown_penalty": 0.0
      },
      "explanation": "Transport is your largest source and you accepted bus trips before.",
      "status": "proposed"
    }
  ],
  "adaptation": {
    "feedback_count": 12,
    "changes_since_last_cycle": [
      "Cycling twice a week ranked lower: skipped as not_practical"
    ]
  }
}
```

### `POST /recommendations/{id}/feedback`
- **Owner**: T3
- **Request**:
```json
{
  "response": "skipped",
  "reason_code": "not_practical",
  "note": "",
  "modified_params": null
}
```
- **Response**:
```json
{
  "recommendation": { "id": "rec-uuid", "status": "skipped" },
  "profile_update": {
    "feedback_count": 13,
    "summary": "Lower weight on cycling; difficulty tolerance 0.55"
  },
  "rewards": { "points_awarded": 5, "badges_awarded": [] }
}
```

### `GET /adaptive/profile`
- **Owner**: T3
- **Description**: Returns transparent view of what the rule-based statistical system has learned.

---

## 6. Measure & Impact Summary

### `GET /impact/summary?period=month`
- **Owner**: T2
- **Response**:
```json
{
  "estimated": {
    "accepted_actions": 3,
    "saving_kg_month": 26.0,
    "basis": "estimated"
  },
  "measured": {
    "available": true,
    "baseline_kg": 135.0,
    "current_kg": 128.0,
    "change_kg": -7.0,
    "basis": "measured",
    "note": "needs at least 14 days of data after the action"
  },
  "by_action": [
    {
      "action_key": "transport.shift_auto_to_bus",
      "estimated_kg_month": 14.0,
      "measured_kg_month": 6.5
    }
  ]
}
```

---

## 7. Chat & Rewards

### `POST /chat/messages`
- **Owner**: T3
- **Request**:
```json
{
  "session_id": null,
  "message": "Why is transport my biggest source?"
}
```
- **Response**:
```json
{
  "session_id": "chat-uuid",
  "reply": "Transport accounts for 31.3% (40.0 kg CO2e) of your 128.0 kg monthly footprint...",
  "degraded": false,
  "grounding": {
    "footprint_period": "2026-11",
    "factor_sources": ["CEA Baseline v19 (2024)", "ARAI / MoEFCC 2023"],
    "recommendation_ids": ["rec-uuid"]
  },
  "disclaimer": "Estimates based on published emission factors, not measured emissions."
}
```

### `GET /rewards/summary`
- **Owner**: T2
- **Response**:
```json
{
  "eco_score": 68,
  "points_balance": 120,
  "streaks": {
    "logging": { "current": 4, "longest": 9 }
  },
  "badges": [
    { "key": "first_log", "title": "First step", "awarded_at": "2026-11-02T08:00:00Z" }
  ]
}
```
