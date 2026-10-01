from app.providers.mock import MockOCRProvider
from app.services.analysis_service import analyze_document


def test_pipeline_extracts_patient_and_profiles():
    with open("fixtures/sample_blood_report.txt", "rb") as handle:
        content = handle.read()

    response = analyze_document(
        content=content,
        filename="sample_blood_report.txt",
        provider=MockOCRProvider(),
    )

    assert response.success is True
    assert response.document_type == "BLOOD_LAB"
    assert response.patient.patient_name == "Mrs. GORAMMA"
    assert response.patient.age == 59
    assert response.patient.gender == "Female"

    profile_names = {profile.profile_name for profile in response.profiles}
    assert "Kidney Profile" in profile_names
    assert "Electrolyte Profile" in profile_names

    kidney = next(p for p in response.profiles if p.profile_name == "Kidney Profile")
    assert "CREATININE" in kidney.test_ids
    creatinine = next(t for t in response.tests if t.test_id == "CREATININE")

    assert creatinine.value == 0.72
    assert creatinine.reference_range.low == 0.6
    assert creatinine.reference_range.high == 1.2
    assert creatinine.status == "NORMAL"
    assert creatinine.flag == "GREEN_FLAG"


def test_pipeline_extracts_split_iron_row_with_gender_reference():
    content = (
        b"BLOOD LAB REPORT\n"
        b"Patient Name: Test User\n"
        b"40 Years/Female\n"
        b"* IRON\n"
        b"Method:Colorimetric Assay\n"
        b"29\n"
        b"ug/dL\n"
        b"Male: 45-158\n"
        b"Female: 37-145\n"
    )

    response = analyze_document(
        content=content,
        filename="iron.txt",
        provider=MockOCRProvider(),
    )

    iron = next(test for test in response.tests if test.test_id == "IRON")
    assert iron.test_name == "Iron"
    assert iron.loinc_code == "2498-4"
    assert iron.value == 29
    assert iron.raw_unit == "ug/dL"
    assert iron.reference_range.low == 37
    assert iron.reference_range.high == 145
    assert iron.status == "LOW"
    assert iron.flag == "RED_FLAG"


def test_pipeline_wbc_exponent_cleaning_and_space_range():
    content = (
        b"BLOOD LAB REPORT\n"
        b"Patient: Mr PAVAN M G\n"
        b"Sex: Male\n"
        b"Age: 21 Years\n"
        b"WBC 5.79 10^3 4 10 10(3)/mm3 -\n"
    )

    response = analyze_document(
        content=content,
        filename="wbc_test.txt",
        provider=MockOCRProvider(),
    )

    assert response.patient.patient_name == "Mr PAVAN M G"
    assert response.patient.gender == "Male"
    assert response.patient.age == 21

    wbc = next(test for test in response.tests if test.test_id == "WBC")
    assert wbc.value == 5.79
    assert wbc.raw_unit == "10^3"
    assert wbc.reference_range.low == 4.0
    assert wbc.reference_range.high == 10.0
    assert wbc.reference_range.raw == "4 - 10"
    assert wbc.status == "NORMAL"
    assert wbc.flag == "GREEN_FLAG"


def test_pipeline_mch_mchc_platelets_independence():
    content = (
        b"CBC REPORT\n"
        b"Patient Name: John Doe\n"
        b"32 Years Male\n"
        b"Mean Corpuscular Hb.(MCH) 36.10 pg 27-32 pg\n"
        b"Mean Corp.Hb.Con. (MCHC) 36.70 g/dL 32-36\n"
        b"PLATELET COUNT (Electrical 221.00 10^3 150-500\n"
    )

    response = analyze_document(
        content=content,
        filename="cbc_indices.txt",
        provider=MockOCRProvider(),
    )

    assert response.patient.age == 32
    assert response.patient.gender == "Male"

    test_ids = [t.test_id for t in response.tests]
    assert "MCH" in test_ids
    assert "MCHC" in test_ids
    assert "PLATELETS" in test_ids

    mch = next(t for t in response.tests if t.test_id == "MCH")
    assert mch.value == 36.10
    assert mch.reference_range.low == 27.0
    assert mch.reference_range.high == 32.0

    mchc = next(t for t in response.tests if t.test_id == "MCHC")
    assert mchc.value == 36.70

    plt = next(t for t in response.tests if t.test_id == "PLATELETS")
    assert plt.value == 221.0
    assert plt.reference_range.low == 150.0
    assert plt.reference_range.high == 500.0
    assert plt.status == "NORMAL"
    assert plt.flag == "GREEN_FLAG"


