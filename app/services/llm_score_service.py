import json
import logging
import os
import re
from typing import Any
from app.core.config import settings
from app.schemas.wellness import (
    BiomarkerDriver,
    ClinicalWellnessScoreResponse,
    InferredBiomarker,
    OrganSystemScore,
)

logger = logging.getLogger(__name__)

# Standard biological reference intervals for deterministic fallback
STANDARD_REFERENCE_INTERVALS: dict[str, tuple[float, float, str, str]] = {
    "creatinine": (0.6, 1.2, "mg/dL", "Normal renal filtration reference range (0.6 - 1.2 mg/dL)"),
    "urea": (15.0, 45.0, "mg/dL", "Standard biological blood urea limit (15.0 - 45.0 mg/dL)"),
    "bun": (7.0, 20.0, "mg/dL", "Blood urea nitrogen standard interval (7.0 - 20.0 mg/dL)"),
    "uric_acid": (3.5, 7.2, "mg/dL", "Serum uric acid standard physiological range (3.5 - 7.2 mg/dL)"),
    "fasting_glucose": (70.0, 100.0, "mg/dL", "Fasting blood glucose standard non-diabetic range (70 - 100 mg/dL)"),
    "random_glucose": (70.0, 140.0, "mg/dL", "Random blood glucose standard physiological threshold (70 - 140 mg/dL)"),
    "glucose": (70.0, 140.0, "mg/dL", "Standard physiological glucose range (70 - 140 mg/dL)"),
    "hba1c": (4.0, 5.6, "%", "Glycated hemoglobin non-diabetic interval (4.0 - 5.6 %)"),
    "total_cholesterol": (125.0, 200.0, "mg/dL", "Desirable total cholesterol range (125 - 200 mg/dL)"),
    "hdl": (40.0, 60.0, "mg/dL", "Cardioprotective HDL desirable interval (40 - 60 mg/dL)"),
    "ldl": (0.0, 100.0, "mg/dL", "Optimal LDL cholesterol limit (< 100 mg/dL)"),
    "triglycerides": (0.0, 150.0, "mg/dL", "Normal fasting triglycerides threshold (< 150 mg/dL)"),
    "total_bilirubin": (0.2, 1.2, "mg/dL", "Hepatic bilirubin normal excretion limit (0.2 - 1.2 mg/dL)"),
    "direct_bilirubin": (0.0, 0.3, "mg/dL", "Conjugated direct bilirubin normal limit (< 0.3 mg/dL)"),
    "ast": (10.0, 40.0, "U/L", "Aspartate aminotransferase standard range (10 - 40 U/L)"),
    "alt": (7.0, 56.0, "U/L", "Alanine aminotransferase standard range (7 - 56 U/L)"),
    "alp": (44.0, 147.0, "U/L", "Alkaline phosphatase standard range (44 - 147 U/L)"),
    "ggt": (9.0, 48.0, "U/L", "Gamma-glutamyl transferase normal range (9 - 48 U/L)"),
    "total_protein": (6.0, 8.3, "g/dL", "Serum total protein standard interval (6.0 - 8.3 g/dL)"),
    "albumin": (3.5, 5.0, "g/dL", "Serum albumin normal synthesis level (3.5 - 5.0 g/dL)"),
    "hemoglobin": (12.0, 17.5, "g/dL", "Standard physiological hemoglobin range (12.0 - 17.5 g/dL)"),
    "hematocrit": (36.0, 50.0, "%", "Standard packed cell volume / hematocrit range (36 - 50 %)"),
    "wbc": (4000.0, 11000.0, "/uL", "Total leukocyte count standard range (4000 - 11000 /uL)"),
    "platelets": (150000.0, 450000.0, "/uL", "Platelet count standard physiological count (150,000 - 450,000 /uL)"),
    "mcv": (80.0, 100.0, "fL", "Mean corpuscular volume standard range (80 - 100 fL)"),
    "mch": (27.0, 33.0, "pg", "Mean corpuscular hemoglobin standard range (27 - 33 pg)"),
    "mchc": (32.0, 36.0, "g/dL", "MCHC standard cellular concentration (32 - 36 g/dL)"),
    "esr": (0.0, 20.0, "mm/hr", "Erythrocyte sedimentation rate standard limit (0 - 20 mm/hr)"),
    "tsh": (0.4, 4.5, "uIU/mL", "Thyroid stimulating hormone standard range (0.4 - 4.5 uIU/mL)"),
    "calcium": (8.5, 10.5, "mg/dL", "Serum calcium normal concentration (8.5 - 10.5 mg/dL)"),
    "sodium": (135.0, 145.0, "mEq/L", "Serum sodium electrolyte balance (135 - 145 mEq/L)"),
    "potassium": (3.5, 5.0, "mEq/L", "Serum potassium standard biological interval (3.5 - 5.0 mEq/L)"),
    "chloride": (96.0, 106.0, "mEq/L", "Serum chloride standard electrolyte balance (96 - 106 mEq/L)"),
    "vitamin_d": (30.0, 100.0, "ng/mL", "25-OH Vitamin D sufficiency threshold (30 - 100 ng/mL)"),
    "vitamin_b12": (200.0, 900.0, "pg/mL", "Vitamin B12 normal neurological range (200 - 900 pg/mL)"),
    "crp": (0.0, 5.0, "mg/L", "C-Reactive Protein standard normal range (< 5.0 mg/L)"),
    "ldh": (140.0, 280.0, "U/L", "Lactate dehydrogenase standard cellular turnover interval (140 - 280 U/L)"),
    "shbg": (18.0, 114.0, "nmol/L", "Sex hormone binding globulin standard adult interval (18 - 114 nmol/L)"),
    "dhea_s": (0.35, 4.60, "µg/mL", "Serum DHEA-S standard male physiological range (0.35 - 4.60 µg/mL)"),
    "amh": (1.0, 4.0, "ng/mL", "Anti-Mullerian hormone normal ovarian reserve interval (1.0 - 4.0 ng/mL)"),
    "nt_probnp": (0.0, 125.0, "pg/mL", "NT-proBNP normal myocardial stress threshold (< 125 pg/mL)"),
    "bile_acid": (0.0, 10.0, "µmol/L", "Total serum bile acid normal fasting threshold (< 10 µmol/L)"),
    "ca_15_3": (0.0, 30.0, "U/mL", "Cancer antigen 15-3 normal non-elevated threshold (< 30 U/mL)"),
    "papp_a": (0.5, 2.5, "mIU/mL", "PAPP-A maternal serum normal physiological interval (0.5 - 2.5 mIU/mL)"),
    "papp_a_mom": (0.5, 2.0, "MoM", "PAPP-A multiple of median normal screening range (0.5 - 2.0 MoM)"),
    "free_beta_hcg": (10.0, 150.0, "ng/mL", "First trimester free beta-hCG physiological median range (10 - 150 ng/mL)"),
    "free_beta_hcg_mom": (0.5, 2.0, "MoM", "Free beta-hCG multiple of median normal screening interval (0.5 - 2.0 MoM)"),
    "nt_value": (0.0, 3.0, "mm", "Nuchal translucency normal ultrasound threshold (< 3.0 mm)"),
    "nt_mom": (0.4, 2.0, "MoM", "Nuchal translucency multiple of median normal interval (< 2.0 MoM)"),
    "cells_analyzed": (20.0, 50.0, "", "Standard cytogenetic metaphase cell count (>= 20 cells)"),
    "cells_karyotyped": (5.0, 20.0, "", "Standard banded metaphase karyotype count (>= 5 cells)"),
}

