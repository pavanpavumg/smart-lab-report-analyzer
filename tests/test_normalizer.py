from app.services.normalizer import clean_text, normalize_unit


def test_unit_normalization():
    assert normalize_unit("gm%") == "g/dL"
    assert normalize_unit("mg/dl") == "mg/dL"
    assert normalize_unit("µiu/ml") == "µIU/mL"


def test_ocr_artifact_cleanup():
    assert clean_text("WBC 7.1 10~9/L") == "WBC 7.1 10^9/L"
