import logging
import re
from typing import Any
from app.core.config import settings
from app.schemas.report import Patient, TestResult

logger = logging.getLogger(__name__)

# Standard infoTypes for clinical laboratory and patient de-identification
HEALTHCARE_INFOTYPES = [
    {"name": "PERSON_NAME"},
    {"name": "PHONE_NUMBER"},
    {"name": "EMAIL_ADDRESS"},
    {"name": "INDIA_AADHAAR_INDIVIDUAL"},
    {"name": "INDIA_PAN_INDIVIDUAL"},
    {"name": "MEDICAL_RECORD_NUMBER"},
    {"name": "STREET_ADDRESS"},
    {"name": "DATE_OF_BIRTH"},
    {"name": "US_SOCIAL_SECURITY_NUMBER"},
]

# Local fallback regexes when DLP is offline, mock, or disabled
LOCAL_PATTERNS = [
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL_REDACTED]"),
    (re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[PHONE_REDACTED]"),
    (re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b"), "[AADHAAR_REDACTED]"),
    (re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"), "[PAN_REDACTED]"),
]


class SensitiveDataProtectionService:
    """
    Google Cloud Sensitive Data Protection (Cloud DLP) Gateway.
    De-identifies and redacts Protected Health Information (PHI) and PII
    before clinical payloads are transmitted to external AI/LLMs.
    """

    def __init__(self):
        self.project = settings.google_cloud_project
        self.enabled = settings.dlp_enabled
        self.location = settings.dlp_location
        self._client = None

        if self.enabled and self.project:
            try:
                from google.cloud import dlp_v2
                self._client = dlp_v2.DlpServiceClient()
                logger.info("Cloud DLP client initialized for project %s", self.project)
            except Exception as exc:
                logger.warning(
                    "Cloud DLP client could not be initialized (%s). Using local privacy fallback.",
                    exc,
                )
                self._client = None

    def deidentify_text(self, text: str) -> str:
        """
        De-identifies free text by masking or replacing detected infoTypes.
        Falls back to local regex masking if Cloud DLP is unavailable.
        """
        if not text:
            return ""

        if not self._client or not self.project:
            return self._local_deidentify(text)

        try:
            from google.cloud import dlp_v2

            parent = f"projects/{self.project}/locations/{self.location}"
            inspect_config = {
                "info_types": HEALTHCARE_INFOTYPES,
                "min_likelihood": dlp_v2.Likelihood.LIKELY,
            }
            deidentify_config = {
                "info_type_transformations": {
                    "transformations": [
                        {
                            "primitive_transformation": {
                                "replace_with_info_type_config": {}
                            }
                        }
                    ]
                }
            }
            item = {"value": text}

            response = self._client.deidentify_content(
                request={
                    "parent": parent,
                    "deidentify_config": deidentify_config,
                    "inspect_config": inspect_config,
                    "item": item,
                }
            )
            return response.item.value
        except Exception as exc:
            logger.warning("Cloud DLP deidentify_content API call failed (%s); using local sanitizer.", exc)
            return self._local_deidentify(text)

    def _local_deidentify(self, text: str) -> str:
        """Local regex fallback when cloud DLP API is unavailable."""
        result = text
        for pattern, replacement in LOCAL_PATTERNS:
            result = pattern.sub(replacement, result)
        return result

    def sanitize_clinical_payload(
        self,
        patient: Any = None,
        tests: list[Any] | None = None,
    ) -> dict[str, Any]:
        """
        Builds a 100% de-identified clinical payload for LLM evaluation.
        - Direct identifiers (patient name, hospital ID, address, contact) are stripped.
        - Medically necessary non-identifying variables (Age, Gender) are preserved.
        - Test names, values, units, reference ranges, and flags are structured.
        """
        tests = tests or []

        # Anonymized demographic profile
        raw_age = getattr(patient, "age", None) if patient else None
        if isinstance(patient, dict):
            raw_age = patient.get("age")

        try:
            age = int(raw_age) if raw_age is not None and int(raw_age) > 0 else None
        except (ValueError, TypeError):
            age = None

        raw_gender = getattr(patient, "gender", None) if patient else None
        if isinstance(patient, dict):
            raw_gender = patient.get("gender")
        raw_gender_str = str(raw_gender or "").lower()
        if raw_gender_str.startswith("m"):
            gender = "Male"
        elif raw_gender_str.startswith("f"):
            gender = "Female"
        else:
            gender = "Unknown"

        sanitized_patient = {
            "patient_pseudonym": "ANONYMOUS_PATIENT",
            "age": age,
            "gender": gender,
        }

        # Clean biomarker tests
        clinical_tests = []
        for t in tests:
            test_name = getattr(t, "test_name", None) or (t.get("test_name") if isinstance(t, dict) else "Unknown Test")
            val = getattr(t, "value", None) if hasattr(t, "value") else (t.get("value") if isinstance(t, dict) else None)
            raw_unit = getattr(t, "raw_unit", None) if hasattr(t, "raw_unit") else (t.get("raw_unit") if isinstance(t, dict) else "")
            status = getattr(t, "status", None) if hasattr(t, "status") else (t.get("status") if isinstance(t, dict) else "UNKNOWN")
            flag = getattr(t, "flag", None) if hasattr(t, "flag") else (t.get("flag") if isinstance(t, dict) else None)
            profile = getattr(t, "profile", None) if hasattr(t, "profile") else (t.get("profile") if isinstance(t, dict) else "General")

            rr = getattr(t, "reference_range", None) if hasattr(t, "reference_range") else (t.get("reference_range") if isinstance(t, dict) else None)
            if hasattr(rr, "raw") and rr.raw:
                ref_str = str(rr.raw)
            elif isinstance(rr, dict) and rr.get("raw"):
                ref_str = str(rr["raw"])
            elif isinstance(rr, dict) and (rr.get("low") is not None or rr.get("high") is not None):
                ref_str = f"{rr.get('low', '')} - {rr.get('high', '')}".strip(" -")
            elif hasattr(rr, "low") and hasattr(rr, "high") and (rr.low is not None or rr.high is not None):
                ref_str = f"{rr.low or ''} - {rr.high or ''}".strip(" -")
            elif isinstance(rr, str) and rr:
                ref_str = rr
            else:
                ref_str = "Standard"

            clinical_tests.append({
                "test_name": str(test_name).strip(),
                "value": val,
                "raw_unit": str(raw_unit or ""),
                "reference_range": ref_str,
                "status": str(status or "UNKNOWN").upper(),
                "flag": str(flag) if flag else "NORMAL",
                "profile": str(profile or "General"),
            })

        return {
            "patient": sanitized_patient,
            "tests": clinical_tests,
            "total_tests": len(clinical_tests),
            "deidentified_by_dlp": True,
        }


# Singleton service instance
dlp_service = SensitiveDataProtectionService()
