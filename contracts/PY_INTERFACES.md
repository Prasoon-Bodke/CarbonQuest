# Frozen Python Interfaces (`contracts/PY_INTERFACES.md`)

This document defines the frozen Python function signatures governing in-process communication between Backend/Carbon Services (T2) and the AI/Adaptive Module (T3).

> **Architectural Law**: Direction is **T3 → T2 only**. T2 never imports `app.ai` except for `main.py` mounting `app.ai.router`.

---

## 1. Services Exposed by T2 (Carbon & Simulator Engine)

### `app.services.carbon.impact.estimate_saving`
```python
def estimate_saving(
    db: Session,
    user_id: str,
    action_key: str,
    params: dict | None = None
) -> SavingEstimate:
    """
    Computes deterministic projected savings for a candidate action.
    Returns SavingEstimate with:
      - action_key: str
      - baseline_kg_month: float
      - projected_kg_month: float
      - saving_kg_month: float
      - basis: str = 'estimated'
      - confidence: float (0.0 to 1.0)
      - assumptions: list[dict{key, label, value, unit, source}]
      - factor_ids: list[str]
    """
```

### `app.services.carbon.impact.get_footprint_summary`
```python
def get_footprint_summary(
    db: Session,
    user_id: str,
    period: str = "month",
    ref_date: str | None = None
) -> dict:
    """
    Aggregates footprint total, category shares, and confidence label.
    """
```

### `app.services.carbon.impact.get_hotspots`
```python
def get_hotspots(
    db: Session,
    user_id: str,
    period: str = "month",
    top_n: int = 3
) -> list[dict]:
    """
    Ranks top emission activities for the user relative to own baseline.
    """
```

### `app.services.carbon.impact.get_action_catalog`
```python
def get_action_catalog(db: Session) -> list[ActionCatalog]:
    """
    Returns active action definitions from database catalog.
    """
```

### `app.services.carbon.impact.get_factor_sources`
```python
def get_factor_sources(db: Session, activity_keys: list[str]) -> list[dict]:
    """
    Returns verified citations (name, URL, year, factor value, unit) for grounding.
    """
```

---

## 2. Rewards Hook Exposed by T2

### `app.services.rewards.service.on_event`
```python
def on_event(
    db: Session,
    user_id: str,
    event: str,
    ref: Any = None
) -> RewardResult:
    """
    Cross-module hook: Called by T3 after feedback or action log submission so
    points, streaks, and badges update atomically without T3 directly mutating reward tables.
    Returns:
      - points_awarded: int
      - badges_awarded: list[str]
    """
```

---

## 3. Router Exposed by T3

### `app.ai.router.router`
```python
router: fastapi.APIRouter
"""
FastAPI APIRouter hosting:
- POST /recommendations/generate
- GET /recommendations
- GET /recommendations/{id}/explanation
- POST /recommendations/{id}/feedback
- POST /action-logs
- GET /action-logs
- GET /adaptive/profile
- GET /adaptive/metrics
- POST /chat/messages
- GET /chat/sessions
- GET /chat/sessions/{id}

T2 mounts this router onto app in app/main.py. T3 never edits main.py.
"""
```
