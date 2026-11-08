import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from scripts.mint_dev_token import mint_token

client = TestClient(app)

def test_visible_adaptation_lifecycle():
    user_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {mint_token(user_id)}"}

    # 1. Cycle 1: Generate initial recommendations
    res1 = client.post(
        "/api/v1/recommendations/generate",
        json={"max_items": 5},
        headers=headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["cycle"] == 1
    items1 = data1["items"]
    assert len(items1) > 0

    # Pick the top proposed item from Cycle 1
    top_item = items1[0]
    top_rec_id = top_item["id"]
    top_action_key = top_item["action_key"]
    top_score_c1 = top_item["score"]

    # Verify initial adaptation message
    assert len(data1["adaptation"]["changes_since_last_cycle"]) > 0

    # 2. Skip this action with reason 'not_practical'
    fb_res = client.post(
        f"/api/v1/recommendations/{top_rec_id}/feedback",
        json={
            "response": "skipped",
            "reason_code": "not_practical",
            "note": "Route is too steep and dangerous for daily cycling",
        },
        headers=headers,
    )
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["recommendation"]["status"] == "skipped"
    assert "difficulty tolerance" in fb_data["profile_update"]["summary"].lower()

    # 3. Cycle 2: Generate next cycle of recommendations
    res2 = client.post(
        "/api/v1/recommendations/generate",
        json={"max_items": 5},
        headers=headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cycle"] == 2
    items2 = data2["items"]

    # Verify visible adaptation in adaptation changes note
    changes = data2["adaptation"]["changes_since_last_cycle"]
    assert any("not_practical" in c for c in changes), f"Expected 'not_practical' in changes: {changes}"

    # Verify that the skipped item either dropped out of top rank or had its score penalized
    matching_c2 = [it for it in items2 if it["action_key"] == top_action_key]
    if matching_c2:
        c2_item = matching_c2[0]
        # Cooldown penalty should be active in breakdown
        assert c2_item["score_breakdown"]["cooldown_penalty"] > 0.0
        assert c2_item["score"] < top_score_c1

    # 4. Check adaptive profile endpoint
    prof_res = client.get("/api/v1/adaptive/profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["feedback_count"] == 1
    assert prof["difficulty_tolerance"] < 0.60
    assert top_action_key in prof["action_stats"]
    assert prof["action_stats"][top_action_key]["last_response"] == "skipped"

    # 5. Check adaptive metrics endpoint
    metrics_res = client.get("/api/v1/adaptive/metrics", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["user_id"] == user_id
    assert len(metrics["trend"]) >= 1
    assert metrics["trend"][0]["cycle"] == 1
    assert metrics["trend"][0]["total_actions"] == 1