def test_urine_qualitative_and_microscopic_extraction():
    content = (
        b"COMPLETE URINE ANALYSIS\n"
        b"Patient Name: Mrs. Test\n"
        b"25 Years/Female\n"
        b"* COLOUR YELLOW Pale Yellow/Amber\n"
        b"* APPEARANCE TURBID Clear\n"
        b"* pH 5.0 5.0 -9.0\n"
        b"* SPECIFIC GRAVITY 1.030 1.005 1.030\n"
        b"* PROTEIN URINE TRACE Negative\n"
        b"* PUS CELLS. 10-12 /HPF 0-5\n"
        b"* BACTERIA PRESENT Absent\n"
        b"* RBCS NIL NIL\n"
    )

    response = analyze_document(
        content=content,
        filename="urine.txt",
        provider=MockOCRProvider(),
    )

    assert response.success is True
    test_map = {t.test_id: t for t in response.tests}
    assert "URINE_COLOR" in test_map
    assert test_map["URINE_COLOR"].value == "YELLOW"
    assert test_map["URINE_COLOR"].status == "NORMAL"

    assert "URINE_APPEARANCE" in test_map
    assert test_map["URINE_APPEARANCE"].value == "TURBID"
    assert test_map["URINE_APPEARANCE"].status == "HIGH"

    assert "SPECIFIC_GRAVITY" in test_map
    assert test_map["SPECIFIC_GRAVITY"].value == 1.03

    assert "URINE_PROTEIN" in test_map
    assert test_map["URINE_PROTEIN"].value == "TRACE"
    assert test_map["URINE_PROTEIN"].status == "HIGH"

    assert "PUS_CELLS" in test_map
    assert test_map["PUS_CELLS"].value == 10.0
    assert test_map["PUS_CELLS"].raw_value == "10-12"
    assert test_map["PUS_CELLS"].raw_unit == "/HPF"
    assert test_map["PUS_CELLS"].status == "HIGH"

    assert "BACTERIA" in test_map
    assert test_map["BACTERIA"].value == "PRESENT"
    assert test_map["BACTERIA"].status == "HIGH"


def test_thyroid_and_lipid_ratio_extraction():
    content = (
        b"BLOOD LAB REPORT\n"
        b"Patient: Jane Doe\n"
        b"30 Years/Female\n"
        b"* TOTAL TRIIODOTHYRONINE (T3) 0.93 ng/mL 0.58 -1.62\n"
        b"* TOTAL THYROXINE (T4) 7.44 ug/dl 5.0 - 14.5\n"
        b"* Thyroid Stimulating Hormone.(TSH) 2.99 uIU/mL 0.35-5.1\n"
        b"* CHOL/HDL Ratio. 3.26\n"
        b"* HDL/LDL CHOLESTEROL RATIO 0.56 Ratio\n"
    )

    response = analyze_document(
        content=content,
        filename="thyroid_lipid.txt",
        provider=MockOCRProvider(),
    )

    test_map = {t.test_id: t for t in response.tests}
    assert "TOTAL_T3" in test_map
    assert test_map["TOTAL_T3"].value == 0.93

    assert "TOTAL_T4" in test_map
    assert test_map["TOTAL_T4"].value == 7.44

    assert "TSH" in test_map
    assert test_map["TSH"].value == 2.99

    assert "CHOL_HDL_RATIO" in test_map
    assert test_map["CHOL_HDL_RATIO"].value == 3.26

    assert "HDL_LDL_RATIO" in test_map
    assert test_map["HDL_LDL_RATIO"].value == 0.56


