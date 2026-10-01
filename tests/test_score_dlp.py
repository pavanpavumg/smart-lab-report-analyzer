from fastapi.testclient import TestClient
from app.main import app
from app.schemas.report import Patient, TestResult
from app.services.dlp_service import dlp_service

client = TestClient(app)


def test_dlp_sanitization():
    patient = Patient(
        patient_name="Confidential Patient John Doe",
        age=45,
        gender="Male",
    )
    tests = [
        TestResult(
            test_name="Serum Creatinine",
            raw_test_name="Creatinine",
            test_id="CREATININE",
            value=2.4,
            raw_unit="mg/dL",
            status="HIGH",
            flag="RED_FLAG",
            profile="Kidney Profile",
        ),
        TestResult(
            test_name="Fast Blood Sugar",
            raw_test_name="FBS",
            test_id="GLUCOSE",
            value=95.0,
            raw_unit="mg/dL",
            status="NORMAL",
            flag="GREEN_FLAG",
            profile="Metabolic",
        ),
    ]

    sanitized = dlp_service.sanitize_clinical_payload(patient, tests)

    # Asserts that identifying patient name is completely stripped
    assert "patient_name" not in sanitized["patient"]
    assert "Confidential Patient John Doe" not in str(sanitized)
    assert sanitized["patient"]["age"] == 45
    assert sanitized["patient"]["gender"] == "Male"
    assert sanitized["deidentified_by_dlp"] is True
    assert len(sanitized["tests"]) == 2


def test_clinical_score_endpoint():
    payload = {
        "patient": {
            "patient_name": "Test Patient",
            "age": 52,
            "gender": "Female",
        },
        "tests": [
            {
                "test_name": "Serum Creatinine",
                "raw_test_name": "Creatinine",
                "test_id": "CREATININE",
                "value": 2.8,
                "raw_unit": "mg/dL",
                "status": "HIGH",
                "flag": "RED_FLAG",
                "profile": "Kidney Profile",
            },
            {
                "test_name": "Potassium",
                "raw_test_name": "K+",
                "test_id": "POTASSIUM",
                "value": 5.9,
                "raw_unit": "mmol/L",
                "status": "HIGH",
                "flag": "RED_FLAG",
                "profile": "Electrolyte Profile",
            },
            {
                "test_name": "Hemoglobin",
                "raw_test_name": "Hb",
                "test_id": "HEMOGLOBIN",
                "value": 13.5,
                "raw_unit": "g/dL",
                "status": "NORMAL",
                "flag": "GREEN_FLAG",
                "profile": "Complete Blood Count",
            },
        ],
    }

    response = client.post("/api/v1/score", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "score" in data
    assert 0 <= data["score"] <= 100
    assert "label" in data
    assert "clinical_summary" in data
    assert "organ_scores" in data
    assert "key_drivers" in data
    assert data["deidentified_by_dlp"] is True
    assert len(data["organ_scores"]) >= 2
    assert len(data["key_drivers"]) >= 1
