import re
from dataclasses import dataclass

from app.rules.aliases import ALIASES
from app.services.normalizer import parse_number


@dataclass
class RawTest:
    test_name: str
    canonical_name: str | None
    value: float | str | None
    raw_value: str | None
    raw_unit: str | None
    reference_range: str | None
    raw_status: str | None
    page_number: int
    source_text: str
    method: str | None = None
    specimen: str | None = None
    section_hint: str | None = None
    extraction_confidence: float = 0.80
    line_index: int = 0


# OCR frequently emits Indian-number formatting (2,45,000), western commas,
# decimals, or numbers embedded in scientific units. Keep the raw token and
# normalize only when converting to a numeric value.
NUMBER = r"[-+]?\d[\d,]*(?:\.\d+)?"
VAL_NUMBER = r"(?:<|>|<=|>=|≤|≥)?\s*" + NUMBER

UNIT_PATTERN = (
    r"(?:mg/dL|mg/L|g/dL|gm%|g/dl|g/L|g/l|IU/L|U/L|mIU/L|µIU/mL|uIU/mL|mmol/L|mEq/L|"
    r"ng/mL|ng/dL|ng/L|pg/mL|pg/L|µg/dL|ug/dL|µg/mL|ug/mL|µg/ml|ug/ml|mcg/mL|mcg/ml|mcg/dL|"
    r"nmol/L|nmol/l|µmol/L|umol/L|µmol/l|umol/l|\?mol/L|\?mol/l|pmol/L|pmol/l|"
    r"U/mL|u/ml|IU/mL|iu/ml|mIU/mL|miu/ml|mlU/ml|mlu/ml|mU/L|mU/mL|"
    r"copies/mL|copies/ml|cp/mL|AU/mL|BAU/mL|EU/mL|titer|titre|"
    r"ug/g|µg/g|mg/kg|mL/min|ml/min|"
    r"sec|secs|seconds|"
    r"mOsm/kg|mOsm/L|"
    r"MoM|mom|S/CO|s/co|Index|index|"
    r"%|fL|fl|pg|cells/cumm|cells/µL|cells/uL|"
    r"millions/cumm|million/cumm|mill/cumm|lakhs/cumm|"
    r"x?10\^\d+(?:/[a-zA-Zµu]+)?|10~\d+(?:/[a-zA-Zµu]+)?|10ˆ\d+(?:/[a-zA-Zµu]+)?|"
    r"x?10\^\d+|10\(\d+\)/[a-zA-Z0-9]+|"
    r"milln/ul|million/µL|million/uL|um|um3|ratio|/HPF|/hpf|cells/HPF|cells/hpf|/uL|/µL|/cumm|cumm|mm3|mm/hr|mm/h|mm)"
)


QUAL_WORDS_RE = re.compile(
    r"\b(?:negative|positive|absent|present|nil|trace|normal|clear|turbid|"
    r"yellow|pale\s+yellow(?:/amber)?|straw|amber|cloudy|hazy|not\s+seen|seen|non-reactive|reactive|"
    r"not\s+detected|detected)\b",
    re.I,
)

HEADER_RE = re.compile(
    r"^(?:test\s*(?:name|description)|observed\s*values?|result|value|units?|"
    r"biological\s+reference|bio\.\s*ref\.?\s*range|reference\s+(?:range|interval|value)|"
    r"interpretation(?:\s+notes?)?|remarks?|pathology\s+remarks?|observations?)\b",
    re.I,
)

CATEGORY_HEADER_RE = re.compile(
    r"^(?:blood\s+indices|differential\s+(?:wbc|leukocyte|leucocyte)\s+count|"
    r"complete\s+blood\s+count(?:\s*\(cbc\))?(?:\s+with\s+esr)?|"
    r"cbc\s*(?:with\s+esr)?|routine\s+blood\s+indices|"
    r"peripheral\s+blood\s+smear(?:\s+examination)?|"
    r"urine\s+(?:routine|examination|analysis)|lipid\s+profile|liver\s+function\s+test|"
    r"renal\s+function\s+test|kidney\s+function\s+test|thyroid\s+profile|"
    r"iron\s+profile|electrolyte\s+profile|"
    r"hba1c(?:\s*\([^)]+\))?\s*test|"
    r"fasting\s+blood\s+sugar\s*\([^)]+\)\s*,?\s*\(fbs\)|"
    r"high\s+sensitivity\s+crp\s*\([^)]+\)|"
    r"crp\s*-\s*c\s*-\s*reactive\s+protein\*|"
    r"apolipoproteins\s+a1\s*&\s*b|"
    r"rheumatoid\s+factor\s*\(quantitative\)|"
    r"total\s+iron\s+binding\s+capacity\s*\(tibc\)\*|"
    r"ferritin\*,?\s*serum|"
    r"inorganic\s+phosphorus,?\s*serum|"
    r"creatine\s+kinase\s*\(cpk\),?\s*serum)\b",
    re.I,
)

