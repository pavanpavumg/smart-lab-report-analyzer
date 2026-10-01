import { ProfileConfig } from '../types';

/**
 * UI Presentation Metadata for Diagnostic Profiles.
 * NOTE: Test-to-profile matching is performed dynamically by the backend.
 * The frontend only maintains aesthetic presentation tokens (icons, organ links, descriptions).
 */
export const PROFILE_MAPPING: Record<string, ProfileConfig> = {
  "Kidney Profile": {
    name: "Kidney Profile",
    icon: "🫘",
    organ: "kidneys",
    description: "Measures kidney filtration efficiency and waste clearance (BUN, Creatinine, Uric Acid)"
  },
  "Electrolyte Profile": {
    name: "Electrolyte Profile",
    icon: "⚡",
    organ: "kidneys",
    description: "Essential fluid balance and electrochemical minerals (Sodium, Potassium, Chloride)"
  },
  "Liver Profile": {
    name: "Liver Profile",
    icon: "🫀",
    organ: "liver",
    description: "Checks liver health, enzymes (AST, ALT, ALP), and protein synthesis"
  },
  "Thyroid Profile": {
    name: "Thyroid Profile",
    icon: "🦋",
    organ: "thyroid",
    description: "Hormones that regulate metabolism and energy balance (TSH, T3, T4)"
  },
  "Lipid Profile": {
    name: "Lipid Profile",
    icon: "🫒",
    organ: "heart",
    description: "Cholesterol, triglycerides, and cardiovascular risk ratios"
  },
  "Complete Blood Count (CBC)": {
    name: "Complete Blood Count (CBC)",
    icon: "🩸",
    organ: "blood",
    description: "Complete blood cell count and cellular indices (RBC, WBC, Platelets)"
  },
  "CBC": {
    name: "CBC",
    icon: "🩸",
    organ: "blood",
    description: "Complete blood cell count and cellular indices"
  },
  "Blood Counts": {
    name: "Blood Counts",
    icon: "🩸",
    organ: "blood",
    description: "Complete blood cell count, hemoglobin, hematocrit, and platelet indices"
  },
  "Differential Counts": {
    name: "Differential Counts",
    icon: "🔬",
    organ: "blood",
    description: "White blood cell sub-types and immune response breakdown"
  },
  "Iron Profile": {
    name: "Iron Profile",
    icon: "💉",
    organ: "blood",
    description: "Iron storage, transport proteins (Ferritin, Transferrin, TIBC)"
  },
  "Anemia Studies": {
    name: "Anemia Studies",
    icon: "💉",
    organ: "blood",
    description: "Iron storage, transport proteins, and ferritin evaluation"
  },
  "Diabetes Monitoring": {
    name: "Diabetes Monitoring",
    icon: "📊",
    organ: "pancreas",
    description: "Glycemic control, fasting/random glucose, and glycated hemoglobin (HbA1c)"
  },
  "Diabetes Profile": {
    name: "Diabetes Profile",
    icon: "📊",
    organ: "pancreas",
    description: "Glycemic control, fasting/random glucose, and glycated hemoglobin (HbA1c)"
  },
  "Urinalysis": {
    name: "Urinalysis",
    icon: "🧪",
    organ: "bladder",
    description: "Physical, chemical, and microscopic examination of urine"
  },
  "Vitamin Profile": {
    name: "Vitamin Profile",
    icon: "💊",
    organ: "blood",
    description: "Essential vitamins (Vitamin D, B12) for neurological and bone wellness"
  },
  "Cardiovascular Profile": {
    name: "Cardiovascular Profile",
    icon: "❤️",
    organ: "heart",
    description: "Cardiac markers, cardiac enzymes (CPK, LDH, NT-proBNP), and vascular risk"
  },
  "Endocrine Profile": {
    name: "Endocrine Profile",
    icon: "🧬",
    organ: "thyroid",
    description: "Reproductive and steroid hormone markers (DHEA-S, SHBG, AMH)"
  },
  "Maternal Screening Profile": {
    name: "Maternal Screening Profile",
    icon: "👶",
    organ: null,
    description: "Prenatal screening markers (PAPP-A, Beta-hCG, NT value) and pregnancy risk calculations"
  },
  "Cytogenetics": {
    name: "Cytogenetics",
    icon: "🧬",
    organ: null,
    description: "Chromosomal karyotyping and structural genetic analysis"
  },
  "Pleural Fluid Analysis": {
    name: "Pleural Fluid Analysis",
    icon: "🫁",
    organ: "lungs",
    description: "Cytopathology and biochemical markers of pleural effusion fluid"
  },
  "Serology": {
    name: "Serology",
    icon: "🛡️",
    organ: "blood",
    description: "Antibody titers and infectious disease immune responses"
  },
  "Infectious Disease Serology": {
    name: "Infectious Disease Serology",
    icon: "🛡️",
    organ: "blood",
    description: "Antibody titers and infectious disease immune responses (HSV, Hepatitis, etc.)"
  },
  "Molecular Diagnostics": {
    name: "Molecular Diagnostics",
    icon: "🔬",
    organ: null,
    description: "RT-PCR pathogen nucleic acid amplification assays (RdRp, S-gene, etc.)"
  },
  "Bone Mineral Profile": {
    name: "Bone Mineral Profile",
    icon: "🦴",
    organ: null,
    description: "Bone turnover markers, calcium, and bone-specific alkaline phosphatase"
  },
  "Tumor Marker Profile": {
    name: "Tumor Marker Profile",
    icon: "🎗️",
    organ: null,
    description: "Biochemical tumor antigen surveillance markers (CA 15-3, PSA, etc.)"
  },
  "Microbiology": {
    name: "Microbiology",
    icon: "🧫",
    organ: null,
    description: "Bacterial culture, antibiotic susceptibility profile, and staining"
  },
  "Inflammation Profile": {
    name: "Inflammation Profile",
    icon: "🔥",
    organ: "blood",
    description: "Systemic inflammation and acute-phase reactants (CRP, ESR, RF)"
  },
  "Other Parameters": {
    name: "Other Parameters",
    icon: "🔬",
    organ: null,
    description: "Additional laboratory measurements and observations"
  }
};

