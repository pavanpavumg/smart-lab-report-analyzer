import re
from dataclasses import dataclass


@dataclass
class ReferenceRange:
    raw: str | None
    low: float | None
    high: float | None
    operator: str | None = None


NUMBER = r"[-+]?\d[\d,]*(?:\.\d+)?"
RANGE_RE = re.compile(rf"({NUMBER})\s*(?:-|to|–)\s*({NUMBER})", re.I)


def parse_reference(raw: str | None) -> ReferenceRange:
    if not raw:
        return ReferenceRange(None, None, None)

    value = " ".join(raw.replace("–", "-").split()).strip()

    # A demographic reference must be resolved first. If the patient's sex is
    # unknown, do not silently choose the first demographic range.
    if re.search(r"\b(?:male|female|men|women|males|females)\s*:", value, re.I):
        return ReferenceRange(value, None, None)

    match = RANGE_RE.search(value)
    if match:
        low = _to_float(match.group(1))
        high = _to_float(match.group(2))
        if low is not None and high is not None and low > high:
            # Check for dropped leading digit from watermark/OCR error
            # e.g., 4000 - 1000 (where 11000 lost a leading 1)
            if low >= 1000 and high >= 1000 and high * 10 > low:
                candidate_high = high + 10000 if high >= 1000 else high * 10
                if candidate_high > low:
                    high = candidate_high
            else:
                low, high = high, low
        return ReferenceRange(value, low, high)

    up_to = re.search(
        r"(?:upto|up to|less than|below|<=|≤|<|=)\s*(" + NUMBER + r")", value, re.I
    )
    if up_to:
        op = "<=" if ("<=" in up_to.group(0) or "=" in up_to.group(0) or "≤" in up_to.group(0)) else "<"
        return ReferenceRange(value, None, _to_float(up_to.group(1)), op)

    greater = re.search(r"(?:greater than|above|>=|≥|>)\s*(" + NUMBER + r")", value, re.I)
    if greater:
        op = ">=" if (">=" in greater.group(0) or "≥" in greater.group(0)) else ">"
        return ReferenceRange(value, _to_float(greater.group(1)), None, op)

    if value.startswith(("<", "≤", "<=")):
        match = re.search(NUMBER, value)
        op = "<=" if ("<=" in value or "≤" in value) else "<"
        return ReferenceRange(
            value, None, _to_float(match.group()) if match else None, op
        )

    if value.startswith((">", "≥", ">=")):
        match = re.search(NUMBER, value)
        op = ">=" if (">=" in value or "≥" in value) else ">"
        return ReferenceRange(
            value, _to_float(match.group()) if match else None, None, op
        )

    # Space-separated range: e.g. "2.3 6.1" or "4 10"
    m_space = re.search(rf"^({NUMBER})\s+({NUMBER})$", value)
    if m_space:
        try:
            n1 = _to_float(m_space.group(1))
            n2 = _to_float(m_space.group(2))
            if n1 < n2:
                return ReferenceRange(
                    f"{m_space.group(1)} - {m_space.group(2)}", n1, n2
                )
        except (ValueError, TypeError):
            pass

    return ReferenceRange(value, None, None)


def select_gender_range(raw: str | None, gender: str | None) -> str | None:
    if not raw:
        return raw
    text = " ".join(raw.replace("–", "-").split())

    keywords = {
        "Male": r"(?:male|men|males)",
        "Female": r"(?:female|women|females)",
    }
    if gender in keywords:
        kw = keywords[gender]
        # 1. Standard range with hyphen or 'to'
        match = re.search(
            rf"\b{kw}\s*:?\s*({NUMBER}\s*(?:-|to)\s*{NUMBER})", text, re.I
        )
        if match:
            return match.group(1).replace("–", "-")

        # 2. Bound operator: e.g. Female: < 6.1 or Male: > 3.0
        up_to = re.search(
            rf"\b{kw}\s*:?\s*((?:upto|up to|less than|greater than|above|below|<|>)\s*{NUMBER})",
            text,
            re.I,
        )
        if up_to:
            return up_to.group(1)

        # 3. Space-separated range: e.g. Female:2.3 6.1 or Male: 3.6 8.2
        m_space = re.search(
            rf"\b{kw}\s*:?\s*({NUMBER})\s+({NUMBER})(?!\d|\.)", text, re.I
        )
        if m_space:
            try:
                n1 = _to_float(m_space.group(1))
                n2 = _to_float(m_space.group(2))
                if n1 < n2:
                    return f"{m_space.group(1)} - {m_space.group(2)}"
            except (ValueError, TypeError):
                pass
            return m_space.group(1)

    # If the report has demographic alternatives and no matching patient sex,
    # retain the full raw text. parse_reference() will intentionally return an
    # unresolved range instead of selecting a potentially wrong demographic.
    return raw


def _to_float(value: str) -> float:
    return float(value.replace(",", ""))
