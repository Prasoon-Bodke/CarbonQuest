import pytest
from fastapi.testclient import TestClient
from app.main import app
from scripts.mint_dev_token import mint_token, DEMO_USER_ID

client = TestClient(app)
auth_headers = {"Authorization": f"Bearer {mint_token(DEMO_USER_ID)}"}

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def test_auth_protection_without_token():
    # Calling protected endpoint without token must return 401
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"

def test_profile_endpoints():
    # GET /me
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == DEMO_USER_ID

    # PUT /me
    update_res = client.put(
        "/api/v1/me",
        json={"display_name": "Aarav Sharma Updated", "monthly_target_kg": 95.0},
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["monthly_target_kg"] == 95.0

    # POST /me/consents
    consent_res = client.post(
        "/api/v1/me/consents",
        json={"consent_tracking": True, "consent_leaderboard": True},
        headers=auth_headers,
    )
    assert consent_res.status_code == 200
    assert consent_res.json()["consent_tracking"] is True

def test_onboarding_cp1_idempotency():
    payload = {
        "display_name": "Aarav Sharma",
        "monthly_target_kg": 100.0,
        "habits": [
            {
                "category": "transport",
                "activity_key": "transport.bus_km",
                "frequency": "weekly",
                "quantity": 10.0,
                "unit": "km",
                "metadata": {"mode": "bus"},
            }
        ],
    }

    # First call
    res1 = client.post("/api/v1/me/onboarding", json=payload, headers=auth_headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "ok"
    assert data1["profile"]["onboarding_done"] is True

    # Second call should be strictly idempotent (0 duplicate activities created)
    res2 = client.post("/api/v1/me/onboarding", json=payload, headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["activities_created"] == 0

def test_activity_lifecycle_post_patch_delete():
    # 1. Create activity
    act_payload = {
        "category": "transport",
        "activity_key": "transport.metro_km",
        "quantity": 15.0,
        "unit": "km",
        "occurred_on": "2026-11-04",
        "source": "manual",
        "metadata": {"mode": "metro", "duration_min": 25},
    }
    create_res = client.post("/api/v1/activities", json=act_payload, headers=auth_headers)
    assert create_res.status_code == 200
    data = create_res.json()
    act_id = data["activity"]["id"]
    # 15 km * 0.035 kg/km = 0.525 kg
    assert data["emission"]["kg_co2e"] == 0.525

    # 2. Duplicate detection (409 Conflict)
    dup_res = client.post("/api/v1/activities", json=act_payload, headers=auth_headers)
    assert dup_res.status_code == 409

    # 3. Patch activity (recalculates emission record)
    patch_payload = {
        "quantity": 20.0,
    }
    patch_res = client.patch(f"/api/v1/activities/{act_id}", json=patch_payload, headers=auth_headers)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["activity"]["quantity"] == 20.0
    # 20 km * 0.035 kg/km = 0.7 kg
    assert patch_data["emission"]["kg_co2e"] == 0.7

    # 4. Delete activity
    del_res = client.delete(f"/api/v1/activities/{act_id}", headers=auth_headers)
    assert del_res.status_code == 200

def test_consent_required_check():
    # Turn off consent
    client.post("/api/v1/me/consents", json={"consent_tracking": False, "consent_leaderboard": False}, headers=auth_headers)

    # Attempt logging activity -> 403 Forbidden
    act_payload = {
        "category": "electricity",
        "activity_key": "electricity.grid_kwh",
        "quantity": 5.0,
        "unit": "kWh",
        "occurred_on": "2026-11-05",
    }
    res = client.post("/api/v1/activities", json=act_payload, headers=auth_headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "CONSENT_REQUIRED"

    # Restore consent
    client.post("/api/v1/me/consents", json={"consent_tracking": True, "consent_leaderboard": True}, headers=auth_headers)

def test_footprint_summary():
    response = client.get("/api/v1/footprint/summary?period=month", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_kg_co2e" in data
    assert "by_category" in data
    assert data["basis"] == "estimated"
    assert "target_kg" in data
    assert "target_used_pct" in data

def test_footprint_hotspots():
    response = client.get("/api/v1/footprint/hotspots?period=month", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "hotspots" in data
    if data["hotspots"]:
        first = data["hotspots"][0]
        assert "rank" in first
        assert "share_pct" in first
        assert "why" in first
        assert first["category"] == "transport"  # Transport hotspot invariant!

def test_simulator_scenario():
    payload = {
        "scenarios": [
            {
                "label": "Reduce AC usage by 1 h/day",
                "change_type": "reduce_quantity",
                "activity_key": "electricity.ac_hours",
                "params": {"delta_per_day": -1.0},
            }
        ]
    }
    response = client.post("/api/v1/simulations", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    res = data["results"][0]
    # Check exact math invariant: saving == baseline - projected
    assert res["saving_kg_month"] == round(data["baseline_kg_month"] - res["projected_kg_month"], 1)

def test_impact_summary():
    response = client.get("/api/v1/impact/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "estimated" in data
    assert "measured" in data
    assert data["measured"]["available"] is False  # Prototype scope guarantee
