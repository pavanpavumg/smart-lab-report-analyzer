from app.rules.profiles import PROFILE_KEYWORDS, PROFILE_RULES


def detect_profile(canonical_name: str | None, section_hint: str | None = None) -> str:
    # Known test identity is more reliable than a page-level heading because a
    # single page can contain multiple profiles.
    canonical = canonical_name or ""
    for profile, names in PROFILE_RULES.items():
        if canonical in names:
            return profile

    # For unknown/custom tests, use the nearest available section hint.
    if section_hint:
        hint = section_hint.lower()
        for profile, keywords in PROFILE_KEYWORDS.items():
            if any(keyword.lower() in hint for keyword in keywords):
                return profile

    return "Custom"