def test_pipeline_rejects_age_demographic_lines_from_tests():
    content = (
        b"COMPLETE BLOOD COUNT REPORT\n"
        b"Patient Name: Mr PAVAN M G\n"
        b"Age: 21 Years, 0 Month, 0 Days Date: 26-03-2026\n"
        b"Sex: Male\n"
        b"WBC 5.79 10^3 4 10 10(3)/mm3 -\n"
        b"HGB (Hemoglobin) 15.90 g/dL 11.5-17\n"
    )

    response = analyze_document(
        content=content,
        filename="pavan.txt",
        provider=MockOCRProvider(),
    )

    assert response.patient.patient_name == "Mr PAVAN M G"
    assert response.patient.age == 21
    assert response.patient.gender == "Male"

    test_names = [t.test_name for t in response.tests]
    assert "Age" not in test_names
    assert "AGE" not in [t.test_id for t in response.tests]
    assert not any(t.test_name == "Age" for t in response.custom_parameters)
    assert len(response.tests) == 2


def test_pipeline_drlogy_cbc_layout_extraction():
    content = (
        b"Yash M. Patel\n"
        b"Age : 21 Years\n"
        b"Sex : Male\n"
        b"PID : 555\n"
        b"Complete Blood Count (CBC) with ESR\n"
        b"HEMOGLOBIN\n"
        b"Hemoglobin (Hb) 12.5 Low 13.0 - 17.0 g/dL\n"
        b"RBC COUNT\n"
        b"Total RBC count 5.2 4.5 - 5.5 mill/cumm\n"
        b"BLOOD INDICES\n"
        b"Packed Cell Volume (PCV) 57.5 High 40 - 50 %\n"
        b"Mean Corpuscular Volume (MCV) 87.75 83 - 101 fL\n"
        b"MCH 27.2 27 - 32 pg\n"
        b"MCHC 32.8 32.5 - 34.5 g/dL\n"
        b"RDW 13.6 11.6 - 14.0 %\n"
        b"WBC COUNT\n"
        b"Total WBC count 9000 4000-11000 cumm\n"
        b"DIFFERENTIAL WBC COUNT\n"
        b"Neutrophils 60 50 - 62 %\n"
        b"Lymphocytes 31 20 - 40 %\n"
        b"Eosinophils 1 00 - 06 %\n"
        b"Monocytes 7 00 - 10 %\n"
        b"Basophils 1 00 - 02 %\n"
        b"PLATELET COUNT\n"
        b"Platelet Count 150000 Borderline 150000 - 410000 cumm\n"
        b"ESR 5 0 - 15 mm/hr\n"
    )

    response = analyze_document(
        content=content,
        filename="yash_patel.txt",
        provider=MockOCRProvider(),
    )

    assert response.patient.patient_name == "Yash M. Patel"
    assert response.patient.age == 21
    assert response.patient.gender == "Male"
    assert len(response.tests) == 15

    test_map = {t.test_id: t for t in response.tests}
    # No fake Urine Blood
    assert "URINE_BLOOD" not in test_map

    # Hemoglobin & Hematocrit
    assert test_map["HEMOGLOBIN"].value == 12.5
    assert test_map["HEMOGLOBIN"].raw_unit == "g/dL"
    assert test_map["HEMOGLOBIN"].status == "LOW"

    assert test_map["HEMATOCRIT"].value == 57.5
    assert test_map["HEMATOCRIT"].raw_unit == "%"
    assert test_map["HEMATOCRIT"].status == "HIGH"

    # MCHC present
    assert "MCHC" in test_map
    assert test_map["MCHC"].value == 32.8
    assert test_map["MCHC"].raw_unit == "g/dL"
    assert test_map["MCHC"].status == "NORMAL"

    # WBC and Eosinophils normal
    assert test_map["WBC"].value == 9000.0
    assert test_map["WBC"].raw_unit == "cumm"
    assert test_map["WBC"].status == "NORMAL"

    assert test_map["EOSINOPHILS"].value == 1.0
    assert test_map["EOSINOPHILS"].raw_unit == "%"
    assert test_map["EOSINOPHILS"].status == "NORMAL"

    # ESR
    assert test_map["ESR"].value == 5.0
    assert test_map["ESR"].raw_unit == "mm/hr"
    assert test_map["ESR"].status == "NORMAL"