METADATA_RE = re.compile(
    r"^(?:"
    r"method\s*[:\-]|"
    r"name\s*[:\-]|"
    r"patient\s*(?:name|id)?\s*[:\-]?\b|"
    r"age\s*(?:[/\\-]\s*(?:gender|sex)|[:\-])|"
    r"age\b|"
    r"sex\s*[:\-]|gender\s*[:\-]|"
    r"dob\b|date\s+of\s+birth\b|"
    r"ref\.?\s*(?:doctor|by|physician|cust)?\b|"
    r"req\.?\s*no\b|"
    r"sample\s*(?:type|id|processed|collected)?\s*[:\-]?\b|"
    r"specimen\s*[:\-]|"
    r"client\s*(?:name|code)\b|"
    r"reported\s*(?:on|date)?\s*[:\-]?\b|"
    r"registered\s*(?:on|date)?\s*[:\-]?\b|"
    r"collected\s*(?:on|date)?\s*[:\-]?\b|"
    r"received\s*(?:on|date)?\s*[:\-]?\b|"
    r"vial\s*id\b|"
    r"doctor\b|dr\.?\s|"
    r"(?:kmc|tsmc|dmc|nmc|pmc|mmc|bmc|upmc|wbpc|regn?)\.?\s*no\b|"
    r"lab\s*no\b|patient\s*id\b|uhid\b|barcode\b|visit\s*id\b|"
    r"collection\s*date\b|printed\s*(?:on|date)?\b|sample\s*processed\b|"
    r"page\s*\d+\s+of\s+\d+|"
    r"bill\s*(?:no|date)\b|ip\s*no\b|op\s*no\b|sid\b|"
    r"date\b|"
    r"centre\b|booking\s*centre\b|test\s*performed\s*at\b|sin\s*no\b|"
    r"reporting\s*date|collection\s*date|op/ip\s*no|"
    r"unit\s+bio\s+ref|"
    r"status\s*[:\-]"
    r")",
    re.I,
)

HARD_STOP_RE = re.compile(
    r"^(?:"
    r"(?:int[er]{1,4}p[er]{0,2}[aeiou]t[a-z]*|interpretation)(?:\s+notes?|\s+the\s+following|\s+ast/alt)?\b|"
    r"remarks?\b|pathology\s+remarks?\b|observations?\b|"
    r"disclaimer\b|end\s+of\s+report\b|\*{3}\s*end\s+of\s+report\s*\*{3}|"
    r"technician\b|consultant\s+pathologist\b|senior\s+medical\b|"
    r"customer\s+care\b|phone\b|fax\b|www\.|http|iso\s+15189\b|clia\s+id\b|"
    r"booking\s*centre\b|test\s*performed\s*at\b|the\s*authenticity\s*of\s*the\s*report\b|"
    r"conditions\s*of\s*reporting\b|helpline\s*no\b|"
    r"kindly\s+correlate\b|comments?\b|"
    r"reference\s+values\s+in\s+the\s+table\b|"
    r"ref\.?\s*range\s*[:\-]?"
    r")",
    re.I,
)

SECTION_RE = re.compile(
    r"^(?:[A-Z][A-Z0-9 /&(),.'-]{3,})(?:\s*,?\s*(?:SERUM|PLASMA|WHOLE BLOOD|URINE|NAF PLASMA))?\s*$"
)

# Lines that are overwhelmingly likely to be explanatory prose rather than a
# result row. This deliberately errs on the side of rejecting narrative text.
NARRATIVE_RE = re.compile(
    r"\b(?:levels?|test|tests|may|might|can|could|include|includes|typically|"
    r"symptoms?|patients?|patient|disease|diseases|condition|conditions|"
    r"recommended|recommend|clinical|correlation|because|however|following|"
    r"measures?|measure|indicates?|indicated|associated|common|generally|"
    r"working|properly|required|risk factors?|source|information|advice)\b",
    re.I,
)

KNOWN_NAMES = sorted(ALIASES.keys(), key=len, reverse=True)


