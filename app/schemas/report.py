from typing import Literal

from pydantic import BaseModel, Field


class Patient(BaseModel):
    patient_name: str | None = None
    age: int | None = None
    gender: Literal["Male", "Female", "Other", "Unknown"] = "Unknown"


class ReferenceRange(BaseModel):
    low: float | None = None
    high: float | None = None
    raw: str | None = None
    operator: str | None = None


class TestResult(BaseModel):
    # Requested public output contract
    test_name: str
    raw_test_name: str
    test_id: str
    loinc_code: str | None = None
    value: float | str | None = None
    raw_value: str | None = None
    raw_unit: str | None = None
    reference_range: ReferenceRange = Field(default_factory=ReferenceRange)
    status: Literal["LOW", "NORMAL", "HIGH", "UNKNOWN"] = "UNKNOWN"
    flag: Literal["RED_FLAG", "GREEN_FLAG", "UNKNOWN_FLAG"] = "UNKNOWN_FLAG"

    # Extraction audit fields; these help improve accuracy without changing the
    # core consumer-facing contract.
    profile: str = "Custom"
    method: str | None = None
    specimen: str | None = None
    page_number: int | None = None
    extraction_confidence: float | None = None
    source_text: str | None = None


class Profile(BaseModel):
    profile_name: str
    test_ids: list[str] = Field(default_factory=list)
    test_count: int = 0


class ValidationInfo(BaseModel):
    valid_blood_report: bool
    unsupported_pages: list[int] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    success: bool
    document_type: Literal["BLOOD_LAB", "NON_BLOOD_LAB", "NON_LAB", "MIXED_DOCUMENT"]
    document_confidence: float
    patient: Patient | None = None
    tests: list[TestResult] = Field(default_factory=list)
    custom_parameters: list[TestResult] = Field(default_factory=list)
    validation: ValidationInfo
    warnings: list[str] = Field(default_factory=list)
    # Keep profiles as the final summary block in the API response.
    profiles: list[Profile] = Field(default_factory=list)
