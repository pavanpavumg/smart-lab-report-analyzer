def calculate_flag(
    value: float | int | str | None,
    low: float | None,
    high: float | None,
    raw_status: str | None = None,
    raw_reference: str | None = None,
    canonical_name: str | None = None,
) -> str:
    if raw_status:
        status = raw_status.strip().lower()
        if status in {"low", "l", "below"}:
            return "LOW"
        if status in {"high", "h", "above", "resistant", "intermediate", "positive", "present", "reactive", "seen", "detected"}:
            return "HIGH"
        if status in {"normal", "n", "within range", "sensitive", "susceptible", "negative", "absent", "nil", "clear", "non-reactive", "not detected"}:
            return "NORMAL"

    if canonical_name in {"papp_a_mom", "free_beta_hcg_mom", "nt_mom"} and isinstance(value, (int, float)):
        return "NORMAL" if 0.4 <= value <= 2.5 else ("HIGH" if value > 2.5 else "LOW")

    if canonical_name == "nt_value" and isinstance(value, (int, float)):
        return "NORMAL" if 0.0 <= value <= 3.0 else "HIGH"

    if isinstance(value, (int, float)):
        if low is not None and value < low:
            return "LOW"
        if high is not None and value > high:
            return "HIGH"
        if low is not None or high is not None:
            return "NORMAL"
        return "UNKNOWN"

    if isinstance(value, str):
        v_clean = value.strip().lower()
        if v_clean in {
            "negative", "absent", "nil", "normal", "clear",
            "yellow", "pale yellow", "non-reactive", "not seen",
            "sensitive", "susceptible", "not detected", "46,xy", "46,xx",
        } or "normal" in v_clean:
            return "NORMAL"
        if v_clean in {
            "positive", "present", "trace", "turbid", "cloudy",
            "hazy", "reactive", "seen", "resistant", "intermediate",
            "detected",
        }:
            return "HIGH"

        import re
        m_r = re.match(r"^(?:<|<=)?\s*1:(\d+)", v_clean)
        if m_r:
            denom = int(m_r.group(1))
            return "NORMAL" if denom >= 250 else "HIGH"

        if raw_reference:
            ref_clean = raw_reference.strip().lower()
            if v_clean in ref_clean:
                return "NORMAL"

    return "UNKNOWN"