def extract_tests(
    text: str, page_number: int, section_hint: str | None = None
) -> list[RawTest]:
    """Extract structured lab-result rows from OCR text.

    The extractor is intentionally conservative. A number inside narrative,
    footer, interpretation, metadata, or page text is not a laboratory result.
    A candidate should look like a result row: known test label + value, or an
    unknown/custom label with strong row evidence (unit/reference/status).
    """
    page_specimen = None
    m_spec = re.search(
        r"\b(?:specimen|sample\s*type)\s*[:\-]\s*([A-Za-z]+)", text, re.I
    )
    if m_spec:
        page_specimen = m_spec.group(1).strip().title()

    page_method = None
    m_meth = re.search(r"\bmethod\s*[:\-]\s*([^\n]+)", text, re.I)
    if m_meth:
        page_method = m_meth.group(1).strip()

    raw_lines = [
        " ".join(line.strip().split()) for line in text.splitlines() if line.strip()
    ]
    lines: list[str] = []
    in_hard_stop = False
    for line in raw_lines:
        if _is_hard_stop(line):
            in_hard_stop = True
            continue
        if in_hard_stop:
            if CATEGORY_HEADER_RE.match(_clean_label(line)) or SECTION_RE.match(line):
                in_hard_stop = False
            else:
                continue
        lines.append(line)
    results: list[RawTest] = []
    used_label_indexes: set[int] = set()
    used_value_indexes: set[int] = set()

    # Check for Antimicrobial Susceptibility Testing (AST) and Culture Organism rows:
    # Format: [Antibiotic Name] [Sensitive|Resistant|Intermediate] [MIC Value]
    # e.g. "AMIKACIN Sensitive 1.5", "CO-TRIMOXAZOLE Sensitive 1..4"
    ast_row_re = re.compile(
        r"^([A-Za-z][A-Za-z0-9 /+\-]{2,40}?)\s+(Sensitive|Resistant|Susceptible|Intermediate)\s+("
        + NUMBER
        + r"|\d+(?:\.\.\d+)?)\s*$",
        re.I,
    )
    organism_row_re = re.compile(
        r"^ORGANISM\s*[:\-]?\s*([A-Za-z0-9 ._-]+)$",
        re.I,
    )
    for i, line in enumerate(lines):
        if i in used_label_indexes or i in used_value_indexes:
            continue
        org_match = organism_row_re.match(line.strip())
        if org_match:
            org_name = org_match.group(1).strip()
            results.append(
                RawTest(
                    test_name="Organism Isolated",
                    canonical_name="organism_isolated",
                    value=org_name,
                    raw_value=org_name,
                    raw_unit=None,
                    reference_range="Sterile / No Growth",
                    raw_status="Positive",
                    page_number=page_number,
                    source_text=line,
                    method=page_method or "Conventional Aerobic Culture",
                    specimen=page_specimen,
                    section_hint=section_hint or "Microbiology",
                    extraction_confidence=0.98,
                    line_index=i,
                )
            )
            used_label_indexes.add(i)
            used_value_indexes.add(i)
            continue

        ast_match = ast_row_re.match(line.strip())
        if ast_match:
            raw_drug = ast_match.group(1).strip(" *:-|")
            drug_name = " ".join(re.sub(r"\s*-\s*", "-", raw_drug).split()).title()
            susceptibility = ast_match.group(2).capitalize()
            raw_mic = re.sub(r"\.{2,}", ".", ast_match.group(3).strip())
            mic_val = parse_number(raw_mic)

            alias_key = raw_drug.lower().strip()
            canonical = ALIASES.get(alias_key) or ALIASES.get(drug_name.lower())

            results.append(
                RawTest(
                    test_name=drug_name,
                    canonical_name=canonical,
                    value=mic_val,
                    raw_value=raw_mic,
                    raw_unit="µg/mL",
                    reference_range="Sensitive",
                    raw_status=susceptibility,
                    page_number=page_number,
                    source_text=line,
                    method=page_method or "AST By Disc Diffusion",
                    specimen=page_specimen,
                    section_hint=section_hint or "Microbiology",
                    extraction_confidence=0.96,
                    line_index=i,
                )
            )
            used_label_indexes.add(i)
            used_value_indexes.add(i)

    # Check for Cytogenetics & Karyotyping parameters
    karyo_patterns = [
        (
            re.compile(r"\bKaryotype\s+ISCN\s*[:\-]\s*([A-Za-z0-9,+-]+)", re.I),
            "Karyotype (ISCN)",
            "karyotype_iscn",
            "46,XY (Male) / 46,XX (Female)",
            "NORMAL",
        ),
        (
            re.compile(
                r"\bResult\s*[:\-]\s*(Normal\s+(?:Male|Female)\s+Karyotype|[A-Za-z0-9 ,+-]+Karyotype)\b",
                re.I,
            ),
            "Karyotype Analysis Result",
            "karyotype_result",
            "Normal Karyotype",
            "NORMAL",
        ),
        (
            re.compile(r"\bNumber\s+of\s+cells\s+Analyzed\s*[:\-]\s*(\d+)", re.I),
            "Number of Cells Analyzed",
            "cells_analyzed",
            ">= 20",
            "NORMAL",
        ),
        (
            re.compile(r"\bNumber\s+of\s+cells\s+Karyotyped\s*[:\-]\s*(\d+)", re.I),
            "Number of Cells Karyotyped",
            "cells_karyotyped",
            ">= 5",
            "NORMAL",
        ),
    ]
    for i, line in enumerate(lines):
        for pattern, disp_name, canon_name, ref_str, stat in karyo_patterns:
            m = pattern.search(line)
            if m:
                raw_val = m.group(1).strip()
                val = parse_number(raw_val) if re.match(r"^\d+$", raw_val) else raw_val
                results.append(
                    RawTest(
                        test_name=disp_name,
                        canonical_name=canon_name,
                        value=val,
                        raw_value=raw_val,
                        raw_unit=None,
                        reference_range=ref_str,
                        raw_status=stat,
                        page_number=page_number,
                        source_text=line,
                        method=page_method or "GTG Banding",
                        specimen=page_specimen or "Blood",
                        section_hint=section_hint or "Cytogenetics",
                        extraction_confidence=0.98,
                        line_index=i,
                    )
                )
                used_label_indexes.add(i)
                used_value_indexes.add(i)

    for i, line in enumerate(lines):
        if i in used_label_indexes:
            continue
        parsed = _parse_compact_line(line, page_number, section_hint, i)
        if parsed:
            # Demographic reference ranges can be split across OCR lines, e.g.
            # "Men: 8-61" followed by "Women: 5-36". Attach the continuation
            # before analysis selects the patient's sex-specific interval.
            if parsed.reference_range and re.search(
                r"\b(?:male|female|men|women|males|females)\s*:",
                parsed.reference_range,
                re.I,
            ):
                extra, extra_idxs = _reference_continuation(lines, i)
                if extra:
                    parsed.reference_range = f"{parsed.reference_range} {extra}"
                    parsed.extraction_confidence = min(
                        parsed.extraction_confidence + 0.01, 0.99
                    )
                for idx in extra_idxs:
                    used_label_indexes.add(idx)
                    used_value_indexes.add(idx)
            results.append(parsed)
            used_label_indexes.add(i)
            used_value_indexes.add(i)

    for i, line in enumerate(lines):
        if i in used_label_indexes:
            continue
        label_info = _known_label(line)
        if not label_info:
            continue
        alias, display_name = label_info
        parsed, value_indexes = _find_split_value(
            lines, i, alias, display_name, page_number, section_hint, used_label_indexes
        )
        if parsed:
            results.append(parsed)
            used_label_indexes.add(i)
            used_value_indexes.update(value_indexes)

    # Unknown/custom parameters are retained only when the row has explicit
    # structure. This prevents bullets such as "Small body type." from becoming
    # tests while still allowing a custom analyte with a unit/reference.
    for i, line in enumerate(lines):
        if i in used_label_indexes or not _looks_like_unknown_label(line):
            continue
        raw_name = _clean_label(line)
        parsed, value_indexes = _find_split_value(
            lines, i, None, raw_name, page_number, section_hint, used_label_indexes
        )
        if parsed:
            results.append(parsed)
            used_label_indexes.add(i)
            used_value_indexes.update(value_indexes)

    # Generic compact rows are useful for vendor-specific names, but they must
    # have a unit/reference/flag signature. This is intentionally stricter than
    # the previous version to avoid parsing phone numbers and prose.
    for i, line in enumerate(lines):
        if i in used_value_indexes or _looks_like_metadata_or_noise(line):
            continue
        parsed = _parse_generic_compact_line(line, page_number, section_hint, i)
        if parsed:
            results.append(parsed)
            used_value_indexes.add(i)

    for r in results:
        if not r.specimen and page_specimen:
            r.specimen = page_specimen
        if not r.method and page_method:
            r.method = page_method

    results.sort(key=lambda item: item.line_index)

    unique: dict[tuple, RawTest] = {}
    for result in results:
        key = (
            result.canonical_name or result.test_name.lower(),
            str(result.value) if result.value is not None else (result.raw_value or ""),
        )
        if key not in unique:
            unique[key] = result
        else:
            existing = unique[key]
            # Prefer the richer extraction (has unit, status, reference, or longer descriptive name)
            if (
                (not existing.raw_unit and result.raw_unit)
                or (not existing.raw_status and result.raw_status)
                or (not existing.reference_range and result.reference_range)
                or (len(result.test_name) > len(existing.test_name))
            ):
                unique[key] = result
    return list(unique.values())


