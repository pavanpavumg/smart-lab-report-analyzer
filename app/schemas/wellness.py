from typing import Any, Literal
from pydantic import BaseModel, Field


class OrganSystemScore(BaseModel):
    system: str = Field(description="Name of the physiological organ system (e.g., Kidney / Renal, Liver / Hepatic, Cardiovascular / Lipid, Metabolic / Glycemic)")
    score: int = Field(ge=0, le=100, description="Health score from 0 (critical) to 100 (optimal)")
    status: Literal["OPTIMAL", "ELEVATED_RISK", "CRITICAL"]
    primary_concern: str | None = Field(default=None, description="Clinical concern or finding if abnormal")


class BiomarkerDriver(BaseModel):
    test_name: str
    impact: Literal["HIGH", "MODERATE", "LOW"]
    explanation: str = Field(description="Why this biomarker impacted the wellness score")


class InferredBiomarker(BaseModel):
    test_name: str
    inferred_status: Literal["NORMAL", "HIGH", "LOW", "CRITICAL"]
    standard_range: str = Field(description="Universal biological reference interval used (e.g. '0.7 - 1.3 mg/dL')")
    clinical_rationale: str = Field(description="Clinical reasoning explaining why this value is normal, high, or low")


class ClinicalWellnessScoreResponse(BaseModel):
    score: int = Field(ge=0, le=100, description="Overall holistic wellness score")
    label: Literal["Excellent", "Good", "Fair", "Attention Required", "Critical"]
    color: Literal["green", "light-green", "amber", "rose"]
    clinical_summary: str = Field(description="Doctor-level clinical interpretation of the laboratory findings")
    organ_scores: list[OrganSystemScore] = Field(default_factory=list)
    key_drivers: list[BiomarkerDriver] = Field(default_factory=list)
    inferred_biomarkers: list[InferredBiomarker] = Field(default_factory=list, description="Tests with missing reference ranges whose clinical status was resolved via universal medical reference standards")
    confidence: float = Field(ge=0.0, le=1.0, default=0.95)
    deidentified_by_dlp: bool = Field(default=True, description="Indicates whether PHI was scrubbed by Cloud DLP before LLM processing")


class ScorePatient(BaseModel):
    name: str | None = None
    patient_name: str | None = None
    age: int | float | None = None
    gender: str | None = "Unknown"


class ScoreTestItem(BaseModel):
    test_name: str
    raw_test_name: str | None = None
    test_id: str | None = None
    value: float | str | None = None
    raw_value: str | None = None
    raw_unit: str | None = None
    reference_range: Any = None
    status: str | None = "UNKNOWN"
    flag: str | None = None
    profile: str | None = "General"


class ScoreRequest(BaseModel):
    patient: ScorePatient | None = None
    tests: list[ScoreTestItem] = Field(default_factory=list)