SYSTEM_PROMPT = """You are an expert Board-Certified Clinical Pathologist and Medical Intelligence Scoring System.
You are evaluating a 100% de-identified laboratory biomarker panel.

Task:
Calculate a Holistic Clinical Wellness Score (0 to 100), resolve any missing reference ranges, and provide an organ-system breakdown with actionable clinical insights.

Clinical Rules & Unknown Resolution:
1. Base score starts at 100.
2. Life-critical / acute biomarkers (e.g. Potassium > 5.5, Creatinine > 2.0, Critical Troponin, severe Hyponatremia) carry heavy deductions (-15 to -25 points).
3. Chronic / lifestyle indicators (e.g. Borderline Cholesterol, mild Vitamin D or B12 deficiency) carry moderate deductions (-3 to -8 points).
4. Correlated comorbid panels (e.g. High Glucose + High HbA1c + High Triglycerides) compound severity.
5. If all evaluated tests are within normal biological limits, score should be between 92 and 100.
6. CRITICAL - Resolution of Tests with "UNKNOWN" Status / Missing Reference Ranges:
   For any biomarker where status is "UNKNOWN" or reference_range is null/empty:
   - Use standard clinical pathology biological reference intervals (Tietz/Mayo Clinic/WHO standards) adjusted for the patient's age and gender.
   - Infer whether the reported numeric value and unit are "NORMAL", "HIGH", "LOW", or "CRITICAL".
   - Include this evaluation in both your score deductions and organ system ratings.
   - Return all resolved tests in the "inferred_biomarkers" array.
   - For tests that cannot be clinically inferred (e.g., non-numeric notes or uninterpretable values), exclude them from the score denominator rather than assuming they are normal.

Output Schema:
You MUST return ONLY valid JSON matching this exact structure:
{
  "score": <int between 0 and 100>,
  "label": <"Excellent" | "Good" | "Fair" | "Attention Required" | "Critical">,
  "color": <"green" | "light-green" | "amber" | "rose">,
  "clinical_summary": <string: 2-3 sentence doctor-level clinical interpretation>,
  "organ_scores": [
    {
      "system": <string, e.g. "Kidney / Renal", "Liver / Hepatic", "Cardiovascular / Lipid", "Metabolic / Glycemic">,
      "score": <int between 0 and 100>,
      "status": <"OPTIMAL" | "ELEVATED_RISK" | "CRITICAL">,
      "primary_concern": <string or null>
    }
  ],
  "key_drivers": [
    {
      "test_name": <string>,
      "impact": <"HIGH" | "MODERATE" | "LOW">,
      "explanation": <string>
    }
  ],
  "inferred_biomarkers": [
    {
      "test_name": <string>,
      "inferred_status": <"NORMAL" | "HIGH" | "LOW" | "CRITICAL">,
      "standard_range": <string, e.g. "0.7 - 1.3 mg/dL">,
      "clinical_rationale": <string, e.g. "Value of 1.1 mg/dL is within normal adult biological limits.">
    }
  ],
  "confidence": <float between 0.8 and 1.0>
}
"""