def _reference_continuation(
    lines: list[str], label_index: int
) -> tuple[str | None, list[int]]:
    parts: list[str] = []
    indexes: list[int] = []
    for j in range(label_index + 1, min(label_index + 4, len(lines))):
        candidate = lines[j]
        if _known_label(candidate) or _is_hard_stop(candidate):
            break
        # Check if candidate contains demographic range info (even if prefixed with Method:)
        m_demo = re.search(
            r"\b(?:male|female|men|women|males|females)\s*:\s*[-+]?\d[\d,]*(?:\.\d+)?\s*(?:-|to|–|\s)\s*[-+]?\d[\d,]*(?:\.\d+)?",
            candidate,
            re.I,
        )
        if m_demo:
            parts.append(m_demo.group(0))
            indexes.append(j)
            continue
        if _looks_like_metadata_or_noise(candidate):
            continue
        if parts:
            break
    return (" ".join(parts) if parts else None), indexes


def _find_split_value(
    lines,
    label_index,
    alias,
    display_name,
    page_number,
    section_hint,
    used_indexes: set[int] | None = None,
):
    for j in range(label_index + 1, min(label_index + 8, len(lines))):
        candidate = lines[j]
        if _is_hard_stop(candidate) or CATEGORY_HEADER_RE.match(
            _clean_label(candidate)
        ):
            break
        # If the candidate line is already a standalone test row with its own label and result,
        # do not allow this header line to consume it!
        if used_indexes and j in used_indexes:
            break
        if _parse_compact_line(
            candidate, page_number, section_hint, j
        ) or _parse_generic_compact_line(candidate, page_number, section_hint, j):
            break

        if _known_label(candidate):
            break
        if j != label_index + 1 and _looks_like_unknown_label(candidate):
            break

        if _looks_like_metadata_or_noise(candidate):
            continue

        combined_parts = [candidate]
        value_indexes = [j]
        k = j + 1
        while k < min(j + 6, len(lines)):
            nxt = lines[k]
            if _is_hard_stop(nxt) or _looks_like_metadata_or_noise(nxt):
                break
            if _known_label(nxt) or _looks_like_unknown_label(nxt):
                break
            if not _is_value_fragment(nxt):
                break
            combined_parts.append(nxt)
            value_indexes.append(k)
            k += 1

        combined = " ".join(combined_parts)
        parsed = _build_result(
            alias=alias,
            display_name=display_name,
            value_line=combined,
            page_number=page_number,
            source_text=f"{lines[label_index]} | {combined}",
            section_hint=section_hint,
            confidence=0.97 if alias else 0.84,
            line_index=label_index,
        )
        if parsed:
            return parsed, value_indexes
    return None, []


def _known_label(line: str) -> tuple[str, str] | None:
    cleaned = _clean_label(line)
    if not cleaned or _is_prose_line(cleaned) or CATEGORY_HEADER_RE.match(cleaned):
        return None
    lower = cleaned.lower()
    if (
        "clsi" in lower
        or "disc diffusion" in lower
        or "ast as per" in lower
        or "ast by" in lower
    ):
        return None
    for alias in KNOWN_NAMES:
        if re.match(rf"^{re.escape(alias)}(?:\s|[:*,\.\-()/]|$)", lower, re.I):
            remainder = cleaned[len(alias) :].strip(" *•·:,-|()\t")
            if remainder and (
                _has_result_signature(remainder) or re.match(r"^" + NUMBER, remainder)
            ):
                return alias, cleaned[: len(alias)].strip(" *•·:,-|")
            if not remainder:
                return alias, cleaned
            # Label-only rows can have parenthesized methods/abbreviations (e.g. '(Electrical Impedence)')
            # as long as they don't contain digits or excessive prose words.
            if not re.search(r"\d", remainder) and len(remainder.split()) <= 6:
                return alias, cleaned
            if len(remainder) <= 4:
                return alias, cleaned
    return None


