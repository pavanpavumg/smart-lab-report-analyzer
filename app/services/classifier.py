import re

from app.rules.rejection import BLOOD_KEYWORDS, NON_BLOOD_KEYWORDS


def classify_document(text: str) -> tuple[str, float]:
    lower = text.lower()

    non_blood_hits = sum(1 for word in NON_BLOOD_KEYWORDS if word in lower)
    blood_hits = sum(1 for word in BLOOD_KEYWORDS if word in lower)

    # Strong imaging/non-lab signal with little/no blood-lab signal.
    if non_blood_hits >= 2 and blood_hits < 2:
        return "NON_BLOOD_LAB", min(0.99, 0.70 + non_blood_hits * 0.05)

    # Standard lab report headers (e.g. Biological Reference Intervals, Observed Values)
    if any(header in lower for header in (
        "biological reference interval", "biological reference intervals",
        "observed values", "bio. ref. interval", "bio. ref. range",
    )) and non_blood_hits < 2:
        return "BLOOD_LAB", 0.85

    if blood_hits >= 2:
        confidence = min(0.99, 0.70 + blood_hits * 0.025)
        return "BLOOD_LAB", confidence

    # A row-like numeric pattern can still indicate a lab report.
    numeric_rows = len(re.findall(r"\b[A-Za-z][A-Za-z /()-]{2,40}\s+\d+(?:\.\d+)?\s+[A-Za-zµμ/%^0-9]+", text))
    ast_rows = len(re.findall(r"\b[A-Za-z][A-Za-z0-9 /+\-]{2,40}\s+(?:Sensitive|Resistant|Susceptible)\s+\d", text, re.I))
    if numeric_rows >= 1 and (blood_hits >= 1 or "sample type" in lower):
        return "BLOOD_LAB", 0.76
    if numeric_rows >= 3 or ast_rows >= 2:
        return "BLOOD_LAB", 0.72

    return "NON_LAB", 0.65
