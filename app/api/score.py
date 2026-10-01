import logging
from fastapi import APIRouter, HTTPException

from app.schemas.wellness import ClinicalWellnessScoreResponse, ScoreRequest
from app.services.dlp_service import dlp_service
from app.services.llm_score_service import llm_score_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["clinical-score"])


@router.post("/score", response_model=ClinicalWellnessScoreResponse)
async def calculate_clinical_wellness_score(
    payload: ScoreRequest,
) -> ClinicalWellnessScoreResponse:
    """
    Evaluates patient laboratory biomarkers using an LLM Clinical Scoring Engine.
    Prior to LLM inference, the payload is sanitized through Google Cloud DLP
    to de-identify PHI/PII (patient names, MRNs, phone numbers, addresses).
    """
    try:
        # Step 1: Privacy Gateway (Cloud DLP / Sensitive Data Protection)
        sanitized_payload = dlp_service.sanitize_clinical_payload(
            patient=payload.patient,
            tests=payload.tests,
        )

        # Step 2: Clinical Scoring via LLM (with deterministic fallback)
        score_response = llm_score_service.calculate_wellness_score(sanitized_payload)

        return score_response
    except Exception as exc:
        logger.exception("Error calculating clinical wellness score: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate clinical wellness score: {str(exc)}",
        ) from exc