def _looks_like_unknown_label(line: str) -> bool:
    stripped = line.strip()
    if (
        not stripped
        or _looks_like_metadata_or_noise(stripped)
        or HEADER_RE.match(stripped)
        or CATEGORY_HEADER_RE.match(stripped)
    ):
        return False
    if _is_prose_line(stripped) or re.search(
        r"\b(?:interpretation|comment|remarks?|disclaimer)\b", stripped, re.I
    ):
        return False
    if re.match(rf"^(?:{UNIT_PATTERN})\s*$", stripped, re.I) or QUAL_WORDS_RE.match(
        stripped
    ):
        return False
    if re.search(
        r"\b(?:low|high|normal|abnormal|positive|negative|trace|reactive|sensitive|resistant)\b",
        stripped,
        re.I,
    ):
        return False
    candidate = _clean_label(stripped)

    words = candidate.split()
    if len(words) < 1 or len(words) > 7:
        return False
    if not re.search(r"[A-Za-z]", candidate):
        return False
    # If candidate line has raw numbers (except parenthesized small abbreviations like '(15-3)' or '(Hb)'), reject
    if re.search(NUMBER, candidate) and not re.search(r"\([A-Za-z0-9\-]+\)", candidate):
        return False
    if re.search(
        r"\b(?:clinical|correlation|authenticated|signature|guidelines|technology|"
        r"rearrangements|mosaicism|error|practitioners|diagnosis|demographics|history|"
        r"origin|weight|fetus|fetuses|smoker|diabetes|ivf|scan|impression|qualification|"
        r"pregnancy|pregnant|non-pregnant|postmenopausal|trimester|"
        r"sonographer|crl|robinson|centromed|prisca|screening|statistical)\b",
        candidate,
        re.I,
    ):

        return False
    return bool(candidate)


def _parse_compact_line(
    line: str, page_number: int, section_hint: str | None, line_index: int
) -> RawTest | None:
    if CATEGORY_HEADER_RE.match(_clean_label(line)):
        return None
    label_info = _known_label(line)
    if not label_info:
        return None
    alias, _ = label_info
    match = re.search(rf"\b{re.escape(alias)}\b", line, re.I)
    if not match:
        match = re.search(rf"{re.escape(alias)}", line, re.I)
    if not match:
        return None
    display_name = line[: match.end()].strip(" *•·:,-|")
    remainder = line[match.end() :].strip(" *•·:,-|")

    # If the alias is followed by parenthesized abbreviation or method e.g. '(TIBC)' or '(Hb)'
    m_paren = re.match(r"^\s*(\([A-Za-z0-9/.\s+-]+\))\s*", remainder)
    if m_paren:
        display_name = f"{display_name} {m_paren.group(1).strip()}"
        remainder = remainder[m_paren.end() :].strip(" *•·:,-|")

    if not _has_result_signature(remainder) and not re.match(r"^" + NUMBER, remainder):
        return None
    return _build_result(
        alias=alias,
        display_name=display_name,
        value_line=remainder,
        page_number=page_number,
        source_text=line,
        section_hint=section_hint,
        confidence=0.98,
        line_index=line_index,
    )


def _parse_generic_compact_line(
    line: str, page_number: int, section_hint: str | None, line_index: int
) -> RawTest | None:
    clean_line = line.lstrip(" *•·\t")
    if (
        _looks_like_metadata_or_noise(line)
        or _looks_like_metadata_or_noise(clean_line)
        or HEADER_RE.match(clean_line)
        or _is_prose_line(line)
    ):
        return None
    # 1. Match quantitative row with VAL_NUMBER
    match = re.match(
        r"^([A-Za-z0-9][A-Za-z0-9 /(),\[\].%+&\-':_]{1,100}?)\s+("
        + VAL_NUMBER
        + r")\b(.*)$",
        clean_line,
    )
    is_qualitative = False
    if not match:
        # 2. Match qualitative row with QUAL_WORDS_RE (e.g. "Anti-CCP Negative Negative", "HBsAg Non-Reactive Non-Reactive")
        match = re.match(
            r"^([A-Za-z0-9][A-Za-z0-9 /(),\[\].%+&\-':_]{1,100}?)\s+("
            + QUAL_WORDS_RE.pattern
            + r")\b(.*)$",
            clean_line,
            re.I,
        )
        is_qualitative = True
    if not match:
        return None
    name = match.group(1).strip(" *:-|")
    if re.match(r"^\d+\.\d+", name) or re.search(
        rf"(?:^|\s)(?:{UNIT_PATTERN})\s*$", name, re.I
    ):
        return None
    lower_name = name.lower().rstrip(":")

    disallowed_exact = {
        "age",
        "sex",
        "gender",
        "date",
        "name",
        "patient",
        "patient name",
        "vial",
        "vial id",
        "sample",
        "sample id",
        "sample type",
        "specimen",
        "doctor",
        "dr",
        "ref by",
        "uhid",
        "barcode",
        "phone",
        "email",
        "reg no",
        "bill no",
        "ip no",
        "op no",
        "sid",
        "status",
        "test",
        "result",
        "investigation",
        "parameter",
        "profile",
        "hospital",
        "clinic",
    }
    if lower_name in disallowed_exact:
        return None
    if len(name.split()) > 10 or re.search(
        r"\b(?:method|interpretation|reference|interval|remarks?|care|journal|annals|suppl|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|years?|months?|days?|male|female)\b",
        name,
        re.I,
    ):
        return None
    if not re.search(r"[A-Za-z]", name):
        return None
    if any(
        token in lower_name.split()
        for token in (
            "age",
            "gender",
            "sex",
            "patient",
            "uhid",
            "barcode",
            "vial",
            "birthday",
            "fetus",
            "fetuses",
            "smoker",
            "diabetes",
            "ivf",
            "origin",
            "weight",
        )
    ):
        return None
    tail = f"{match.group(2)} {match.group(3)}".strip()
    if not is_qualitative and not _has_result_signature(tail):
        return None
    # Patient demographics rows end with Male/Female or contain DOB dates, not lab tests!
    if re.search(r"\b(?:Male|Female)\b", tail, re.I) and not re.search(
        r"\b(?:Male|Female)\s*:", tail, re.I
    ):
        return None
    if re.search(r"\b\d{1,2}-[A-Za-z]{3}-\d{4}\b", tail):
        return None
    return _build_result(
        alias=None,
        display_name=name,
        value_line=tail,
        page_number=page_number,
        source_text=line,
        section_hint=section_hint,
        confidence=0.82,
        line_index=line_index,
    )


