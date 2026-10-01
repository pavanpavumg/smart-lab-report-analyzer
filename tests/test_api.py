from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_rejects_unsupported_extension():
    response = client.post(
        "/api/v1/analyze",
        files={"file": ("report.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
