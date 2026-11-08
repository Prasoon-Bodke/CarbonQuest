import pytest
from fastapi.testclient import TestClient
from app.main import app
from scripts.mint_dev_token import mint_token

client = TestClient(app)

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"

headers_a = {"Authorization": f"Bearer {mint_token(USER_A)}"}
headers_b = {"Authorization": f"Bearer {mint_token(USER_B)}"}

def test_tenant_isolation_activities():
    # User A creates an activity
    res_a = client.post(
        "/api/v1/activities",
        json={
            "category": "transport",
            "activity_key": "transport.bus_km",
            "quantity": 10.0,
            "unit": "km",
            "occurred_on": "2026-11-01",
        },
        headers=headers_a,
    )
    assert res_a.status_code == 200
    act_a_id = res_a.json()["activity"]["id"]

    # User B lists activities -> should NOT see User A's activity
    list_b = client.get("/api/v1/activities", headers=headers_b)
    assert list_b.status_code == 200
    item_ids = [item["id"] for item in list_b.json()["items"]]
    assert act_a_id not in item_ids

    # User B attempts to patch User A's activity -> 404
    patch_b = client.patch(
        f"/api/v1/activities/{act_a_id}",
        json={"quantity": 50.0},
        headers=headers_b,
    )
    assert patch_b.status_code == 404

    # User B attempts to delete User A's activity -> 404
    del_b = client.delete(
        f"/api/v1/activities/{act_a_id}",
        headers=headers_b,
    )
    assert del_b.status_code == 404

    # User A can delete own activity -> 200
    del_a = client.delete(
        f"/api/v1/activities/{act_a_id}",
        headers=headers_a,
    )
    assert del_a.status_code == 200