def _build_result(
    alias,
    display_name,
    value_line,
    page_number,
    source_text,
    section_hint,
    confidence,
    line_index,
):
    # Check if value starts with a count range like "10-12 /HPF 0-5" or "4-5 /HPF 0-5"
    m_count = re.match(
        r"^(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)\s*(?:("
        + UNIT_PATTERN
        + r")\s+)?(.*)$",
        value_line.strip(),
        re.I,
    )
    if m_count and (
        "HPF" in value_line.upper() or "/" in value_line or m_count.group(2)
    ):
        raw_val = m_count.group(1).replace(" ", "")
        val_str = raw_val.split("-")[0].replace("–", "")
        value = parse_number(val_str)
        raw_unit = m_count.group(2)
        tail = m_count.group(3).strip(" :-|")
        reference = _extract_reference(tail) or (tail if tail else None)
        status = _extract_status(tail)
        return RawTest(
            test_name=display_name.strip(" *:-|"),
            canonical_name=ALIASES.get(alias) if alias else None,
            value=value,
            raw_value=raw_val,
            raw_unit=raw_unit,
            reference_range=reference,
            raw_status=status,
            page_number=page_number,
            source_text=source_text,
            section_hint=section_hint,
            extraction_confidence=_confidence(confidence, raw_unit, reference),
            line_index=line_index,
        )

    # Check if value starts with a ratio like "<1:10000", "1:8156", "1:160 ratio < 1:80" or "1:80" (Titre)
    m_ratio = re.match(
        r"^((?:<|>|<=|>=)?\s*\d+:\d+)\b(?:\s+(" + UNIT_PATTERN + r"))?(.*)$",
        value_line.strip(),
        re.I,
    )
    if m_ratio:
        raw_val = m_ratio.group(1).replace(" ", "")
        raw_unit = m_ratio.group(2) or "ratio"
        tail = m_ratio.group(3).strip(" :-|")
        reference = _extract_reference(tail) or (tail if tail else None)
        status = _extract_status(tail)
        return RawTest(
            test_name=display_name.strip(" *:-|"),
            canonical_name=ALIASES.get(alias) if alias else None,
            value=raw_val,
            raw_value=raw_val,
            raw_unit=raw_unit,
            reference_range=reference,
            raw_status=status,
            page_number=page_number,
            source_text=source_text,
            section_hint=section_hint,
            extraction_confidence=_confidence(confidence, raw_unit, reference),
            line_index=line_index,
        )

    # Clean leading hyphenated noise fragments (e.g. "83- 1 00-06" -> "1 00-06")
    clean_val = re.sub(r"^\s*\d+[-–]\s+(\d+)", r"\1", value_line.strip())
    # Also strip common sub-row annotations like "Calculated" or "Estimated"
    clean_val = re.sub(r"^(?:calculated|estimated)\s+", "", clean_val, flags=re.I)

    # If the value line contains ONLY a reference range (e.g. "% 40-70" or "40-70 %") with no separate value,
    # do NOT misparse the lower bound of the range as the test result!
    m_only_range = re.match(
        r"^(?:("
        + UNIT_PATTERN
        + r")\s*)?("
        + NUMBER
        + r")\s*[-–]\s*("
        + NUMBER
        + r")(?:\s*("
        + UNIT_PATTERN
        + r"))?\s*$",
        clean_val.strip(),
        re.I,
    )
    if m_only_range:
        return None

    value_match = re.search(VAL_NUMBER, clean_val)
    if value_match:
        raw_value = value_match.group().strip()
        after_value = clean_val[value_match.end() :].strip(" :-|")

        unit_match = re.match(rf"({UNIT_PATTERN})(?=\s|$|:)", after_value, re.I)
        raw_unit = unit_match.group(1) if unit_match else None
        tail = (
            after_value[unit_match.end() :].strip(" :-|") if unit_match else after_value
        )

        reference = _extract_reference(tail)
        status = _extract_status(tail)

        # If unit was not immediately after value, check if it is at the end of the line
        # Layout: Result | Flag | Reference Value | Unit (e.g. "12.5 Low 13.0 - 17.0 g/dL")
        if not raw_unit and tail:
            trailing_unit_match = re.search(
                rf"(?:^|\s)({UNIT_PATTERN})\s*$", tail, re.I
            )
            if trailing_unit_match:
                raw_unit = trailing_unit_match.group(1)

        # A known result normally has a unit or reference. A bare number is allowed
        # only for explicit structured rows (e.g. a custom qualitative/count field).
        if not raw_unit and not reference and not status and alias is None:
            return None

        parsed_val = parse_number(raw_value)
        # Check for invalid percentages (> 100%) caused by concatenated OCR columns
        # (e.g. differential leukocyte count column "28631 %")
        if raw_unit == "%" and parsed_val is not None and parsed_val > 100:
            return None

        return RawTest(
            test_name=display_name.strip(" *:-|"),
            canonical_name=ALIASES.get(alias) if alias else None,
            value=parsed_val,
            raw_value=raw_value,
            raw_unit=raw_unit,
            reference_range=reference,
            raw_status=status,
            page_number=page_number,
            source_text=source_text,
            section_hint=section_hint,
            extraction_confidence=_confidence(confidence, raw_unit, reference),
            line_index=line_index,
        )

    # Check for qualitative value (e.g. "Negative Negative", "TRACE Negative", "PRESENT Absent", "YELLOW Pale Yellow/Amber")
    clean_val_line = value_line.strip()
    words = clean_val_line.split()
    if words:
        first_two = " ".join(words[:2]).lower() if len(words) >= 2 else ""
        if first_two in {
            "pale yellow",
            "not seen",
            "non-reactive",
            "slightly turbid",
            "not detected",
        }:
            val_candidate = " ".join(words[:2])
            tail = " ".join(words[2:]).strip(" :-|")
        else:
            val_candidate = words[0]
            tail = " ".join(words[1:]).strip(" :-|")

        if re.search(QUAL_WORDS_RE, val_candidate):
            reference = _extract_reference(tail) or (tail if tail else None)
            status = _extract_status(tail)
            return RawTest(
                test_name=display_name.strip(" *:-|"),
                canonical_name=ALIASES.get(alias) if alias else None,
                value=val_candidate,
                raw_value=val_candidate,
                raw_unit=None,
                reference_range=reference,
                raw_status=status,
                page_number=page_number,
                source_text=source_text,
                section_hint=section_hint,
                extraction_confidence=_confidence(confidence, None, reference),
                line_index=line_index,
            )

    return None


