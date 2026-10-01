from app.services.classifier import classify_document


def test_reject_imaging():
    document_type, confidence = classify_document(
        "MRI BRAIN REPORT\nMagnetic resonance imaging findings."
    )
    assert document_type == "NON_BLOOD_LAB"
    assert confidence > 0.7


def test_accept_blood():
    document_type, confidence = classify_document(
        "CBC BLOOD REPORT\nHemoglobin 13.5 g/dL 12.0 - 15.0\n"
        "Platelet 250000 cells/cumm 150000 - 450000"
    )
    assert document_type == "BLOOD_LAB"
    assert confidence > 0.7