class LLMClinicalScoreService:
    """
    Evaluates de-identified clinical lab payloads using Google Gemini.
    Provides automatic fallback to a deterministic medical scoring engine.
    """

    def __init__(self):
        self._client = None
        self._init_client()

    def _init_client(self):
        from dotenv import load_dotenv
        load_dotenv(override=True)
        api_key = os.environ.get("GEMINI_API_KEY") or settings.gemini_api_key
        if api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
                logger.info("Google GenAI client initialized with API key.")
            except Exception as exc:
                logger.warning("Could not initialize Google GenAI client: %s", exc)
                self._client = None
        elif settings.google_cloud_project:
            try:
                from google import genai
                self._client = genai.Client(
                    vertexai=True,
                    project=settings.google_cloud_project,
                    location="us-central1",
                )
                logger.info("Google GenAI client initialized via Vertex AI / ADC.")
            except Exception as exc:
                logger.info("Google GenAI client not initialized via ADC (%s); using deterministic engine.", exc)
                self._client = None

    def calculate_wellness_score(self, sanitized_payload: dict[str, Any]) -> ClinicalWellnessScoreResponse:
        """
        Calculates the clinical wellness score.
        Attempts Gemini LLM inference first, falling back to deterministic clinical scoring.
        """
        if not self._client:
            self._init_client()

        if self._client:
            try:
                return self._call_gemini(sanitized_payload)
            except Exception as exc:
                logger.warning("Gemini LLM inference failed (%s); falling back to deterministic scoring engine.", exc)

        return self._deterministic_clinical_score(sanitized_payload)

    def _call_gemini(self, sanitized_payload: dict[str, Any]) -> ClinicalWellnessScoreResponse:
        """Calls Gemini with structured JSON output."""
        model_name = settings.gemini_model or "gemini-3.5-flash-lite"
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"De-Identified Patient & Biomarkers JSON:\n"
            f"{json.dumps(sanitized_payload, indent=2)}\n\n"
            "Return JSON:"
        )

        response = self._client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "automatic_function_calling": {"disable": True},
            },
        )

        raw_text = response.text.strip()
        data = json.loads(raw_text)

        inferred_biomarkers: list[InferredBiomarker] = []
        for ib in data.get("inferred_biomarkers", []):
            if isinstance(ib, dict) and ib.get("test_name") and ib.get("inferred_status"):
                status = str(ib.get("inferred_status")).upper()
                if status in ["NORMAL", "HIGH", "LOW", "CRITICAL"]:
                    inferred_biomarkers.append(InferredBiomarker(
                        test_name=str(ib.get("test_name")),
                        inferred_status=status,
                        standard_range=str(ib.get("standard_range", "Standard Biological Reference")),
                        clinical_rationale=str(ib.get("clinical_rationale", "Inferred via universal clinical laboratory reference interval")),
                    ))

        return ClinicalWellnessScoreResponse(
            score=int(data.get("score", 85)),
            label=data.get("label", "Good"),
            color=data.get("color", "green"),
            clinical_summary=data.get("clinical_summary", "Laboratory analysis completed within expected physiological parameters."),
            organ_scores=data.get("organ_scores", []),
            key_drivers=data.get("key_drivers", []),
            inferred_biomarkers=inferred_biomarkers,
            confidence=float(data.get("confidence", 0.95)),
            deidentified_by_dlp=sanitized_payload.get("deidentified_by_dlp", True),
        )

    def _deterministic_clinical_score(self, payload: dict[str, Any]) -> ClinicalWellnessScoreResponse:
        """
        Deterministic clinical scoring engine.
        Resolves UNKNOWN biomarkers against standard biological reference intervals,
        and scores only clinically evaluable biomarkers.
        """
        raw_tests = payload.get("tests", [])
        if not raw_tests:
            return ClinicalWellnessScoreResponse(
                score=100,
                label="Excellent",
                color="green",
                clinical_summary="No abnormal clinical findings detected. All evaluated parameters are within optimal ranges.",
                organ_scores=[],
                key_drivers=[],
                inferred_biomarkers=[],
                confidence=1.0,
                deidentified_by_dlp=payload.get("deidentified_by_dlp", True),
            )

        inferred_biomarkers: list[InferredBiomarker] = []
        resolved_tests: list[dict] = []

        for t in raw_tests:
            test_copy = dict(t)
            status = str(test_copy.get("status", "UNKNOWN")).upper()
            t_name = str(test_copy.get("test_name", "")).strip()
            clean_name = re.sub(r"[^a-zA-Z0-9]+", "_", t_name.lower()).strip("_")
            val = test_copy.get("value")

            # If status is UNKNOWN, attempt standard clinical reference resolution
            if status in ["UNKNOWN", "None", ""] and isinstance(val, (int, float)):
                matched_key = None
                for std_key in STANDARD_REFERENCE_INTERVALS:
                    if std_key in clean_name or clean_name in std_key:
                        matched_key = std_key
                        break

                if matched_key:
                    low, high, unit, desc = STANDARD_REFERENCE_INTERVALS[matched_key]
                    if val < low:
                        inf_status = "LOW"
                        rationale = f"{t_name} ({val} {unit}) is below standard lower threshold ({low} {unit})."
                    elif val > high:
                        inf_status = "HIGH"
                        rationale = f"{t_name} ({val} {unit}) exceeds standard upper threshold ({high} {unit})."
                    else:
                        inf_status = "NORMAL"
                        rationale = f"{t_name} ({val} {unit}) is within normal biological reference interval ({low} - {high} {unit})."

                    test_copy["status"] = inf_status
                    inferred_biomarkers.append(InferredBiomarker(
                        test_name=t_name,
                        inferred_status=inf_status,
                        standard_range=f"{low} - {high} {unit}",
                        clinical_rationale=rationale,
                    ))

            resolved_tests.append(test_copy)

        # Separate evaluable tests from uninterpretable tests
        evaluable_tests = [
            t for t in resolved_tests
            if str(t.get("status")).upper() in ["NORMAL", "HIGH", "LOW", "CRITICAL", "POSITIVE", "OPTIMAL", "DESIRABLE"]
        ]

        if not evaluable_tests:
            # Fallback if no test could be evaluated
            return ClinicalWellnessScoreResponse(
                score=100,
                label="Excellent",
                color="green",
                clinical_summary="Laboratory report received. Reference ranges are pending physician verification.",
                organ_scores=[],
                key_drivers=[],
                inferred_biomarkers=inferred_biomarkers,
                confidence=0.85,
                deidentified_by_dlp=payload.get("deidentified_by_dlp", True),
            )

        abnormal_tests = [
            t for t in evaluable_tests
            if t.get("status") in ["HIGH", "LOW", "CRITICAL", "POSITIVE"]
            and t.get("flag") != "REVIEW_REQUIRED"
        ]
        critical_tests = [t for t in evaluable_tests if t.get("status") == "CRITICAL" or t.get("flag") == "RED_FLAG"]
        normal_count = len(evaluable_tests) - len(abnormal_tests)

        # Base calculation over evaluable tests ONLY (not polluted by uninterpretable tests)
        base_score = (normal_count / len(evaluable_tests)) * 100
        critical_penalty = min(25, len(critical_tests) * 8)
        score = max(20, min(100, round(base_score - critical_penalty)))

        # Color & label mapping
        if score >= 90:
            label, color = "Excellent", "green"
        elif score >= 75:
            label, color = "Good", "light-green"
        elif score >= 60:
            label, color = "Fair", "amber"
        elif score >= 45:
            label, color = "Attention Required", "amber"
        else:
            label, color = "Critical", "rose"

        # Organ system score calculation
        organ_groups: dict[str, list[dict]] = {}
        for t in evaluable_tests:
            prof = t.get("profile", "General")
            organ_groups.setdefault(prof, []).append(t)

        organ_scores: list[OrganSystemScore] = []
        for prof_name, p_tests in organ_groups.items():
            if prof_name in ["General", "Custom", "Other Parameters"]:
                continue
            abn = [t for t in p_tests if t.get("status") in ["HIGH", "LOW", "CRITICAL"]]
            p_score = max(30, round(((len(p_tests) - len(abn)) / len(p_tests)) * 100))
            if p_score >= 85:
                status = "OPTIMAL"
                concern = None
            elif p_score >= 65:
                status = "ELEVATED_RISK"
                concern = f"Mild elevation in {abn[0].get('test_name')}" if abn else "Borderline readings"
            else:
                status = "CRITICAL"
                concern = f"Significant abnormality in {abn[0].get('test_name')}" if abn else "Multiple alerts"

            organ_scores.append(OrganSystemScore(
                system=prof_name,
                score=p_score,
                status=status,
                primary_concern=concern,
            ))

        # Key drivers from abnormal biomarkers
        key_drivers: list[BiomarkerDriver] = []
        for t in abnormal_tests[:4]:
            t_name = t.get("test_name", "Biomarker")
            status = t.get("status", "HIGH")
            val = t.get("value")
            unit = t.get("raw_unit", "")
            key_drivers.append(BiomarkerDriver(
                test_name=t_name,
                impact="HIGH" if t in critical_tests else "MODERATE",
                explanation=f"{t_name} is {status.lower()} ({val} {unit}), indicating need for clinical follow-up.",
            ))

        inferred_note = f" ({len(inferred_biomarkers)} missing ranges resolved via standard clinical intervals)" if inferred_biomarkers else ""
        summary = (
            f"Overall health score evaluated at {score}/100 ({label}){inferred_note}. "
            f"{len(abnormal_tests)} of {len(evaluable_tests)} evaluable parameters require clinical attention, "
            f"with {len(critical_tests)} priority alerts."
            if abnormal_tests
            else f"All {len(evaluable_tests)} evaluable laboratory parameters are within normal biological limits{inferred_note}."
        )

        return ClinicalWellnessScoreResponse(
            score=score,
            label=label,
            color=color,
            clinical_summary=summary,
            organ_scores=organ_scores,
            key_drivers=key_drivers,
            inferred_biomarkers=inferred_biomarkers,
            confidence=0.92,
            deidentified_by_dlp=payload.get("deidentified_by_dlp", True),
        )


# Singleton scoring service instance
llm_score_service = LLMClinicalScoreService()

