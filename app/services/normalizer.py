import re


UNIT_MAP = {
    "gm%": "g/dL",
    "gms%": "g/dL",
    "g/dl": "g/dL",
    "g/dl.": "g/dL",
    "mg/dl": "mg/dL",
    "mg/dl.": "mg/dL",
    "mg/l": "mg/L",
    "µiu/ml": "µIU/mL",
    "µiu/ml.": "µIU/mL",
    "miu/l": "mIU/L",
    "iu/l": "IU/L",
    "fl": "fL",
    "pg": "pg",
    "mmol/l": "mmol/L",
    "meq/l": "mEq/L",
    "ng/ml": "ng/mL",
    "pg/ml": "pg/mL",
    "ug/dl": "µg/dL",
    "μg/dl": "µg/dL",
    "ug/ml": "µg/mL",
    "ug/ml.": "µg/mL",
    "µg/ml": "µg/mL",
    "mcg/ml": "µg/mL",
    "mcg/dl": "µg/dL",
    "nmol/l": "nmol/L",
    "µmol/l": "µmol/L",
    "umol/l": "µmol/L",
    "?mol/l": "µmol/L",
    "pmol/l": "pmol/L",
    "u/ml": "U/mL",
    "u/l": "U/L",
    "miu/ml": "mIU/mL",
    "mlu/ml": "mIU/mL",
    "mom": "MoM",
    "s/co": "S/CO",
    "mm": "mm",
    "ratio": "ratio",
    "cells/cumm": "cells/cumm",
    "millions/cumm": "millions/cumm",
    "million/cumm": "million/cumm",
    "10ˆ3/µl": "10^3/µL",
    "10^3/µl": "10^3/µL",
    "x10^3/µl": "x10^3/µL",
    "x10ˆ3/µl": "x10^3/µL",
    "lakhs/cumm": "lakhs/cumm",
}


def clean_text(text: str) -> str:
    replacements = {
        "\u00a0": " ",
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "10~9/L": "10^9/L",
        "10~12/L": "10^12/L",
        "10^9/L": "10^9/L",
        "10^12/L": "10^12/L",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def normalize_unit(unit: str | None) -> str | None:
    if not unit:
        return None
    cleaned = clean_text(unit).strip()
    key = cleaned.lower()
    return UNIT_MAP.get(key, cleaned)


def parse_number(value: str) -> float | None:
    if not value:
        return None
    value = value.strip().replace(",", "")
    value = value.replace("O", "0").replace("o", "0")
    match = re.search(r"[-+]?\d+(?:\.\d+)?", value)
    return float(match.group()) if match else None
