"""Canonical lab-test metadata.

LOINC mappings are only supplied where the canonical test is sufficiently
specific. Unknown/custom tests deliberately keep loinc_code=None rather than
guessing a code.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TestMeta:
    test_name: str
    test_id: str
    loinc_code: str | None
    profile: str


CATALOG: dict[str, TestMeta] = {
    # CBC
    "hemoglobin": TestMeta("Hemoglobin", "HEMOGLOBIN", "718-7", "CBC"),
    "hematocrit": TestMeta("Hematocrit", "HEMATOCRIT", "4544-3", "CBC"),
    "wbc": TestMeta("White Blood Cell Count", "WBC", "6690-2", "CBC"),
    "rbc": TestMeta("Red Blood Cell Count", "RBC", "789-8", "CBC"),
    "platelets": TestMeta("Platelet Count", "PLATELETS", "777-3", "CBC"),
    "mcv": TestMeta("MCV", "MCV", "787-2", "CBC"),
    "mch": TestMeta("MCH", "MCH", "785-6", "CBC"),
    "mchc": TestMeta("MCHC", "MCHC", "786-4", "CBC"),
    "mpv": TestMeta("MPV", "MPV", "32623-1", "CBC"),
    "plateletcrit": TestMeta("Plateletcrit", "PLATELETCRIT", "51637-7", "CBC"),
    "pdw": TestMeta("PDW", "PDW", "51631-0", "CBC"),
    "p_lcr": TestMeta("P-LCR", "P_LCR", "48386-7", "CBC"),
    "rdw": TestMeta("RDW", "RDW", "788-0", "CBC"),
    "neutrophils": TestMeta("Neutrophils", "NEUTROPHILS", "770-8", "CBC"),
    "lymphocytes": TestMeta("Lymphocytes", "LYMPHOCYTES", "736-9", "CBC"),
    "eosinophils": TestMeta("Eosinophils", "EOSINOPHILS", "713-8", "CBC"),
    "monocytes": TestMeta("Monocytes", "MONOCYTES", "5905-5", "CBC"),
    "basophils": TestMeta("Basophils", "BASOPHILS", "706-2", "CBC"),
    "absolute_neutrophil_count": TestMeta("Absolute Neutrophil Count", "ANC", None, "CBC"),
    "absolute_lymphocyte_count": TestMeta("Absolute Lymphocyte Count", "ALC", None, "CBC"),
    "absolute_eosinophil_count": TestMeta("Absolute Eosinophil Count", "AEC", None, "CBC"),
    "absolute_monocyte_count": TestMeta("Absolute Monocyte Count", "AMC", None, "CBC"),
    "absolute_basophil_count": TestMeta("Absolute Basophil Count", "ABC", None, "CBC"),
    "esr": TestMeta("ESR", "ESR", "4537-7", "CBC"),

    # Kidney
    "creatinine": TestMeta("Creatinine", "CREATININE", "2160-0", "Kidney Profile"),
    "urea": TestMeta("Urea", "UREA", None, "Kidney Profile"),
    "bun": TestMeta("Blood Urea Nitrogen", "BUN", "3094-0", "Kidney Profile"),
    "uric_acid": TestMeta("Uric Acid", "URIC_ACID", "3084-1", "Kidney Profile"),
    "egfr": TestMeta("eGFR", "EGFR", "62238-1", "Kidney Profile"),

    # Electrolytes
    "sodium": TestMeta("Sodium", "SODIUM", "2951-2", "Electrolyte Profile"),
    "potassium": TestMeta("Potassium", "POTASSIUM", "2823-3", "Electrolyte Profile"),
    "chloride": TestMeta("Chloride", "CHLORIDE", "2075-0", "Electrolyte Profile"),
    "bicarbonate": TestMeta("Bicarbonate", "BICARBONATE", "1963-8", "Electrolyte Profile"),
    "calcium": TestMeta("Calcium", "CALCIUM", "17861-6", "Electrolyte Profile"),

    # Liver
    "total_bilirubin": TestMeta("Total Bilirubin", "TOTAL_BILIRUBIN", "1975-2", "Liver Profile"),
    "direct_bilirubin": TestMeta("Direct Bilirubin", "DIRECT_BILIRUBIN", "1968-7", "Liver Profile"),
    "indirect_bilirubin": TestMeta("Indirect Bilirubin", "INDIRECT_BILIRUBIN", "1971-1", "Liver Profile"),
    "ast": TestMeta("AST", "AST", "1920-8", "Liver Profile"),
    "alt": TestMeta("ALT", "ALT", "1742-6", "Liver Profile"),
    "ast_alt_ratio": TestMeta("AST/ALT Ratio", "AST_ALT_RATIO", None, "Liver Profile"),
    "alp": TestMeta("Alkaline Phosphatase", "ALP", "6768-6", "Liver Profile"),
    "ggt": TestMeta("Gamma-Glutamyl Transferase", "GGT", "2324-2", "Liver Profile"),
    "total_protein": TestMeta("Total Protein", "TOTAL_PROTEIN", "2885-2", "Liver Profile"),
    "albumin": TestMeta("Albumin", "ALBUMIN", "1751-7", "Liver Profile"),
    "globulin": TestMeta("Globulin", "GLOBULIN", None, "Liver Profile"),
    "ag_ratio": TestMeta("A/G Ratio", "AG_RATIO", None, "Liver Profile"),

    # Lipid
    "total_cholesterol": TestMeta("Total Cholesterol", "TOTAL_CHOLESTEROL", "2093-3", "Lipid Profile"),
    "hdl": TestMeta("HDL Cholesterol", "HDL", "2085-9", "Lipid Profile"),
    "ldl": TestMeta("LDL Cholesterol", "LDL", "2089-1", "Lipid Profile"),
    "triglycerides": TestMeta("Triglycerides", "TRIGLYCERIDES", "2571-8", "Lipid Profile"),
    "vldl": TestMeta("VLDL Cholesterol", "VLDL", None, "Lipid Profile"),
    "chol_hdl_ratio": TestMeta("Cholesterol / HDL Ratio", "CHOL_HDL_RATIO", "9830-1", "Lipid Profile"),
    "hdl_ldl_ratio": TestMeta("HDL / LDL Ratio", "HDL_LDL_RATIO", None, "Lipid Profile"),
    "ldl_hdl_ratio": TestMeta("LDL / HDL Ratio", "LDL_HDL_RATIO", "11054-4", "Lipid Profile"),

    # Thyroid
    "tsh": TestMeta("TSH", "TSH", "3016-3", "Thyroid Profile"),
    "free_t3": TestMeta("Free T3", "FREE_T3", "3051-0", "Thyroid Profile"),
    "free_t4": TestMeta("Free T4", "FREE_T4", "3024-7", "Thyroid Profile"),
    "total_t3": TestMeta("Total T3", "TOTAL_T3", "3053-6", "Thyroid Profile"),
    "total_t4": TestMeta("Total T4", "TOTAL_T4", "3026-2", "Thyroid Profile"),

    # Iron
    "iron": TestMeta("Iron", "IRON", "2498-4", "Iron Profile"),
    "tibc": TestMeta("Total Iron Binding Capacity (TIBC)", "TIBC", "2500-7", "Iron Profile"),
    "transferrin": TestMeta("Transferrin", "TRANSFERRIN", "3034-6", "Iron Profile"),
    "transferrin_saturation": TestMeta("Transferrin Saturation", "TRANSFERRIN_SATURATION", None, "Iron Profile"),
    "ferritin": TestMeta("Ferritin", "FERRITIN", "2276-4", "Iron Profile"),

    # Diabetes
    "fasting_glucose": TestMeta("Fasting Glucose", "FASTING_GLUCOSE", "1558-6", "Diabetes Profile"),
    "random_glucose": TestMeta("Random Glucose", "RANDOM_GLUCOSE", "2345-7", "Diabetes Profile"),
    "glucose": TestMeta("Glucose", "GLUCOSE", "2345-7", "Diabetes Profile"),
    "hba1c": TestMeta("HbA1c", "HBA1C", "4548-4", "Diabetes Profile"),
    "average_glucose": TestMeta("Average Blood Glucose", "AVERAGE_GLUCOSE", "27353-2", "Diabetes Profile"),

    # Urine Examination
    "urine_color": TestMeta("Urine Colour", "URINE_COLOR", None, "Urine Examination"),
    "urine_appearance": TestMeta("Urine Appearance", "URINE_APPEARANCE", None, "Urine Examination"),
    "urine_ph": TestMeta("Urine pH", "URINE_PH", "5803-2", "Urine Examination"),
    "urine_specific_gravity": TestMeta("Specific Gravity", "SPECIFIC_GRAVITY", "2965-2", "Urine Examination"),
    "urine_protein": TestMeta("Urine Protein", "URINE_PROTEIN", "20454-5", "Urine Examination"),
    "urine_urobilinogen": TestMeta("Urobilinogen", "UROBILINOGEN", "20405-7", "Urine Examination"),
    "urine_ketone": TestMeta("Ketone Bodies", "KETONE_BODIES", "2514-8", "Urine Examination"),
    "urine_bile_salts": TestMeta("Bile Salts", "BILE_SALTS", None, "Urine Examination"),
    "urine_bile_pigments": TestMeta("Bile Pigments", "BILE_PIGMENTS", None, "Urine Examination"),
    "urine_blood": TestMeta("Urine Blood", "URINE_BLOOD", "5794-3", "Urine Examination"),
    "urine_nitrite": TestMeta("Nitrite", "NITRITE", "5802-4", "Urine Examination"),
    "urine_glucose": TestMeta("Urine Glucose", "URINE_GLUCOSE", "25428-4", "Urine Examination"),
    "pus_cells": TestMeta("Pus Cells", "PUS_CELLS", "6784-3", "Urine Examination"),
    "epithelial_cells": TestMeta("Epithelial Cells", "EPITHELIAL_CELLS", "5788-5", "Urine Examination"),
    "urine_rbcs": TestMeta("Urine RBCs", "URINE_RBCS", "13945-1", "Urine Examination"),
    "urine_casts": TestMeta("Casts", "CASTS", "24124-0", "Urine Examination"),
    "urine_crystals": TestMeta("Crystals", "CRYSTALS", "5784-4", "Urine Examination"),
    "urine_bacteria": TestMeta("Bacteria", "BACTERIA", "20447-9", "Urine Examination"),
    "urine_others": TestMeta("Others", "OTHERS", None, "Urine Examination"),

    # Other
    "crp": TestMeta("C-Reactive Protein", "CRP", None, "Inflammation Profile"),
    "rheumatoid_factor": TestMeta("Rheumatoid Factor", "RHEUMATOID_FACTOR", "11572-5", "Inflammation Profile"),
    "cpk": TestMeta("Creatine Kinase (CPK)", "CPK", "2157-6", "Cardiovascular Profile"),
    "vitamin_d": TestMeta("Vitamin D", "VITAMIN_D", "1989-3", "Vitamin Profile"),
    "vitamin_b12": TestMeta("Vitamin B12", "VITAMIN_B12", "2132-9", "Vitamin Profile"),

    # Endocrine / Hormones
    "dhea_s": TestMeta("Dehydroepiandrosterone Sulfate (DHEA-S)", "DHEA_S", "2191-5", "Endocrine Profile"),
    "shbg": TestMeta("Sex Hormone Binding Globulin (SHBG)", "SHBG", "13967-5", "Endocrine Profile"),
    "amh": TestMeta("Anti-Mullerian Hormone (AMH)", "AMH", "38476-8", "Endocrine Profile"),

    # Microbiology / AST
    "organism_isolated": TestMeta("Organism Isolated", "ORGANISM_ISOLATED", None, "Microbiology"),
    "amikacin": TestMeta("Amikacin", "AMIKACIN", None, "Microbiology"),
    "cefepime": TestMeta("Cefepime", "CEFEPIME", None, "Microbiology"),
    "ertapenem": TestMeta("Ertapenem", "ERTAPENEM", None, "Microbiology"),
    "co_trimoxazole": TestMeta("Co-Trimoxazole", "CO_TRIMOXAZOLE", None, "Microbiology"),
    "gentamycin": TestMeta("Gentamycin", "GENTAMYCIN", None, "Microbiology"),
    "imipenem": TestMeta("Imipenem", "IMIPENEM", None, "Microbiology"),
    "meropenem": TestMeta("Meropenem", "MEROPENEM", None, "Microbiology"),
    "piperacillin_tazobactum": TestMeta("Piperacillin-Tazobactum", "PIPERACILLIN_TAZOBACTUM", None, "Microbiology"),
    "tetracycline": TestMeta("Tetracycline", "TETRACYCLINE", None, "Microbiology"),
    "amoxyclav": TestMeta("Amoxyclav", "AMOXYCLAV", None, "Microbiology"),
    "ampicillin": TestMeta("Ampicillin", "AMPICILLIN", None, "Microbiology"),
    "cefotaxime": TestMeta("Cefotaxime", "CEFOTAXIME", None, "Microbiology"),
    "ceftazidime": TestMeta("Ceftazidime", "CEFTAZIDIME", None, "Microbiology"),
    "ceftriaxone": TestMeta("Ceftriaxone", "CEFTRIAXONE", None, "Microbiology"),
    "ciprofloxacin": TestMeta("Ciprofloxacin", "CIPROFLOXACIN", None, "Microbiology"),
    "levofloxacin": TestMeta("Levofloxacin", "LEVOFLOXACIN", None, "Microbiology"),
    "tobramycin": TestMeta("Tobramycin", "TOBRAMYCIN", None, "Microbiology"),

    # Cardiac & Enzymes
    "ldh": TestMeta("Lactate Dehydrogenase (LDH)", "LDH", "2532-0", "Cardiovascular Profile"),
    "nt_probnp": TestMeta("NT-proBNP", "NT_PROBNP", "33762-6", "Cardiovascular Profile"),

    # Maternal & Prenatal Screening
    "papp_a": TestMeta("Pregnancy Associated Plasma Protein-A (PAPP-A)", "PAPP_A", "48385-9", "Maternal Screening Profile"),
    "papp_a_mom": TestMeta("MoM for PAPP-A", "PAPP_A_MOM", None, "Maternal Screening Profile"),
    "nt_value": TestMeta("NT Value (Nuchal Translucency)", "NT_VALUE", "33069-6", "Maternal Screening Profile"),
    "beta_hcg": TestMeta("Beta Human Chorionic Gonadotropin (Beta-hCG)", "BETA_HCG", "21198-7", "Maternal Screening Profile"),
    "free_beta_hcg": TestMeta("Free Beta Human Chorionic Gonadotropin (Free Beta-hCG)", "FREE_BETA_HCG", "21198-7", "Maternal Screening Profile"),
    "free_beta_hcg_mom": TestMeta("MoM for Free Beta-hCG", "FREE_BETA_HCG_MOM", None, "Maternal Screening Profile"),
    "nt_mom": TestMeta("MoM for Nuchal Translucency", "NT_MOM", None, "Maternal Screening Profile"),
    "t21_biochemical_risk": TestMeta("Trisomy 21 (Down Syndrome) Biochemical Risk", "T21_BIOCHEMICAL_RISK", None, "Maternal Screening Profile"),
    "t21_combined_risk": TestMeta("Trisomy 21 (Down Syndrome) Combined Risk", "T21_COMBINED_RISK", None, "Maternal Screening Profile"),
    "t21_age_risk": TestMeta("Trisomy 21 (Down Syndrome) Maternal Age Risk", "T21_AGE_RISK", None, "Maternal Screening Profile"),
    "trisomy_13_18_risk": TestMeta("Trisomy 13/18 with NT Risk", "TRISOMY_13_18_RISK", None, "Maternal Screening Profile"),

    # Cytogenetics & Karyotyping
    "karyotype_iscn": TestMeta("Karyotype (ISCN)", "KARYOTYPE_ISCN", "43427-4", "Cytogenetics"),
    "karyotype_result": TestMeta("Karyotype Analysis Result", "KARYOTYPE_RESULT", "50397-9", "Cytogenetics"),
    "cells_analyzed": TestMeta("Number of Cells Analyzed", "CELLS_ANALYZED", "29768-9", "Cytogenetics"),
    "cells_karyotyped": TestMeta("Number of Cells Karyotyped", "CELLS_KARYOTYPED", "29769-7", "Cytogenetics"),

    # Liver & Bone
    "bile_acid": TestMeta("Total Bile Acids", "BILE_ACID", "14628-2", "Liver Profile"),
    "bone_alkaline_phosphatase": TestMeta("Alkaline Phosphatase Bone Fraction (Ostase)", "ALP_BONE_FRACTION", "17843-4", "Bone Mineral Profile"),

    # Oncology / Tumor Markers
    "ca_15_3": TestMeta("Cancer Antigen 15-3 (CA 15.3)", "CA_15_3", "6875-9", "Tumor Marker Profile"),

    # Serology & Infectious Disease
    "titre": TestMeta("Titre", "TITRE", None, "Serology"),
    "hsv_1_2_igg": TestMeta("Herpes Simplex Virus 1&2 IgG", "HSV_1_2_IGG", None, "Infectious Disease Profile"),

    # Molecular Diagnostics / COVID RT-PCR
    "rdrp_gene": TestMeta("RdRp Gene (SARS-CoV-2 RT-PCR)", "RDRP_GENE", "94533-7", "Molecular Diagnostics"),
    "s_gene": TestMeta("S-Gene (SARS-CoV-2 RT-PCR)", "S_GENE", "94644-2", "Molecular Diagnostics"),
    "s_gene_ma": TestMeta("S-Gene Mutation Assay (SARS-CoV-2)", "S_GENE_MA", None, "Molecular Diagnostics"),
}


def metadata_for(canonical: str | None, raw_name: str) -> TestMeta:
    if canonical and canonical in CATALOG:
        return CATALOG[canonical]

    clean = " ".join(raw_name.strip(" *:-|").split())
    test_id = "_".join("".join(ch if ch.isalnum() else " " for ch in clean).split()).upper()
    return TestMeta(clean or "Unknown Test", test_id or "UNKNOWN_TEST", None, "Custom")
