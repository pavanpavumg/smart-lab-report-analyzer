import re

from app.schemas.report import Patient


NAME_PATTERNS = [
    re.compile(r"(?:patient\s*name|patient|name)\s*[:\-]\s*([^\n|]+)", re.I),
    re.compile(r"^\s*(?:patient\s*name|patient|name)\s*$\n\s*([^\n|]+)", re.I | re.M),
]

# Supports common lab variants:
#   60 Years / Female
#   60 Y 0 M 0 D /F
#   34 YRS / Male
#   32 Years / Male
AGE_GENDER_PATTERNS = [
    re.compile(
        r"\b(\d{1,3})\s*(?:years?|yrs?|y)\b(?:\s*\d+\s*(?:months?|m)\s*\d*\s*(?:days?|d)?)?\s*[/\\-]?\s*(male|female|m|f)\b",
        re.I,
    ),
    re.compile(r"\bage\s*[:\-]?\s*(\d{1,3})\s*(?:years?|yrs?|y)?\s*[/\\-]?\s*(male|female|m|f)\b", re.I),
    re.compile(r"\bage\s*[/\\-]\s*(?:gender|sex)\s*[:\-]?\s*(\d{1,3})\s*(?:y|yrs?|years?)?\s*[^\n]*?[/\\-]?\s*(male|female|m|f)\b", re.I),
]


# Labels that frequently appear on the line immediately before the actual name.
NAME_LABEL_LINE_RE = re.compile(r"^\s*(?:patient\s*name|patient|name)\s*$", re.I)


def extract_patient(text: str) -> Patient:
    lines = [" ".join(line.strip().split()) for line in text.splitlines() if line.strip()]

    name = None
    age = None
    gender = "Unknown"

    for pattern in NAME_PATTERNS:
        match = pattern.search(text)
        if match:
            candidate = _clean_name(match.group(1))
            if _is_valid_name(candidate):
                name = candidate
                break

    # Common columnar OCR layout:
    #   PATIENT NAME   PATIENT ID   AGE / SEX   SAMPLE ID
    #   John Doe       PT-894210    34 YRS / Male SMP-...
    # Or:
    #   PATIENT DOB/AGE MRN SEX
    #   Jordan A. Whitfield 14-Mar-1987/39 8827451 Male
    if not name:
        for i, line in enumerate(lines[:-1]):
            if re.search(r"\bpatient\b", line, re.I) and re.search(r"\b(?:dob|age|mrn|sex|patient\s+id)\b", line, re.I):
                row = lines[i + 1]
                m_tab = re.match(
                    r"^([A-Z][a-zA-Z.\s'-]+?)\s+(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4})[/\s]+(\d{1,3})\s+(?:[A-Z0-9-]+\s+)?(Male|Female)\b",
                    row,
                    re.I,
                )
                if m_tab:
                    name = _clean_name(m_tab.group(1))
                    if age is None:
                        age = int(m_tab.group(3))
                    if gender == "Unknown":
                        gender = _gender(m_tab.group(4))
                    break
                candidate = _extract_columnar_name(row)
                if candidate:
                    name = candidate
                    break


    if not name:
        for i, line in enumerate(lines[:-1]):
            if NAME_LABEL_LINE_RE.match(line) and _is_valid_name(lines[i + 1]):
                name = _clean_name(lines[i + 1])
                break

    # Unlabeled prominent person name preceding demographic block (e.g. Drlogy reports)
    if not name:
        for i, line in enumerate(lines):
            if re.search(r"\b(?:age\s*[:\-]\s*\d+|sex\s*[:\-]\s*(?:male|female))\b", line, re.I):
                for prev_idx in range(i - 1, max(-1, i - 4), -1):
                    cand = lines[prev_idx].strip()
                    cand = re.split(r"\b(?:sample\s*collected|sample|collected|registered|pid|ref|date|visit|uhid)\b", cand, flags=re.I)[0].strip(" :|-|")
                    if _is_valid_name(cand) and not re.search(r"\b(?:lab|pathology|complex|road|opp|mumbai|drlogy|address|hospital|report)\b", cand, re.I):
                        if re.match(r"^[A-Z][a-zA-Z.'-]+\s+(?:[A-Z]\.?\s+)?[A-Z][a-zA-Z.'-]+$", cand):
                            name = cand
                            break
                if name:
                    break

    age = None
    gender = "Unknown"
    for pattern in AGE_GENDER_PATTERNS:
        match = pattern.search(text)
        if match:
            age = int(match.group(1))
            gender = _gender(match.group(2))
            break

    # Standalone age and sex patterns (e.g., 'Age: 21 Years' and 'Sex: Male' on separate lines/columns)
    if age is None:
        match = re.search(r"\bage\s*[:\-]?\s*(\d{1,3})\s*(?:years?|yrs?|y)?\b", text, re.I)
        if match:
            age = int(match.group(1))
    if gender == "Unknown":
        match = re.search(r"\b(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b", text, re.I)
        if match:
            gender = _gender(match.group(1))

    # Columnar patient header can still be on one line after OCR joins cells.
    if age is None or gender == "Unknown":
        match = re.search(r"(\d{1,3})\s*(?:yrs?|years?|y)\s*/\s*(male|female|m|f)\b", text, re.I)
        if match:
            if age is None:
                age = int(match.group(1))
            if gender == "Unknown":
                gender = _gender(match.group(2))

    if age is None or gender == "Unknown":
        m_dob_age = re.search(r"\b\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}[/\s]+(\d{1,3})\s+(?:[A-Z0-9-]+\s+)?(Male|Female)\b", text, re.I)
        if m_dob_age:
            if age is None:
                age = int(m_dob_age.group(1))
            if gender == "Unknown":
                gender = _gender(m_dob_age.group(2))


    return Patient(patient_name=name, age=age, gender=gender)


def _extract_columnar_name(value_line: str) -> str | None:
    # Stop before common identifiers in the same row.
    value = re.split(
        r"\s+(?=(?:PT[-A-Z0-9]+|UHID|KAD\d|[A-Z0-9]+[-.]\d{3,}|\d{1,3}\s*(?:YRS?|YEARS?|Y)\s*/))",
        value_line,
        maxsplit=1,
        flags=re.I,
    )[0]
    value = _clean_name(value)
    return value if _is_valid_name(value) else None


def _gender(value: str) -> str:
    return {"m": "Male", "male": "Male", "f": "Female", "female": "Female"}.get(
        value.lower(), "Unknown"
    )


def _clean_name(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip(" :|-|")
    # Remove common trailing metadata accidentally captured from a multi-column row.
    value = re.split(
        r"\b(?:UHID|PATIENT\s*ID|ID\s*NO|VISIT\s*ID|SEX\b|GENDER\b|AGE\b|DOB\b|REF\.?\s*BY|SAMPLE)",
        value,
        maxsplit=1,
        flags=re.I,
    )[0]
    return value.strip(" :|-|")


def _is_valid_name(value: str | None) -> bool:
    if not value or len(value) < 2 or len(value) > 120:
        return False
    if re.search(r"\b(?:test name|result|unit|reference|method|page|customer care|barcode)\b", value, re.I):
        return False
    return bool(re.search(r"[A-Za-z]", value))