def test_pipeline_extracts_dhea_s():
    content = (
        b"ENDOCRINOLOGY REPORT\n"
        b"Name : Mr. CHANDRASHEKAR G C\n"
        b"Age/Gender : 54 Years / Male\n"
        b"Sample Type : Serum\n"
        b"DHEA-S\n"
        b"Test Name Observed Values Units Biological Reference Intervals\n"
        b"* DEHYDROEPIANDROSTENEDIONE 3.82 ug/ml Males :0.39-4.63\n"
        b"SULPHATE (DHEA-S) Females :0.46-2.75\n"
        b"Method:ELISA\n"
    )

    response = analyze_document(
        content=content,
        filename="dhea_s_test.txt",
        provider=MockOCRProvider(),
    )

    assert response.success is True
    assert response.patient.patient_name == "Mr. CHANDRASHEKAR G C"
    assert response.patient.age == 54
    assert response.patient.gender == "Male"
    assert len(response.tests) == 1

    dhea = response.tests[0]
    assert dhea.test_id == "DHEA_S"
    assert dhea.value == 3.82
    assert dhea.raw_unit == "ug/ml"
    assert dhea.reference_range.low == 0.39
    assert dhea.reference_range.high == 4.63
    assert dhea.status == "NORMAL"
    assert dhea.flag == "GREEN_FLAG"
    assert dhea.profile == "Endocrine Profile"


def test_pipeline_extracts_microbiology_ast():
    content = (
        b"DEPARTMENT OF MICROBIOLOGY\n"
        b"TEST NAME CULTURE AND SENSITIVITY-STOOL\n"
        b"SPECIMEN STOOL\n"
        b"Name : Mr.RAJKISHAN\n"
        b"Age/Gender : 42 Years / Male\n"
        b"METHOD Conventional Aerobic Culture and AST By Disc Diffusion Method\n"
        b"ORGANISM Escherichia coli\n"
        b"ANTIBIOTICS SUSCEPTIBILITY MIC VALUE\n"
        b"AMIKACIN Sensitive 1.5\n"
        b"CEFEPIME Resistant 11.0\n"
        b"CO-TRIMOXAZOLE Sensitive 1..4\n"
        b"AST As per CLSI Guidelines\n"
        b"Dr Kala Yadav KMC.No:50276\n"
    )

    response = analyze_document(
        content=content,
        filename="ast_culture_test.txt",
        provider=MockOCRProvider(),
    )

    assert response.success is True
    assert response.patient.patient_name == "Mr.RAJKISHAN"
    assert response.patient.age == 42
    assert response.patient.gender == "Male"

    test_ids = [t.test_id for t in response.tests]
    assert "ORGANISM_ISOLATED" in test_ids
    assert "AMIKACIN" in test_ids
    assert "CEFEPIME" in test_ids
    assert "CO_TRIMOXAZOLE" in test_ids

    # Fake AST test from doctor line must NOT be present
    assert "AST" not in test_ids

    test_map = {t.test_id: t for t in response.tests}
    assert test_map["ORGANISM_ISOLATED"].value == "Escherichia coli"
    assert test_map["ORGANISM_ISOLATED"].status == "HIGH"
    assert test_map["ORGANISM_ISOLATED"].flag == "RED_FLAG"

    assert test_map["AMIKACIN"].value == 1.5
    assert test_map["AMIKACIN"].status == "NORMAL"
    assert test_map["AMIKACIN"].flag == "GREEN_FLAG"

    assert test_map["CEFEPIME"].value == 11.0
    assert test_map["CEFEPIME"].status == "HIGH"
    assert test_map["CEFEPIME"].flag == "RED_FLAG"

    assert test_map["CO_TRIMOXAZOLE"].value == 1.4
    assert test_map["CO_TRIMOXAZOLE"].status == "NORMAL"




