import pytest
from app.services.test_extractor import extract_tests
from app.services.analysis_service import analyze_document
from app.providers.mock import MockOCRProvider


def test_extracts_novel_uncataloged_test_compact():
    """Confirms arbitrary novel test names in compact rows are extracted dynamically."""
    ocr_text = (
        "BLOOD LAB REPORT\n"
        "Patient: John Doe  Age: 35  Gender: Male\n"
        "Immunoglobulin E, Serum 145.2 IU/mL 10.0 - 100.0 High\n"
        "Interleukin-6 [IL-6] 8.4 pg/mL 0.0 - 7.0 High\n"
        "Calprotectin, Fecal 240.5 ug/g < 50.0\n"
        "Hepatitis B Viral Load 15400 copies/mL Not Detected\n"
    )
    tests = extract_tests(ocr_text, page_number=1)
    test_names = [t.test_name for t in tests]

    assert "Immunoglobulin E, Serum" in test_names
    assert "Interleukin-6 [IL-6]" in test_names
    assert "Calprotectin, Fecal" in test_names
    assert "Hepatitis B Viral Load" in test_names

    ige = next(t for t in tests if t.test_name == "Immunoglobulin E, Serum")
    assert ige.value == 145.2
    assert ige.raw_unit == "IU/mL"
    assert ige.reference_range == "10.0 - 100.0"
    assert ige.raw_status == "High"

    il6 = next(t for t in tests if t.test_name == "Interleukin-6 [IL-6]")
    assert il6.value == 8.4
    assert il6.raw_unit == "pg/mL"


def test_extracts_novel_uncataloged_test_split_lines_without_bullet():
    """Confirms arbitrary novel test names split across lines without bullets are extracted."""
    ocr_text = (
        "BLOOD LAB REPORT\n"
        "Patient: Jane Doe  Age: 28  Gender: Female\n"
        "Serum Amyloid A\n"
        "4.5 mg/L 0.0 - 10.0 Normal\n"
        "Procalcitonin\n"
        "0.12 ng/mL 0.00 - 0.05 High\n"
    )
    tests = extract_tests(ocr_text, page_number=1)
    test_names = [t.test_name for t in tests]

    assert "Serum Amyloid A" in test_names
    assert "Procalcitonin" in test_names

    pct = next(t for t in tests if t.test_name == "Procalcitonin")
    assert pct.value == 0.12
    assert pct.raw_unit == "ng/mL"
    assert pct.reference_range == "0.00 - 0.05"


def test_extracts_novel_qualitative_tests():
    """Confirms arbitrary qualitative tests without catalog entries are extracted."""
    ocr_text = (
        "BLOOD LAB REPORT\n"
        "Patient: Alex  Age: 45  Gender: Male\n"
        "Dengue NS1 Antigen Negative Negative\n"
        "Anti-Cyclic Citrullinated Peptide Negative Negative\n"
        "Malarial Parasite Not Seen Not Seen\n"
    )
    tests = extract_tests(ocr_text, page_number=1)
    test_names = [t.test_name for t in tests]

    assert "Dengue NS1 Antigen" in test_names
    assert "Anti-Cyclic Citrullinated Peptide" in test_names
    assert "Malarial Parasite" in test_names

    dengue = next(t for t in tests if t.test_name == "Dengue NS1 Antigen")
    assert dengue.value.lower() == "negative"


def test_full_pipeline_end_to_end_with_novel_test():
    """Confirms end-to-end pipeline normalizes, flags, and creates custom profiles for novel tests."""
    content = (
        b"BLOOD LAB REPORT\n"
        b"Patient Name: Mrs. Novel User\n"
        b"50 Years/Female\n"
        b"Chromogranin A 120.0 ng/mL 20.0 - 100.0\n"
    )
    response = analyze_document(
        content=content,
        filename="novel.txt",
        provider=MockOCRProvider(),
    )
    assert response.success is True
    assert len(response.tests) >= 1
    chrom = response.tests[0]
    assert chrom.test_name == "Chromogranin A"
    assert chrom.value == 120.0
    assert chrom.status == "HIGH"
    assert chrom.flag == "RED_FLAG"
    assert chrom.profile == "Custom"


def test_find_canonical_name_mapping():
    from app.services.analysis_service import _find_canonical_name

    assert _find_canonical_name("Hemoglobin (Hb)") == "hemoglobin"
    assert _find_canonical_name("Total Leukocyte Count (TLC)") == "wbc"
    assert _find_canonical_name("Red Blood Cell Count (RBC)") == "rbc"
    assert _find_canonical_name("Hematocrit (Hct)") == "hematocrit"
    assert _find_canonical_name("Mean Corpuscular Volume (MCV)") == "mcv"
    assert _find_canonical_name("Mean Corpuscular Hemoglobin (MCH)") == "mch"
    assert _find_canonical_name("Mean Corpuscular Hemoglobin Concentration (MCHC)") == "mchc"
    assert _find_canonical_name("Fasting Blood Sugar (FBS)") == "fasting_glucose"
    assert _find_canonical_name("Glucose, Fasting") == "fasting_glucose"
    assert _find_canonical_name("Novel Biomarker XYZ") is None

