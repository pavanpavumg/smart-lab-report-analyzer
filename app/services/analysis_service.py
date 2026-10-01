import re

from app.models.ocr import OCRDocument
from app.providers.base import OCRProvider
from app.rules.catalog import metadata_for
from app.schemas.report import (
    AnalysisResponse,
    Patient,
    Profile,
    ReferenceRange,
    TestResult,
    ValidationInfo,
)
from app.services.classifier import classify_document
from app.services.flag_engine import calculate_flag
from app.services.normalizer import clean_text, normalize_unit
from app.services.patient_extractor import extract_patient
from app.services.profile_detector import detect_profile
from app.services.reference_parser import parse_reference, select_gender_range
from app.services.test_extractor import RawTest, extract_tests


def analyze_document(
    content: bytes, filename: str, provider: OCRProvider
) -> AnalysisResponse:
    ocr: OCRDocument = provider.extract(content, filename)
    full_text = clean_text(ocr.text)
    document_type, confidence = classify_document(full_text)

    patient = extract_patient(full_text)
    if document_type != "BLOOD_LAB":
        warning_msg = (
            "Unsupported document type (Cytopathology / Non-Blood specimen). No blood-test extraction was performed."
            if document_type == "NON_BLOOD_LAB"
            else "Unsupported document type. No blood-test extraction was performed."
        )
        return AnalysisResponse(
            success=False,
            document_type=document_type,
            document_confidence=confidence,
            patient=patient,
            tests=[],
            custom_parameters=[],
            profiles=[],
            validation=ValidationInfo(
                valid_blood_report=False,
                unsupported_pages=[page.page_number for page in ocr.pages],
            ),
            warnings=[warning_msg],
        )

    raw_results = []
    unsupported_pages = []

    for page in ocr.pages or []:
        page_text = clean_text(page.text)
        page_type, _ = classify_document(page_text)
        if page_type == "NON_BLOOD_LAB":
            unsupported_pages.append(page.page_number)
            continue

        section_hint = _find_section_hint(page_text)
        raw_results.extend(
            extract_tests(page_text, page.page_number, section_hint=section_hint)
        )

    # Multimodal AI enhancement for image uploads (JPEG, PNG, WEBP, BMP):
    # OCR layout engines often drop numbers/columns (e.g. bold numbers or DLC counts)
    # from images. Multimodal AI directly processes the original document visual pixels.
    is_image = filename.lower().endswith(
        (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")
    )
    if is_image:
        mm_patient, mm_tests = _extract_multimodal(content, filename)
        if mm_patient:
            if not patient.patient_name and mm_patient.patient_name:
                patient.patient_name = mm_patient.patient_name
            if patient.age is None and mm_patient.age is not None:
                patient.age = mm_patient.age
            if (
                patient.gender in ("Unknown", None)
                and mm_patient.gender
                and mm_patient.gender != "Unknown"
            ):
                patient.gender = mm_patient.gender

        if mm_tests:
            unique_raw: dict[str, RawTest] = {}
            for r in raw_results:
                key = r.canonical_name or r.test_name.lower()
                unique_raw[key] = r

            for r in mm_tests:
                key = r.canonical_name or r.test_name.lower()
                if key not in unique_raw:
                    unique_raw[key] = r
                else:
                    existing = unique_raw[key]
                    if (
                        (not existing.reference_range and r.reference_range)
                        or (not existing.raw_unit and r.raw_unit)
                        or (existing.value is None and r.value is not None)
                        or (
                            r.reference_range
                            and r.raw_unit
                            and (not existing.reference_range or not existing.raw_unit)
                        )
                        or (r.extraction_confidence >= 0.95 and r.reference_range)
                    ):
                        unique_raw[key] = r

            raw_results = list(unique_raw.values())

    # Autonomous LLM Fallback Safety Net:
    # If deterministic regex extraction found 0 tests on a valid blood report (e.g. non-standard
    # table layout, complex columns, or novel test formats), invoke LLM fallback to dynamically
    # extract all test names without requiring code changes.
    if not raw_results:
        for page in ocr.pages or []:
            if page.page_number in unsupported_pages:
                continue
            page_text = clean_text(page.text)
            if not page_text or len(page_text.strip()) < 20:
                continue
            section_hint = _find_section_hint(page_text)
            fallback_tests = _extract_tests_fallback_llm(
                page_text, page.page_number, section_hint
            )
            if fallback_tests:
                raw_results.extend(fallback_tests)

    unique_raw: dict[str, RawTest] = {}

    for r in raw_results:
        dedup_key = r.canonical_name or r.test_name.lower()
        if dedup_key not in unique_raw:
            unique_raw[dedup_key] = r
        else:
            existing = unique_raw[dedup_key]
            # Prefer richer extraction (unit, status, reference) or primary report
            if (
                (not existing.raw_unit and r.raw_unit)
                or (not existing.reference_range and r.reference_range)
                or (len(r.test_name) > len(existing.test_name))
            ):
                unique_raw[dedup_key] = r
    raw_results = list(unique_raw.values())

    results: list[TestResult] = []
    for raw in raw_results:
        selected_reference = select_gender_range(raw.reference_range, patient.gender)
        parsed_ref = parse_reference(selected_reference)
        meta = metadata_for(raw.canonical_name, raw.test_name)

        # Catalog metadata is authoritative for known tests. Section headings
        # can still override a profile when a report uses a custom parameter.
        profile = (
            detect_profile(raw.canonical_name, raw.section_hint)
            if raw.canonical_name
            else detect_profile(None, raw.section_hint)
        )
        if profile == "Custom":
            profile = meta.profile

        status = calculate_flag(
            value=raw.value,
            low=parsed_ref.low,
            high=parsed_ref.high,
            raw_status=raw.raw_status,
            raw_reference=selected_reference,
            canonical_name=raw.canonical_name,
        )
        flag = {
            "LOW": "RED_FLAG",
            "HIGH": "RED_FLAG",
            "NORMAL": "GREEN_FLAG",
            "UNKNOWN": "UNKNOWN_FLAG",
        }[status]

        results.append(
            TestResult(
                test_name=meta.test_name,
                raw_test_name=raw.test_name,
                test_id=meta.test_id,
                loinc_code=meta.loinc_code,
                value=raw.value,
                raw_value=raw.raw_value,
                raw_unit=raw.raw_unit,
                reference_range=ReferenceRange(
                    low=parsed_ref.low,
                    high=parsed_ref.high,
                    raw=selected_reference,
                    operator=parsed_ref.operator,
                ),
                status=status,
                flag=flag,
                profile=profile,
                method=raw.method,
                specimen=raw.specimen,
                page_number=raw.page_number,
                extraction_confidence=raw.extraction_confidence,
                source_text=raw.source_text,
            )
        )

    # Every successfully extracted result appears once in `tests`, in report
    # order. Profiles are a summary at the end rather than a second copy of
    # every test, making the API easier for frontends to consume.
    profiles_by_name: dict[str, list[str]] = {}
    custom: list[TestResult] = []
    for result in results:
        if result.profile == "Custom":
            custom.append(result)
        else:
            profiles_by_name.setdefault(result.profile, []).append(result.test_id)

    profiles = [
        Profile(profile_name=name, test_ids=test_ids, test_count=len(test_ids))
        for name, test_ids in profiles_by_name.items()
    ]

    warnings = []
    if unsupported_pages:
        warnings.append(
            "Some pages were classified as unsupported and were not extracted."
        )
    if not results:
        warnings.append(
            "No structured lab tests were confidently extracted from the OCR text."
        )

    return AnalysisResponse(
        success=True,
        document_type="BLOOD_LAB",
        document_confidence=confidence,
        patient=patient,
        tests=results,
        custom_parameters=custom,
        profiles=profiles,
        validation=ValidationInfo(
            valid_blood_report=True,
            unsupported_pages=sorted(set(unsupported_pages)),
        ),
        warnings=warnings,
    )


def _find_section_hint(page_text: str) -> str | None:
    for line in page_text.splitlines():
        cleaned = line.strip(" *:-|")
        lower = cleaned.lower()
        if any(
            keyword in lower
            for keyword in (
                "cbc",
                "complete blood count",
                "kidney",
                "renal",
                "kft",
                "electrolyte",
                "liver",
                "lft",
                "hepatic",
                "lipid",
                "thyroid",
                "tft",
                "iron",
                "diabetes",
                "glucose",
                "hba1c",
                "vitamin",
                "coagulation",
                "hormone",
                "urine",
                "microbiology",
                "culture",
                "antibiotic",
                "dhea",
                "steroid",
                "maternal",
                "prenatal",
                "prisca",
                "dual marker",
                "cytogenetics",
                "karyotype",
            )
        ) and not re.match(
            r"^(method|name|age|gender|sample|client|h/o|weight|date)\b", lower
        ):
            return cleaned
    return None


def _find_canonical_name(name: str) -> str | None:
    from app.rules.aliases import ALIASES

    cleaned = name.lower().strip(" *•·:,-|")
    if cleaned in ALIASES:
        return ALIASES[cleaned]
    no_paren = re.sub(r"\s*\([^)]*\)", "", cleaned).strip(" *•·:,-|")
    if no_paren in ALIASES:
        return ALIASES[no_paren]
    if "," in cleaned:
        parts = [p.strip() for p in cleaned.split(",")]
        rev = " ".join(reversed(parts))
        if rev in ALIASES:
            return ALIASES[rev]
    if "glucose" in cleaned and "fasting" in cleaned:
        return "fasting_glucose"
    return None


def _extract_multimodal(
    content: bytes, filename: str
) -> tuple[Patient | None, list[RawTest]]:
    """Multimodal AI extraction engine using Google GenAI vision.

    Directly inspects the original document pixels, preventing OCR column-dropping,
    distorted tabular layouts, or dropped bold numbers.
    """
    try:
        import json
        import logging
        import os
        from google import genai
        from google.genai import types
        from app.schemas.report import Patient
        from app.services.normalizer import parse_number

        from app.core.config import settings
        logger = logging.getLogger(__name__)
        api_key = os.getenv("GEMINI_API_KEY") or settings.gemini_api_key
        if not api_key:
            return None, []

        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        mime_type = {
            "pdf": "application/pdf",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
            "tif": "image/tiff",
            "tiff": "image/tiff",
            "bmp": "image/bmp",
        }.get(ext, "application/octet-stream")

        client = genai.Client(api_key=api_key)
        prompt = (
            "You are an expert clinical laboratory pathologist and data extraction engine.\n"
            "Extract patient demographics and all laboratory test results and investigation parameters from this medical lab report into JSON.\n"
            "Return a JSON object with this exact schema:\n"
            "{\n"
            '  "patient": {\n'
            '    "patient_name": "...",\n'
            '    "age": 30,\n'
            '    "gender": "Male" | "Female" | "Other" | "Unknown"\n'
            "  },\n"
            '  "tests": [\n'
            "    {\n"
            '      "test_name": "Full standard test name",\n'
            '      "value": "Observed test value",\n'
            '      "raw_unit": "Unit or null",\n'
            '      "reference_range": "Normal reference range or null",\n'
            '      "raw_status": "HIGH" | "LOW" | "NORMAL" | "CRITICAL" | null\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "Rules:\n"
            "1. Extract EVERY laboratory test present on the report with its result, unit, and reference range.\n"
            "2. Do NOT include patient demographics, physician names, lab directors, or disclaimers in the 'tests' array.\n"
            "3. Return strictly valid JSON."
        )

        resp_text = None
        for model_name in [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
            "gemini-3.5-flash",
        ]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=content, mime_type=mime_type),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0,
                    ),
                )
                if response and response.text:
                    resp_text = response.text
                    break
            except Exception as e:
                logger.warning(f"Multimodal extraction failed on {model_name}: {e}")
                continue

        if not resp_text:
            return None, []

        data = json.loads(resp_text)
        patient_res = None
        if isinstance(data, dict) and "patient" in data:
            p_data = data["patient"]
            if isinstance(p_data, dict):
                p_name = p_data.get("patient_name")
                p_name = (
                    str(p_name).strip()
                    if p_name and str(p_name).lower() not in {"null", "none"}
                    else None
                )
                p_age = p_data.get("age")
                if p_age is not None:
                    try:
                        p_age = int(float(p_age))
                    except (ValueError, TypeError):
                        p_age = None
                p_gender = p_data.get("gender")
                if p_gender and str(p_gender).lower() in {"male", "m"}:
                    p_gender = "Male"
                elif p_gender and str(p_gender).lower() in {"female", "f"}:
                    p_gender = "Female"
                else:
                    p_gender = "Unknown"
                patient_res = Patient(
                    patient_name=p_name, age=p_age, gender=p_gender or "Unknown"
                )

        test_items = data.get("tests", []) if isinstance(data, dict) else []
        if not isinstance(test_items, list):
            test_items = []

        extracted_tests: list[RawTest] = []
        for i, item in enumerate(test_items):
            if not isinstance(item, dict):
                continue
            name = str(item.get("test_name", "")).strip(" *:-|")
            if not name or len(name) < 2 or len(name.split()) > 10:
                continue

            raw_val = str(item.get("value", "")).strip()
            if not raw_val or raw_val.lower() in {"null", "none", ""}:
                continue

            num_val = parse_number(raw_val)
            val = num_val if num_val is not None else raw_val

            raw_unit = item.get("raw_unit")
            if raw_unit:
                raw_unit = str(raw_unit).strip() or None

            ref_range = item.get("reference_range")
            if ref_range:
                ref_range = str(ref_range).strip() or None

            stat = item.get("raw_status")
            if stat:
                stat = str(stat).strip() or None

            canonical = _find_canonical_name(name)

            extracted_tests.append(
                RawTest(
                    test_name=name,
                    canonical_name=canonical,
                    value=val,
                    raw_value=raw_val,
                    raw_unit=raw_unit,
                    reference_range=ref_range,
                    raw_status=stat,
                    page_number=1,
                    source_text=f"{name}: {raw_val} {raw_unit or ''} (Ref: {ref_range or 'N/A'})",
                    section_hint=None,
                    extraction_confidence=0.98,
                    line_index=i,
                )
            )

        return patient_res, extracted_tests
    except Exception as exc:
        logging.getLogger(__name__).error(
            f"Multimodal extraction error: {exc}", exc_info=True
        )
        return None, []