def _confidence(base: float, unit: str | None, reference: str | None) -> float:
    score = base
    if unit:
        score += 0.01
    if reference:
        score += 0.01
    return min(score, 0.99)


def _extract_reference(tail: str) -> str | None:
    tail = " ".join(tail.strip().split())
    if not tail:
        return None

    # Keep demographic alternatives intact so analysis_service can select the
    # correct range using patient sex.
    if re.search(r"\b(?:male|female|men|women|males|females)\s*:", tail, re.I):
        return tail

    # Strip full dates and timestamps so they cannot be mistaken for reference intervals
    cleaned = re.sub(
        r"\b\d{1,2}[-/](?:\d{1,2}|[A-Za-z]{3})[-/]\d{2,4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b",
        " ",
        tail,
    )
    cleaned = re.sub(
        r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b|\b\d{1,2}\.\d{2}\s*(?:am|pm)\b",
        " ",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(r":1\b", "", cleaned)
    # Strip exponent notations, count multipliers, repeated units, and OCR ditto tokens
    cleaned = re.sub(r"x?10(?:\^|\~|\ˆ|\()\d+\)?[a-zA-Z0-9/]*", " ", cleaned)
    cleaned = re.sub(r"/(?:mm3|cumm|ul|µL|uL)", " ", cleaned, flags=re.I)
    cleaned = re.sub(
        r"\b(?:mm3|cumm|um|pg|fl|fL|g/dL|milln/ul|cells/cumm|do)\b",
        " ",
        cleaned,
        flags=re.I,
    )
    cleaned = " ".join(cleaned.strip(" -|:").split())
    if not cleaned:
        return None

    # Strip gestational weeks prefixes like "9 Weeks: 4.77" so they don't produce invalid "9 - 4.77"
    cleaned = re.sub(
        r"\b\d{1,2}\s*(?:th|st|nd|rd)?\s*weeks?\s*:\s*", " ", cleaned, flags=re.I
    )
    cleaned = re.sub(
        r"\b\d{1,2}\s*(?:th|st|nd|rd)?\s*week\b\s*", " ", cleaned, flags=re.I
    )
    cleaned = re.sub(
        r"\b\d+[-–]\d+\s*(?:years?|yrs?|months?|days?)\b\s*", " ", cleaned, flags=re.I
    )

    # Check for prenatal risk ratio in reference range, e.g. ">1:250: Low Risk <1:250: High Risk"
    m_ratio_ref = re.search(
        r"((?:>|<|>=|<=)?\s*1:\d+(?:\s*(?:low|high)\s*risk)?)", cleaned, re.I
    )
    if m_ratio_ref:
        return m_ratio_ref.group(1).strip()

    match = re.search(rf"(({NUMBER})\s*(?:-|to|–)\s*({NUMBER}))", cleaned, re.I)
    if match:
        return re.sub(r"\s*-\s*", " - ", match.group(1).replace("–", "-"))

    match = re.search(
        rf"((?:upto|up to|less than|greater than|above|below|<=|>=|=|<|>|≤|≥)\s*{NUMBER})",
        cleaned,
        re.I,
    )
    if match:
        return match.group(1)

    # Space-separated range: e.g. "4 10", "3.8 6.5", "4,000 11,000", "1,50,000 4,50,000"
    m_space = re.search(rf"(?<![\d.])({NUMBER})\s+({NUMBER})(?![\d.])", cleaned)
    if m_space:
        try:
            n1 = parse_number(m_space.group(1))
            n2 = parse_number(m_space.group(2))
            if n1 is not None and n2 is not None and n1 < n2:
                return f"{m_space.group(1)} - {m_space.group(2)}"
        except (ValueError, TypeError):
            pass

    nums = re.findall(NUMBER, cleaned)
    if len(nums) == 2 and not _is_prose_line(cleaned):
        try:
            n1 = parse_number(nums[0])
            n2 = parse_number(nums[1])
            if n1 is not None and n2 is not None and n1 < n2:
                return f"{nums[0]} - {nums[1]}"
        except (ValueError, TypeError):
            pass
    return None


def _extract_status(tail: str) -> str | None:
    lower = tail.lower()
    if "low risk" in lower:
        return "Normal"
    if "high risk" in lower:
        return "High"
    match = re.search(r"\b(high|low|normal|h|l|n|abnormal)\b", tail, re.I)
    return match.group(1) if match else None


def _clean_label(line: str) -> str:
    cleaned = " ".join(line.strip(" *•·:,-|\t").split())
    cleaned = re.sub(r"\s+\b(?:calculated|estimated)\b.*$", "", cleaned, flags=re.I)
    return cleaned.strip(" *•·:,-|\t")


def _is_hard_stop(line: str) -> bool:
    return bool(HARD_STOP_RE.match(line.strip()))


def _looks_like_metadata_or_noise(line: str) -> bool:
    stripped = line.strip()
    clean_lead = stripped.lstrip(" *•·:,-|\t")
    if (
        METADATA_RE.match(stripped)
        or METADATA_RE.match(clean_lead)
        or _is_hard_stop(stripped)
    ):
        return True
    if re.match(
        r"^\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?(?:\s+interval)?$", stripped, re.I
    ):
        return True
    if stripped.lower().rstrip(".") in {
        "calculated",
        "estimated",
        "capillary photometry",
    }:
        return True
    if re.search(
        r"\b(?:smart\s+pathology\s+laboratory|drlogy\.com|sample\s+collection)\b",
        stripped,
        re.I,
    ):
        return True
    if re.search(
        r"(?:page\s*\d+\s+of\s+\d+|\*\*\*\s*end\s+of\s+report\s*\*\*\*)", stripped, re.I
    ):
        return True
    if re.search(
        r"(?:customer\s*care|www\.|http|fax|barcode|mc-\d+|clia\s*id|iso\s*15189)",
        stripped,
        re.I,
    ):
        return True
    # Columnar patient/administrative rows can be flattened into one OCR line.
    if re.search(r"\b(?:PT-[A-Z0-9]+|SMP-[A-Z0-9]+)\b", stripped, re.I):
        return True
    if re.search(
        r"\b\d{1,3}\s*(?:YRS?|YEARS?|Y)\s*/\s*(?:MALE|FEMALE|M|F)\b", stripped, re.I
    ):
        return True
    if re.search(r"\b(?:PATIENT\s+DOB|DOB/AGE|MRN\s+SEX)\b", stripped, re.I):
        return True
    if re.search(
        r"\b\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}[/\s]+\d{1,3}\s+(?:\d+\s+)?(?:Male|Female)\b",
        stripped,
        re.I,
    ):
        return True

    # Age + units (years/months/days) or age + date/gender lines are patient metadata
    if re.search(r"\b(?:years?|yrs?|months?|days?)\b", stripped, re.I):
        non_hormone = re.sub(r"\bsex\s+hormone\b", "", stripped, flags=re.I)
        if re.search(
            r"\b(?:age|dob|born|date|male|female|sex|gender|patient)\b",
            non_hormone,
            re.I,
        ):
            return True
    if re.search(r"\bage\s*[:\-]?\s*\d+\s*(?:years?|yrs?|y)?\b", stripped, re.I):
        return True
    if re.search(
        r"\b(?:FINAL REPORT|VERIFIED CLINICAL REPORT|BLOOD LAB REPORT|LABORATORY REPORT|PATHOLOGY REPORT|DIAGNOSTIC REPORT)\b",
        stripped,
        re.I,
    ):
        return True

    if re.search(
        r"\b(?:tez\.health|healthcare@home|\.com|\.org|\.in|\.net)\b", stripped, re.I
    ):
        return True
    if re.search(
        r"\b(?:diabetes care|standards of medical care|\b\d{4}\s+jan;\d+)\b",
        stripped,
        re.I,
    ):
        return True
    if re.match(r"^\d{4}-\d{2}-\d{4}$", stripped):
        return True
    return False


def _is_prose_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if _looks_like_metadata_or_noise(stripped):
        return True
    if len(stripped) > 140 and re.search(r"[.!?]", stripped):
        return True
    # Bullet points in interpretation text are not custom tests unless they
    # have an explicit unit/reference/result structure.
    if stripped.startswith(("•", "·", "-")) and not _has_result_signature(
        _clean_label(stripped)
    ):
        return True
    # Long explanatory lines with ordinary prose vocabulary are not analytes.
    words = len(stripped.split())
    if words >= 12 and NARRATIVE_RE.search(stripped):
        return True
    return False


def _has_result_signature(text: str) -> bool:
    if re.search(QUAL_WORDS_RE, text):
        return True
    if not re.search(NUMBER, text):
        return False
    if re.search(UNIT_PATTERN, text, re.I):
        return True
    if re.search(
        r"(?:\b(?:males?|females?|men|women)\s*:|\b(?:high|low|normal|sensitive|resistant|susceptible)\b|(?:<|>)\s*\d)",
        text,
        re.I,
    ):
        return True

    # Strip full dates and timestamps so e.g. "26-03-2026" or "10:30 AM" is not treated as a range
    text_no_dates = re.sub(
        r"\b\d{1,2}[-/](?:\d{1,2}|[A-Za-z]{3})[-/]\d{2,4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b",
        " ",
        text,
    )
    text_no_dates = re.sub(
        r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b|\b\d{1,2}\.\d{2}\s*(?:am|pm)\b",
        " ",
        text_no_dates,
        flags=re.I,
    )

    # Range: e.g. 10 - 20, 10 to 20, 0.5 - 2.5
    m_range = re.search(rf"({NUMBER})\s*(?:-|to|–)\s*({NUMBER})", text_no_dates)
    if m_range:
        try:
            n1 = parse_number(m_range.group(1))
            n2 = parse_number(m_range.group(2))
            if n1 is not None and n2 is not None and n1 < n2:
                return True
        except (ValueError, TypeError):
            pass

    # Any two consecutive space-separated numbers where first < second
    raw_nums = re.findall(r"(?<![\d.])([0-9]{1,4}(?:\.\d+)?)(?![\d.])", text_no_dates)
    nums: list[float] = []
    for x in raw_nums:
        try:
            nums.append(float(x.replace(",", "")))
        except ValueError:
            pass
    for i in range(len(nums) - 1):
        if nums[i] < nums[i + 1]:
            return True
    return False


def _is_value_fragment(line: str) -> bool:
    if not line or _looks_like_metadata_or_noise(line) or _is_prose_line(line):
        return False
    return bool(
        re.search(NUMBER, line)
        or re.search(UNIT_PATTERN, line, re.I)
        or re.search(r"\b(?:males?|females?|men|women)\s*:", line, re.I)
    )
