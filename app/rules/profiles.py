PROFILE_RULES: dict[str, list[str]] = {
    "CBC": [
        "hemoglobin", "hematocrit", "wbc", "rbc", "platelets", "mcv", "mch", "mchc",
        "mpv", "plateletcrit", "pdw", "p_lcr", "rdw", "neutrophils", "lymphocytes",
        "eosinophils", "monocytes", "basophils", "absolute_neutrophil_count",
        "absolute_lymphocyte_count", "absolute_eosinophil_count", "absolute_monocyte_count",
        "absolute_basophil_count", "esr",
    ],
    "Kidney Profile": ["creatinine", "urea", "bun", "uric_acid", "egfr"],
    "Electrolyte Profile": ["sodium", "potassium", "chloride", "bicarbonate", "calcium"],
    "Liver Profile": [
        "total_bilirubin", "direct_bilirubin", "indirect_bilirubin", "ast", "alt", "ast_alt_ratio",
        "alp", "ggt", "total_protein", "albumin", "globulin", "ag_ratio",
    ],
    "Lipid Profile": ["total_cholesterol", "hdl", "ldl", "triglycerides", "vldl"],
    "Thyroid Profile": ["tsh", "free_t3", "free_t4", "total_t3", "total_t4"],
    "Iron Profile": ["iron", "tibc", "transferrin", "transferrin_saturation", "ferritin"],
    "Diabetes Profile": ["fasting_glucose", "random_glucose", "glucose", "hba1c"],
    "Inflammation Profile": ["crp"],
    "Vitamin Profile": ["vitamin_d", "vitamin_b12"],
}

PROFILE_KEYWORDS: dict[str, list[str]] = {
    "CBC": ["cbc", "complete blood count", "haemogram", "hematology"],
    "Kidney Profile": ["kidney", "renal", "kft", "renal function", "urea"],
    "Electrolyte Profile": ["electrolyte"],
    "Liver Profile": ["liver", "lft", "hepatic"],
    "Lipid Profile": ["lipid", "cholesterol"],
    "Thyroid Profile": ["thyroid", "tft", "thyroid profile"],
    "Iron Profile": ["iron", "iron deficiency"],
    "Diabetes Profile": ["diabetes", "blood sugar", "glucose", "hba1c"],
    "Inflammation Profile": ["inflammation", "c-reactive protein", "crp"],
    "Vitamin Profile": ["vitamin"],
}
