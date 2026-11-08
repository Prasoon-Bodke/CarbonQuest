import pytest
from fastapi.testclient import TestClient
from app.main import app
from scripts.mint_dev_token import mint_token

client = TestClient(app)

USER_1 = "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa"
USER_2 = "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb"

headers_1 = {"Authorization": f"Bearer {mint_token(USER_1)}"}
headers_2 = {"Authorization": f"Bearer {mint_token(USER_2)}"}

def test_recommendation_ownership_and_conflict():
    # 1. User 1 generates recommendations
    gen_res = client.post(
        "/api/v1/recommendations/generate",
        json={"max_items": 3},
        headers=headers_1,
    )
    assert gen_res.status_code == 200
    items = gen_res.json()["items"]
    assert len(items) > 0
    rec_id = items[0]["id"]

    # 2. User 2 attempts to fetch explanation for User 1's recommendation -> 404
    exp_res = client.get(
        f"/api/v1/recommendations/{rec_id}/explanation",
        headers=headers_2,
    )
    assert exp_res.status_code == 404

    # 3. User 2 attempts to submit feedback on User 1's recommendation -> 404
    fb_res_cross = client.post(
        f"/api/v1/recommendations/{rec_id}/feedback",
        json={"response": "accepted"},
        headers=headers_2,
    )
    assert fb_res_cross.status_code == 404

    # 4. User 1 successfully submits feedback on own recommendation -> 200
    fb_res_own = client.post(
        f"/api/v1/recommendations/{rec_id}/feedback",
        json={"response": "accepted"},
        headers=headers_1,
    )
    assert fb_res_own.status_code == 200
    assert fb_res_own.json()["recommendation"]["status"] == "accepted"

    # 5. User 1 attempts duplicate feedback on already answered recommendation -> 409
    dup_res = client.post(
        f"/api/v1/recommendations/{rec_id}/feedback",
        json={"response": "skipped", "reason_code": "not_practical"},
        headers=headers_1,
    )
    assert dup_res.status_code == 409
