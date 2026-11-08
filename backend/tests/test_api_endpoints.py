import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def test_footprint_summary():
    response = client.get("/api/v1/footprint/summary?period=month")
    assert response.status_code == 200
    data = response.json()
    assert "total_kg_co2e" in data
    assert "by_category" in data
    assert data["total_kg_co2e"] > 0
    assert data["basis"] == "estimated"

def test_simulator_scenario():
    payload = {
        "scenarios": [
            {
                "label": "Reduce AC usage by 1 h/day",
                "change_type": "reduce_quantity",
                "activity_key": "electricity.ac_hours",
                "params": {"delta_per_day": -1.0}
            }
        ]
    }
    response = client.post("/api/v1/simulations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["saving_kg_month"] > 0

def test_recommendations_generate():
    payload = {"max_items": 3}
    response = client.post("/api/v1/recommendations/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 3
    assert "adaptation" in data
