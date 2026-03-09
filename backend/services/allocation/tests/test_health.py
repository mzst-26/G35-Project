from fastapi.testclient import TestClient

from allocation_service.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "allocation"


def test_allocate_endpoint() -> None:
    payload = {
        "job_id": "job-1",
        "trade_id": "electrician",
        "workers_needed": 2,
        "location": {
            "lat": 51.5074,
            "lng": -0.1278,
        },
    }

    response = client.post("/allocate", json=payload)
    assert response.status_code == 200
    assert len(response.json()["candidates"]) == 2