/**
 * Resolves presentation metadata (icon, organ link, description) for any profile name.
 * Provides a dynamic fallback so any new profile emitted by the backend displays properly.
 */
export function getProfileMetadata(profileName: string): ProfileConfig {
  if (!profileName || profileName.trim() === '' || profileName.toLowerCase() === 'custom') {
    return PROFILE_MAPPING["Other Parameters"];
  }

  const cleanName = profileName.trim();

  // 1. Direct match
  if (PROFILE_MAPPING[cleanName]) {
    return PROFILE_MAPPING[cleanName];
  }

  // 2. Case-insensitive / partial match
  const lower = cleanName.toLowerCase();
  for (const [key, config] of Object.entries(PROFILE_MAPPING)) {
    const keyLower = key.toLowerCase();
    if (keyLower === lower || lower.includes(keyLower) || keyLower.includes(lower)) {
      return {
        ...config,
        name: cleanName
      };
    }
  }

  // 3. Dynamic fallback for novel profiles from backend
  return {
    name: cleanName,
    icon: "🔬",
    organ: null,
    description: `${cleanName} diagnostic panel and clinical measurements`
  };
}

export const ORGAN_MAPPING: Record<string, string[]> = {
  "brain": [],
  "thyroid": ["Thyroid Profile", "Endocrine Profile"],
  "lungs": ["Pleural Fluid Analysis"],
  "heart": ["Lipid Profile", "Cardiovascular Profile"],
  "liver": ["Liver Profile"],
  "stomach": ["Diabetes Monitoring", "Diabetes Profile"],
  "kidneys": ["Kidney Profile", "Electrolyte Profile"],
  "bladder": ["Urinalysis"],
  "pancreas": ["Diabetes Monitoring", "Diabetes Profile"],
  "blood": [
    "Blood Counts",
    "Differential Counts",
    "Anemia Studies",
    "Iron Profile",
    "Vitamin Profile",
    "CBC",
    "Complete Blood Count (CBC)",
    "Serology",
    "Infectious Disease Serology",
    "Inflammation Profile"
  ]
};