def _extract_tests_fallback_llm(
    text: str, page_number: int, section_hint: str | None = None
) -> list[RawTest]:
    """Autonomous LLM-assisted test extractor for unusual, complex, or uncataloged layouts.

    Invoked strictly as a safety net when deterministic regex extraction found 0 tests
    on an otherwise valid blood laboratory report.
    """
    try:
        import json
        import logging
        import os
        from google import genai
        from google.genai import types

        from app.core.config import settings
        logger = logging.getLogger(__name__)

        api_key = os.getenv("GEMINI_API_KEY") or settings.gemini_api_key
        if not api_key:
            return []

        client = genai.Client(api_key=api_key)
        prompt = (
            "You are an expert clinical laboratory pathologist and data extraction engine.\n"
            "Extract all laboratory test results and investigation parameters from this medical lab report text into a JSON array.\n"
            "For each test parameter, extract:\n"
            "- 'test_name': full standard name of the test/analyte (e.g. 'Serum Creatinine', 'Hemoglobin', 'Beta-hCG', 'Dengue NS1 Antigen', 'Platelet Count')\n"
            "- 'value': the observed test value as reported (e.g. '1.1', '< 0.50', 'Negative', 'Present', '1:80')\n"
            "- 'raw_unit': measurement unit (e.g. 'mg/dL', 'mIU/mL', 'g/dL', '%' or null if qualitative/unitless)\n"
            "- 'reference_range': biological reference interval or normal threshold (e.g. '0.7 - 1.3', '< 5.0', 'Negative', or null)\n"
            "- 'raw_status': clinical flag if printed ('HIGH', 'LOW', 'NORMAL', 'CRITICAL', or null)\n\n"
            "Rules:\n"
            "1. Only extract real clinical laboratory tests. Do NOT extract patient demographics (Age, Gender, Name), doctor names, hospital names, collection dates, or disclaimers.\n"
            '2. Return ONLY a valid JSON array matching this format: [{"test_name": "...", "value": "...", "raw_unit": "...", "reference_range": "...", "raw_status": "..."}]\n\n'
            f"Laboratory Report Text:\n{text[:6000]}"
        )

        resp_text = None
        for model_name in [
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.8-flash",
        ]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0,
                    ),
                )
                if response and response.text:
                    resp_text = response.text
                    break
            except Exception as e:
                logger.warning(
                    f"LLM fallback test extraction failed on {model_name}: {e}"
                )
                continue

        if not resp_text:
            return []

        parsed_json = json.loads(resp_text)
        if not isinstance(parsed_json, list):
            if isinstance(parsed_json, dict) and "tests" in parsed_json:
                parsed_json = parsed_json["tests"]
            else:
                return []

        from app.services.normalizer import parse_number

        fallback_results: list[RawTest] = []
        for i, item in enumerate(parsed_json):
            if not isinstance(item, dict):
                continue
            name = str(item.get("test_name", "")).strip(" *:-|")
            if not name or len(name) < 2 or len(name.split()) > 10:
                continue

            raw_val = str(item.get("value", "")).strip()
            if not raw_val or raw_val.lower() in {"null", "none", ""}:
                continue

            num_val = parse_number(raw_val)
            val = num_val if num_val is not None else raw_val

            raw_unit = item.get("raw_unit")
            if raw_unit:
                raw_unit = str(raw_unit).strip() or None

            ref_range = item.get("reference_range")
            if ref_range:
                ref_range = str(ref_range).strip() or None

            stat = item.get("raw_status")
            if stat:
                stat = str(stat).strip() or None

            canonical = _find_canonical_name(name)

            fallback_results.append(
                RawTest(
                    test_name=name,
                    canonical_name=canonical,
                    value=val,
                    raw_value=raw_val,
                    raw_unit=raw_unit,
                    reference_range=ref_range,
                    raw_status=stat,
                    page_number=page_number,
                    source_text=f"{name}: {raw_val} {raw_unit or ''} (Ref: {ref_range or 'N/A'})",
                    section_hint=section_hint,
                    extraction_confidence=0.92,
                    line_index=i,
                )
            )

        return fallback_results
    except Exception as exc:
        logging.getLogger(__name__).error(
            f"Fallback LLM extraction error: {exc}", exc_info=True
        )
        return []
