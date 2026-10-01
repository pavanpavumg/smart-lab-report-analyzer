// src/components/BodyMap.tsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import { ClinicalWellnessScoreResponse, ProcessedProfile, TestItem } from '../types';

interface BodyMapProps {
  profiles: Record<string, ProcessedProfile>;
  aiScoreData?: ClinicalWellnessScoreResponse | null;
  onSelectProfile?: (profileName: string) => void;
  onViewParameters?: (profileName: string) => void;
}

interface SelectedOrganAnalysis {
  label: string;
  icon: string;
  primaryProfile: string;
  isAbnormal: boolean;
  score?: number;
  statusLabel: string;
  primaryConcern?: string | null;
  pathophysiology: string;
  abnormalTests: TestItem[];
  normalTests: TestItem[];
  matchedDrivers: { test_name: string; impact: string; explanation: string }[];
  recommendations: string[];
}

export const BodyMap: React.FC<BodyMapProps> = ({
  profiles,
  aiScoreData,
  onSelectProfile,
  onViewParameters,
}) => {
  const [selectedOrgan, setSelectedOrgan] = useState<SelectedOrganAnalysis | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  // Helper to find profile status & abnormal test counts
  const getOrganStatus = (profilesList: string[]) => {
    let hasTests = false;
    let isAbnormal = false;
    let primaryProfile = profilesList[0];
    let abnormalCount = 0;

    for (const pName of profilesList) {
      const matchingKey = Object.keys(profiles).find(
        (k) => k.toLowerCase() === pName.toLowerCase() || k.toLowerCase().includes(pName.toLowerCase())
      );
      if (matchingKey && profiles[matchingKey]) {
        const p = profiles[matchingKey];
        hasTests = true;
        if (p.is_abnormal) {
          isAbnormal = true;
          primaryProfile = matchingKey;
        }
        for (const t of p.tests) {
          if (
            ['HIGH', 'LOW', 'CRITICAL', 'POSITIVE'].includes(String(t.status).toUpperCase()) ||
            t.flag === 'RED_FLAG'
          ) {
            abnormalCount++;
          }
        }
      }
    }
    return { hasTests, isAbnormal, primaryProfile, abnormalCount };
  };

  // Build clinical "Why This Is Abnormal" analysis for an organ
  const handleOrganClick = (label: string, icon: string, profilesList: string[]) => {
    const matchedProfiles: ProcessedProfile[] = [];
    for (const pName of profilesList) {
      const key = Object.keys(profiles).find(
        (k) => k.toLowerCase() === pName.toLowerCase() || k.toLowerCase().includes(pName.toLowerCase())
      );
      if (key && profiles[key]) {
        matchedProfiles.push(profiles[key]);
      }
    }

    const allTests = matchedProfiles.flatMap((p) => p.tests);
    const abnormalTests = allTests.filter(
      (t) =>
        ['HIGH', 'LOW', 'CRITICAL', 'POSITIVE'].includes(String(t.status).toUpperCase()) ||
        t.flag === 'RED_FLAG'
    );
    const normalTests = allTests.filter(
      (t) =>
        ['NORMAL', 'OPTIMAL', 'DESIRABLE'].includes(String(t.status).toUpperCase()) &&
        t.flag !== 'RED_FLAG'
    );

    const isAbnormal = abnormalTests.length > 0 || matchedProfiles.some((p) => p.is_abnormal);
    const primaryProfile = matchedProfiles[0]?.name || profilesList[0];

    // Match with AI Clinical synthesis organ system
    const systemKeyword =
      label.includes('Heart')
        ? 'Cardio'
        : label.includes('Liver')
        ? 'Liver'
        : label.includes('Pancreas')
        ? 'Metabolic'
        : label.includes('Kidney')
        ? 'Kidney'
        : label.includes('Blood')
        ? 'Hematolog'
        : label.includes('Thyroid')
        ? 'Thyroid'
        : label;

    const matchedOrganScore = aiScoreData?.organ_scores?.find(
      (os) =>
        os.system.toLowerCase().includes(systemKeyword.toLowerCase()) ||
        profilesList.some((p) => os.system.toLowerCase().includes(p.toLowerCase()))
    );

    const matchedDrivers =
      aiScoreData?.key_drivers?.filter((kd) =>
        allTests.some(
          (t) =>
            t.test_name.toLowerCase().includes(kd.test_name.toLowerCase()) ||
            kd.test_name.toLowerCase().includes(t.test_name.toLowerCase())
        )
      ) || [];

    // Pathophysiology narratives
    let pathophysiology = '';
    let recommendations: string[] = [];

    if (label.includes('Heart')) {
      pathophysiology =
        'Elevated atherogenic circulating lipids (such as LDL Cholesterol, Total Cholesterol, and Triglycerides) infiltrate the coronary arterial intima. Here they undergo oxidative modification, triggering vascular endothelial inflammation, foam cell accumulation, and atherosclerotic plaque buildup. This progressively restricts myocardial blood flow and elevates long-term ischemic cardiovascular event risks.';
      recommendations = [
        'Consult a Cardiologist / Physician for formal cardiovascular risk stratification.',
        'Adopt a heart-healthy Mediterranean diet with reduction of saturated and trans fats.',
        'Engage in 150 minutes/week of moderate-intensity aerobic physical activity.',
        'Repeat lipid panel monitoring in 8 to 12 weeks to assess lifestyle or therapy response.',
      ];
    } else if (label.includes('Pancreas')) {
      pathophysiology =
        'Elevated glycemic biomarkers (such as Fasting Blood Glucose and Glycated Hemoglobin / HbA1c) signal inadequate pancreatic beta-cell insulin secretion and peripheral tissue insulin resistance. Sustained hyperglycemia induces microvascular endothelial damage, oxidative stress, and progressive metabolic strain, indicating prediabetes or active glycemic decompensation.';
      recommendations = [
        'Consult an Endocrinologist / Diabetologist for formal glycemic confirmation.',
        'Implement structured carbohydrate moderation and eliminate refined simple sugars.',
        'Include consistent post-meal physical activity to facilitate non-insulin-mediated glucose uptake.',
        'Monitor HbA1c every 3 months to track glycemic equilibrium.',
      ];
    } else if (label.includes('Liver')) {
      pathophysiology =
        'Elevated transaminases (AST/SGOT and ALT/SGPT) or biliary enzymes indicate leakage across stressed hepatocyte cell membranes. This is frequently driven by hepatic parenchymal cellular strain, metabolic dysfunction-associated steatotic liver disease (MASLD / fatty liver), metabolic syndrome, or medication impact.';
      recommendations = [
        'Schedule an abdominal ultrasound to evaluate hepatic parenchyma and screen for steatosis.',
        'Review current medications and supplements with a physician for potential hepatotoxic effects.',
        'Optimize body weight and minimize dietary fructose and ultra-processed foods.',
        'Follow up with repeat liver function tests in 6 to 8 weeks.',
      ];
    } else if (label.includes('Kidney')) {
      pathophysiology =
        'Elevations in serum creatinine and blood urea nitrogen reflect compromised glomerular filtration rate (GFR). As filtration capacity diminishes, nitrogenous metabolic clearance declines, impairing fluid, electrolyte, and acid-base homeostasis, signaling renal parenchymal stress or chronic clearance decline.';
      recommendations = [
        'Consult a Nephrologist for formal eGFR staging and renal assessment.',
        'Maintain adequate daily hydration and strictly avoid nephrotoxic agents (e.g. NSAIDs).',
        'Undergo urine albumin-to-creatinine ratio (uACR) screening for microalbuminuria.',
        'Monitor blood pressure and renal parameters on a structured follow-up schedule.',
      ];
    } else if (label.includes('Blood')) {
      pathophysiology =
        'Subnormal red blood cell count, hemoglobin concentration, or hematocrit compromises blood oxygen-carrying capacity, resulting in peripheral cellular hypoxia, fatigue, and compensatory cardiac workload. Conversely, elevated white blood cell counts indicate active acute or chronic inflammatory or immunological mobilization.';
      recommendations = [
        'Comprehensive anemia workup: serum ferritin, transferrin saturation, vitamin B12, and folate.',
        'Enrich diet with bioavailable dietary iron, leafy greens, and essential micronutrients.',
        'Recheck complete hemogram in 4 weeks to monitor bone marrow response.',
      ];
    } else if (label.includes('Thyroid')) {
      pathophysiology =
        'Deviations in thyroid stimulating hormone (TSH) or circulating thyroid hormones (T3/T4) indicate altered hypothalamic-pituitary-thyroid axis regulation, disrupting cellular basal metabolic rate, cardiac chronotropism, and systemic lipid metabolism.';
      recommendations = [
        'Consult an Endocrinologist for full thyroid panel including free T3, free T4, and anti-TPO antibodies.',
        'Thyroid ultrasound if gland enlargement or nodular asymmetry is palpated.',
      ];
    } else {
      pathophysiology =
        'Biomarkers associated with this organ system show biological deviations from established laboratory reference intervals, warranting focused clinical follow-up and physiological assessment.';
      recommendations = [
        'Clinical correlation with patient history and physical examination.',
        'Scheduled follow-up laboratory evaluation.',
      ];
    }

    setSelectedOrgan({
      label,
      icon,
      primaryProfile,
      isAbnormal,
      score: matchedOrganScore?.score,
      statusLabel: matchedOrganScore?.status || (isAbnormal ? 'ELEVATED RISK' : 'OPTIMAL'),
      primaryConcern: matchedOrganScore?.primary_concern,
      pathophysiology,
      abnormalTests,
      normalTests,
      matchedDrivers,
      recommendations,
    });
  };

  // Organ callouts with balanced geometry (Centerline = 300, Left cards = 14..176, Right cards = 424..586)
  const ORGAN_CALLOUTS = [
    {
      id: 'thyroid',
      label: 'Thyroid Gland',
      shortLabel: 'Thyroid',
      icon: '🦋',
      profiles: ['Thyroid Profile', 'Thyroid'],
      side: 'left',
      organPoint: { x: 284, y: 131 },
      linePath: 'M 270 131 L 176 131',
      card: { x: 14, y: 106, w: 162, h: 50 },
    },
    {
      id: 'liver',
      label: 'Liver / Hepatic',
      shortLabel: 'Liver',
      icon: '🥩',
      profiles: ['Liver Profile', 'Liver Function Test', 'Hepatic Profile'],
      side: 'left',
      organPoint: { x: 256, y: 267 },
      linePath: 'M 240 267 L 176 267',
      card: { x: 14, y: 242, w: 162, h: 50 },
    },
    {
      id: 'blood',
      label: 'Blood System',
      shortLabel: 'Blood',
      icon: '🩸',
      profiles: [
        'Blood Counts',
        'Differential Counts',
        'Anemia Studies',
        'Vitamin Profile',
        'Complete Blood Count',
        'Hematology',
      ],
      side: 'left',
      organPoint: { x: 206, y: 403 },
      linePath: 'M 194 403 L 176 403',
      card: { x: 14, y: 378, w: 162, h: 50 },
    },
    {
      id: 'heart',
      label: 'Heart / Cardiac',
      shortLabel: 'Heart',
      icon: '🫀',
      profiles: ['Lipid Profile', 'Cardiac', 'Heart'],
      side: 'right',
      organPoint: { x: 324, y: 207 },
      linePath: 'M 338 207 L 424 207',
      card: { x: 424, y: 182, w: 162, h: 50 },
    },
    {
      id: 'pancreas',
      label: 'Pancreas / Sugar',
      shortLabel: 'Pancreas',
      icon: '📊',
      profiles: ['Diabetes Monitoring', 'Diabetes Screen', 'Glycemic Profile'],
      side: 'right',
      organPoint: { x: 326, y: 309 },
      linePath: 'M 340 309 L 424 309',
      card: { x: 424, y: 284, w: 162, h: 50 },
    },
    {
      id: 'kidneys',
      label: 'Kidneys / Renal',
      shortLabel: 'Kidneys',
      icon: '🫘',
      profiles: [
        'Kidney Profile',
        'Electrolyte Profile',
        'Kidney Function Test',
        'Renal Profile',
      ],
      side: 'right',
      organPoint: { x: 342, y: 336 },
      linePath: 'M 356 342 L 390 411 L 424 411',
      card: { x: 424, y: 386, w: 162, h: 50 },
    },
  ];

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-blue-50/20 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-sm relative overflow-hidden m-0 max-w-2xl mx-auto">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-200/70">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-blue-100 text-blue-700 text-xs">🫀</span>
            <span>Medical Human Anatomy Diagnostic Map</span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Click any organ or callout card to inspect clinical findings and abnormal biomarkers
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[9.5px] sm:text-[10px] font-bold bg-white/95 px-2.5 sm:px-3 py-1 rounded-full border border-slate-200 shadow-xs self-start sm:self-auto">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shrink-0" /> Normal Status
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-xs shrink-0" /> Abnormal Finding
          </span>
        </div>
      </div>

      {/* Scaled SVG Container (Compact max-w-[430px]) */}
      <div className="relative flex items-center justify-center my-0.5 select-none">
        <svg
          viewBox="0 15 600 755"
          className="w-full max-w-[390px] sm:max-w-[430px] h-auto drop-shadow-sm"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Medical Silhouette Gradients */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="25%" stopColor="#F1F5F9" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="75%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <radialGradient id="headGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>

            {/* Organ Gradients */}
            <radialGradient id="organNormal" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </radialGradient>

            <radialGradient id="organAbnormal" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </radialGradient>

            {/* Glow & Shadow Filters */}
            <filter id="medGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>

            <filter id="silhouetteShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#334155" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* 1. ANATOMICALLY ACCURATE HUMAN BODY SILHOUETTE (CENTER X = 300) */}
          {/* ============================================================== */}
          <g filter="url(#silhouetteShadow)">
            {/* Head & Cranium (Athletic Proportioned Skull) */}
            <path
              d="M 300 36 
                 C 318 36, 330 48, 330 68 
                 C 330 88, 324 104, 315 116 
                 C 309 123, 305 126, 300 126 
                 C 295 126, 291 123, 285 116 
                 C 276 104, 270 88, 270 68 
                 C 270 48, 282 36, 300 36 Z"
              fill="url(#headGrad)"
              stroke="#94A3B8"
              strokeWidth="1.3"
            />

            {/* Muscular Neck */}
            <path
              d="M 285 116 L 278 148 L 322 148 L 315 116 Z"
              fill="url(#bodyGrad)"
              stroke="#CBD5E1"
              strokeWidth="1"
            />

            {/* Full Body Contour - Athletic Muscular / Bulk Physique */}
            <path
              d="M 322 148
                 C 336 150, 354 153, 372 158
                 C 388 162, 400 174, 400 196
                 C 400 208, 396 225, 394 240
                 C 402 255, 404 275, 398 296
                 C 406 318, 408 348, 402 388
                 C 398 418, 394 445, 392 468
                 C 391 482, 388 495, 384 502
                 C 380 508, 374 506, 372 498
                 C 370 488, 374 472, 376 456
                 C 376 430, 374 398, 372 368
                 C 370 338, 368 310, 368 290
                 C 368 268, 366 244, 362 222
                 C 356 245, 350 275, 346 308
                 C 344 328, 346 348, 352 368
                 C 358 388, 368 418, 368 450
                 C 368 480, 364 515, 354 550
                 C 352 562, 352 576, 350 590
                 C 356 612, 358 638, 354 668
                 C 350 692, 346 718, 344 742
                 C 343 754, 338 762, 332 762
                 C 324 762, 321 754, 322 742
                 C 322 718, 320 690, 318 662
                 C 316 636, 318 610, 322 590
                 C 324 572, 322 548, 318 518
                 C 314 485, 308 458, 303 442
                 C 292 458, 286 485, 282 518
                 C 278 548, 276 572, 278 590
                 C 282 610, 284 636, 282 662
                 C 280 690, 278 718, 278 742
                 C 279 754, 276 762, 268 762
                 C 262 762, 257 754, 256 742
                 C 254 718, 250 692, 246 668
                 C 242 638, 244 612, 250 590
                 C 248 576, 248 562, 246 550
                 C 236 515, 232 480, 232 450
                 C 232 418, 242 388, 248 368
                 C 254 348, 256 328, 254 308
                 C 250 275, 244 245, 238 222
                 C 234 244, 232 268, 232 290
                 C 232 310, 230 338, 228 368
                 C 226 398, 224 430, 224 456
                 C 226 472, 230 488, 228 498
                 C 226 506, 220 508, 216 502
                 C 212 495, 209 482, 208 468
                 C 206 445, 202 418, 198 388
                 C 192 348, 194 318, 202 296
                 C 196 275, 198 255, 206 240
                 C 204 225, 200 208, 200 196
                 C 200 174, 212 162, 228 158
                 C 246 153, 264 150, 278 148 Z"
              fill="url(#bodyGrad)"
              stroke="#94A3B8"
              strokeWidth="1.3"
            />
          </g>

          {/* ============================================================== */}
          {/* 2. SKELETAL & ATHLETIC MUSCLE CONTOURS (PECS, ABS, QUADS, ETC) */}
          {/* ============================================================== */}
          <g opacity="0.65">
            {/* Broad Clavicles (Collarbones) */}
            <path
              d="M 296 150 Q 266 153 234 162"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 304 150 Q 334 153 366 162"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Sternum / Midline */}
            <path
              d="M 300 152 L 300 236"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Pectoralis Major (Pecs / Chest Contour) */}
            <path
              d="M 298 226 C 284 233, 260 232, 244 218"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.3"
            />
            <path
              d="M 302 226 C 316 233, 340 232, 356 218"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.3"
            />

            {/* Deltopectoral Grooves */}
            <path
              d="M 234 162 C 238 184, 240 202, 244 218"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.1"
              opacity="0.7"
            />
            <path
              d="M 366 162 C 362 184, 360 202, 356 218"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.1"
              opacity="0.7"
            />

            {/* Thoracic Rib Arcs */}
            <path d="M 296 172 Q 266 178 248 196" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 304 172 Q 334 178 352 196" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 296 194 Q 262 202 246 226" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 304 194 Q 338 202 354 226" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 296 216 Q 260 228 248 256" fill="none" stroke="#CBD5E1" strokeWidth="1" />
            <path d="M 304 216 Q 340 228 352 256" fill="none" stroke="#CBD5E1" strokeWidth="1" />

            {/* Costal Arch */}
            <path d="M 298 238 Q 278 258 252 282" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
            <path d="M 302 238 Q 322 258 348 282" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />

            {/* Rectus Abdominis / Core Definition */}
            <path d="M 284 256 Q 300 260 316 256" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.8" />
            <path d="M 282 286 Q 300 290 318 286" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.8" />
            <path d="M 284 316 Q 300 320 316 316" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.8" />

            {/* Linea Alba & Umbilicus */}
            <line
              x1="300"
              y1="240"
              x2="300"
              y2="376"
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <ellipse cx="300" cy="342" rx="2.5" ry="2" fill="#94A3B8" opacity="0.6" />

            {/* Athletic Iliac V-Cut / Inguinal Grooves */}
            <path d="M 264 358 Q 282 376 296 388" fill="none" stroke="#CBD5E1" strokeWidth="1.1" opacity="0.7" />
            <path d="M 336 358 Q 318 376 304 388" fill="none" stroke="#CBD5E1" strokeWidth="1.1" opacity="0.7" />

            {/* Upper Arm Bicep Grooves */}
            <path d="M 216 230 Q 212 260 216 288" fill="none" stroke="#CBD5E1" strokeWidth="0.9" opacity="0.6" />
            <path d="M 384 230 Q 388 260 384 288" fill="none" stroke="#CBD5E1" strokeWidth="0.9" opacity="0.6" />

            {/* Athletic Knees (Patella & Tendon Grooves) */}
            <ellipse cx="263" cy="576" rx="6.5" ry="7.5" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
            <ellipse cx="337" cy="576" rx="6.5" ry="7.5" fill="none" stroke="#CBD5E1" strokeWidth="1.2" />
            <path d="M 263 558 L 263 568" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.6" />
            <path d="M 337 558 L 337 568" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.6" />

            {/* Muscular Calf Definition (Gastrocnemius) */}
            <path d="M 274 610 Q 266 645 268 675" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.5" />
            <path d="M 326 610 Q 334 645 332 675" fill="none" stroke="#CBD5E1" strokeWidth="1" opacity="0.5" />
          </g>

          {/* ============================================================== */}
          {/* 3. TRANSITORY BACKGROUND ORGANS (LUNGS & STOMACH CONTEXT)      */}
          {/* ============================================================== */}
          <g>
            {/* Bilateral Lungs (Framing mediastinum in broader athletic chest) */}
            <path
              d="M 293 166 C 272 162, 246 176, 242 206 C 238 236, 250 262, 276 270 C 288 268, 293 248, 293 220 Z"
              fill="#FCA5A5"
              opacity="0.18"
              stroke="#F87171"
              strokeWidth="0.8"
            />
            <path
              d="M 307 166 C 328 162, 354 176, 358 206 C 362 236, 350 262, 324 270 C 316 268, 318 245, 320 230 C 322 215, 312 200, 307 185 Z"
              fill="#FCA5A5"
              opacity="0.18"
              stroke="#F87171"
              strokeWidth="0.8"
            />

            {/* Stomach Guide (Left hypochondrium) */}
            <path
              d="M 298 254 C 304 246, 318 246, 326 254 C 334 264, 332 278, 320 286 C 308 292, 296 286, 296 272 C 296 264, 297 258, 298 254 Z"
              fill="#FDE68A"
              opacity="0.3"
              stroke="#F59E0B"
              strokeWidth="0.8"
            />
          </g>

          {/* ============================================================== */}
          {/* 4. REALISTIC INTERNAL ORGANS (SCIENTIFICALLY CONTOURED)        */}
          {/* ============================================================== */}
          <g>
            {/* --- 1. THYROID GLAND (C5-T1, lower neck) --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus(['Thyroid Profile', 'Thyroid']);
              const isHovered = hoveredOrgan === 'thyroid';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Thyroid Gland', '🦋', ['Thyroid Profile', 'Thyroid'])
                  }
                  onMouseEnter={() => setHoveredOrgan('thyroid')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Trachea Cartilage Rings */}
                  <line x1="294" y1="123" x2="306" y2="123" stroke="#CBD5E1" strokeWidth="1.2" />
                  <line x1="294" y1="127" x2="306" y2="127" stroke="#CBD5E1" strokeWidth="1.2" />
                  <line x1="294" y1="131" x2="306" y2="131" stroke="#CBD5E1" strokeWidth="1.2" />
                  <line x1="294" y1="135" x2="306" y2="135" stroke="#CBD5E1" strokeWidth="1.2" />

                  {/* Left Lobe */}
                  <path
                    d="M 297 124 C 291 120, 281 122, 282 133 C 283 141, 292 143, 297 136 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.2"
                  />
                  {/* Right Lobe */}
                  <path
                    d="M 303 124 C 309 120, 319 122, 318 133 C 317 141, 308 143, 303 136 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.2"
                  />
                  {/* Isthmus */}
                  <path
                    d="M 296 130 C 298 133, 302 133, 304 130 C 304 134, 296 134, 296 130 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1"
                  />
                </g>
              );
            })()}

            {/* --- 2. CARDIOVASCULAR / HEART (Mediastinum, 2/3 left) --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus(['Lipid Profile', 'Cardiac', 'Heart']);
              const isHovered = hoveredOrgan === 'heart';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Heart / Cardiac', '🫀', [
                      'Lipid Profile',
                      'Cardiac',
                      'Heart',
                    ])
                  }
                  onMouseEnter={() => setHoveredOrgan('heart')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Aortic Arch */}
                  <path
                    d="M 307 188 C 305 174, 314 168, 322 176 C 326 181, 324 189, 320 192"
                    fill="none"
                    stroke={isAbnormal ? '#DC2626' : '#EF4444'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Pulmonary Trunk */}
                  <path
                    d="M 308 190 C 305 182, 298 184, 296 189"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                  />
                  {/* Superior Vena Cava */}
                  <path
                    d="M 298 176 L 298 192"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                  />

                  {/* Ventricles & Myocardium */}
                  <path
                    d="M 298 194 
                       C 290 200, 288 214, 294 222 
                       C 302 232, 314 238, 322 238 
                       C 328 238, 334 226, 334 214 
                       C 334 200, 326 194, 318 194 
                       C 310 194, 302 192, 298 194 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.5"
                  />
                  {/* Coronary Artery Branch */}
                  <path
                    d="M 312 195 Q 314 212 322 234"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                </g>
              );
            })()}

            {/* --- 3. HEPATIC / LIVER (Right Hypochondrium / Viewer's Left) --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus([
                'Liver Profile',
                'Liver Function Test',
                'Hepatic Profile',
              ]);
              const isHovered = hoveredOrgan === 'liver';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Liver / Hepatic', '🥩', [
                      'Liver Profile',
                      'Liver Function Test',
                      'Hepatic Profile',
                    ])
                  }
                  onMouseEnter={() => setHoveredOrgan('liver')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Anatomical Liver Wedge */}
                  <path
                    d="M 252 260 
                       C 252 248, 270 238, 288 244 
                       C 295 247, 297 254, 297 262 
                       C 297 274, 286 288, 268 286 
                       C 256 284, 252 274, 252 260 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.5"
                  />
                  {/* Falciform Ligament Line */}
                  <path
                    d="M 285 244 C 284 256, 282 270, 280 285"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  {/* Gallbladder Tucked Under */}
                  <ellipse cx="274" cy="284" rx="4" ry="2.5" fill="#10B981" opacity="0.8" />
                </g>
              );
            })()}

            {/* --- 4. METABOLIC / PANCREAS (Transverse Epigastrium) --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus([
                'Diabetes Monitoring',
                'Diabetes Screen',
                'Glycemic Profile',
              ]);
              const isHovered = hoveredOrgan === 'pancreas';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Pancreas / Sugar', '📊', [
                      'Diabetes Monitoring',
                      'Diabetes Screen',
                      'Glycemic Profile',
                    ])
                  }
                  onMouseEnter={() => setHoveredOrgan('pancreas')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Duodenal C-Loop */}
                  <path
                    d="M 280 292 C 274 296, 274 306, 280 310"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    opacity="0.8"
                  />
                  {/* Glandular Pancreas Body & Tail */}
                  <path
                    d="M 280 300 
                       C 292 296, 308 296, 324 302 
                       C 328 304, 328 308, 324 310 
                       C 308 314, 292 312, 280 306 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.5"
                  />
                  {/* Pancreatic Main Duct */}
                  <path
                    d="M 282 303 L 322 306"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                    opacity="0.7"
                  />
                </g>
              );
            })()}

            {/* --- 5. RENAL / BILATERAL KIDNEYS (Lumbar Flank, T12-L3) --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus([
                'Kidney Profile',
                'Electrolyte Profile',
                'Kidney Function Test',
                'Renal Profile',
              ]);
              const isHovered = hoveredOrgan === 'kidneys';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Kidneys / Renal', '🫘', [
                      'Kidney Profile',
                      'Electrolyte Profile',
                      'Kidney Function Test',
                      'Renal Profile',
                    ])
                  }
                  onMouseEnter={() => setHoveredOrgan('kidneys')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Right Kidney (Viewer's left, slightly lower) */}
                  <path
                    d="M 252 328 
                       C 264 326, 270 334, 268 344 
                       C 266 354, 264 362, 254 362 
                       C 246 360, 244 348, 246 338 
                       C 248 332, 250 328, 252 328 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.5"
                  />
                  {/* Right Adrenal Cap */}
                  <path
                    d="M 250 327 C 254 322, 260 322, 264 327 Z"
                    fill="#F59E0B"
                    opacity="0.8"
                  />
                  {/* Right Ureter */}
                  <path
                    d="M 262 352 Q 268 385 278 420"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />

                  {/* Left Kidney (Viewer's right, slightly higher) */}
                  <path
                    d="M 348 320 
                       C 336 318, 330 326, 332 336 
                       C 334 346, 336 354, 346 354 
                       C 354 352, 356 340, 354 330 
                       C 352 324, 350 320, 348 320 Z"
                    fill={isAbnormal ? 'url(#organAbnormal)' : 'url(#organNormal)'}
                    stroke={isAbnormal ? '#BE123C' : '#047857'}
                    strokeWidth="1.5"
                  />
                  {/* Left Adrenal Cap */}
                  <path
                    d="M 336 319 C 340 314, 346 314, 350 319 Z"
                    fill="#F59E0B"
                    opacity="0.8"
                  />
                  {/* Left Ureter */}
                  <path
                    d="M 338 344 Q 332 385 322 420"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />
                </g>
              );
            })()}

            {/* --- 6. HEMATOLOGY / CIRCULATORY BLOOD CONDUIT --- */}
            {(() => {
              const { isAbnormal } = getOrganStatus([
                'Blood Counts',
                'Differential Counts',
                'Anemia Studies',
                'Vitamin Profile',
                'Complete Blood Count',
                'Hematology',
              ]);
              const isHovered = hoveredOrgan === 'blood';
              return (
                <g
                  onClick={() =>
                    handleOrganClick('Blood System', '🩸', [
                      'Blood Counts',
                      'Differential Counts',
                      'Anemia Studies',
                      'Vitamin Profile',
                      'Complete Blood Count',
                      'Hematology',
                    ])
                  }
                  onMouseEnter={() => setHoveredOrgan('blood')}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  className="cursor-pointer transition-transform duration-200"
                  filter={isHovered || isAbnormal ? 'url(#medGlow)' : ''}
                >
                  {/* Descending Aorta Trunk */}
                  <path
                    d="M 302 195 L 302 368"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    opacity="0.75"
                  />
                  {/* Iliac Bifurcation */}
                  <path
                    d="M 302 368 L 286 425"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    opacity="0.65"
                  />
                  <path
                    d="M 302 368 L 318 425"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    opacity="0.65"
                  />

                  {/* Left Brachial / Radial Vascular Conduit Along Arm */}
                  <path
                    d="M 276 166 
                       C 255 174, 238 215, 230 270 
                       C 224 315, 218 365, 206 403 
                       C 200 425, 204 455, 202 485"
                    fill="none"
                    stroke={isAbnormal ? '#DC2626' : '#EF4444'}
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    opacity="0.8"
                  />
                </g>
              );
            })()}
          </g>

          {/* ============================================================== */}
          {/* 5. CALLOUT CARDS, STRAIGHT LEADER LINES & TARGET PINS          */}
          {/* ============================================================== */}
          {ORGAN_CALLOUTS.map((item) => {
            const { hasTests, isAbnormal, abnormalCount } = getOrganStatus(item.profiles);
            if (!hasTests) return null;

            const isHovered = hoveredOrgan === item.id;

            return (
              <g
                key={item.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => handleOrganClick(item.label, item.icon, item.profiles)}
                onMouseEnter={() => setHoveredOrgan(item.id)}
                onMouseLeave={() => setHoveredOrgan(null)}
              >
                {/* Precision Leader Line */}
                <path
                  d={item.linePath}
                  fill="none"
                  stroke={isAbnormal ? '#EF4444' : '#10B981'}
                  strokeWidth={isHovered ? 2.25 : 1.75}
                  strokeDasharray="4,3"
                  opacity={isHovered ? 1 : 0.85}
                />

                {/* Target Pin On Body (EXACT Organ Point) */}
                <g filter="url(#cardShadow)">
                  {/* Radar Ripple Animation when abnormal or hovered */}
                  {(isAbnormal || isHovered) && (
                    <circle
                      cx={item.organPoint.x}
                      cy={item.organPoint.y}
                      r="16"
                      fill="none"
                      stroke={isAbnormal ? '#EF4444' : '#10B981'}
                      strokeWidth="2"
                      opacity="0.7"
                    >
                      <animate
                        attributeName="r"
                        values="13;21;13"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0;0.8"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Base Circle */}
                  <circle
                    cx={item.organPoint.x}
                    cy={item.organPoint.y}
                    r={isHovered ? 15 : 13}
                    fill="#FFFFFF"
                    stroke={isAbnormal ? '#EF4444' : '#10B981'}
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* Icon Emoji */}
                  <text
                    x={item.organPoint.x}
                    y={item.organPoint.y + 0.5}
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {item.icon}
                  </text>

                  {/* Mini Status Badge on Target Pin */}
                  <circle
                    cx={item.organPoint.x + 8.5}
                    cy={item.organPoint.y - 8.5}
                    r="5.5"
                    fill={isAbnormal ? '#DC2626' : '#059669'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text
                    x={item.organPoint.x + 8.5}
                    y={item.organPoint.y - 8}
                    fontSize="7.5"
                    fontWeight="900"
                    fill="#FFFFFF"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {isAbnormal ? '!' : '✓'}
                  </text>
                </g>

                {/* Callout Card Container */}
                <g
                  filter="url(#cardShadow)"
                  transform={
                    isHovered
                      ? `translate(${item.side === 'left' ? -2 : 2}, -2)`
                      : 'translate(0, 0)'
                  }
                  className="transition-transform"
                >
                  <rect
                    x={item.card.x}
                    y={item.card.y}
                    width={item.card.w}
                    height={item.card.h}
                    rx="14"
                    fill="#FFFFFF"
                    stroke={
                      isHovered
                        ? '#3B82F6'
                        : isAbnormal
                        ? '#FCA5A5'
                        : '#A7F3D0'
                    }
                    strokeWidth={isHovered ? 2 : 1.5}
                  />

                  {/* Left Color Accent Bar */}
                  <rect
                    x={item.card.x + 4}
                    y={item.card.y + 8}
                    width="3.5"
                    height={item.card.h - 16}
                    rx="1.75"
                    fill={isAbnormal ? '#EF4444' : '#10B981'}
                  />

                  {/* Card Organ Emoji */}
                  <text
                    x={item.card.x + 15}
                    y={item.card.y + 30}
                    fontSize="16"
                  >
                    {item.icon}
                  </text>

                  {/* Card Organ Title */}
                  <text
                    x={item.card.x + 38}
                    y={item.card.y + 20}
                    fontSize="11"
                    fontWeight="800"
                    fill="#0F172A"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {item.shortLabel}
                  </text>

                  {/* Status Pill Badge */}
                  <rect
                    x={item.card.x + 38}
                    y={item.card.y + 27}
                    width={isAbnormal ? (abnormalCount > 0 ? 76 : 58) : 52}
                    height="14"
                    rx="7"
                    fill={isAbnormal ? '#FEE2E2' : '#D1FAE5'}
                    stroke={isAbnormal ? '#FCA5A5' : '#A7F3D0'}
                    strokeWidth="0.75"
                  />
                  <text
                    x={item.card.x + 43}
                    y={item.card.y + 37.5}
                    fontSize="8.5"
                    fontWeight="800"
                    fill={isAbnormal ? '#991B1B' : '#065F46'}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {isAbnormal
                      ? abnormalCount > 0
                        ? `${abnormalCount} ABNORMAL`
                        : 'ABNORMAL'
                      : 'NORMAL'}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Compact Footer Info Prompt */}
      <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-slate-500 gap-1.5">
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-blue-500" />
          <span>Click any organ to inspect clinical findings, pathophysiology & biomarkers</span>
        </span>
        <span className="text-blue-600 font-bold flex items-center gap-1">
          <span>Clinical Inspector Active</span>
          <ChevronRight size={13} />
        </span>
      </div>

      {/* ============================================================== */}
      {/* 6. WHY THIS IS ABNORMAL: CLINICAL ORGAN INSPECTOR MODAL        */}
      {/* ============================================================== */}
      {selectedOrgan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shrink-0 border ${
                    selectedOrgan.isAbnormal
                      ? 'bg-rose-50 border-rose-200 shadow-xs'
                      : 'bg-emerald-50 border-emerald-200 shadow-xs'
                  }`}
                >
                  {selectedOrgan.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                      {selectedOrgan.label}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-0.5 text-[9.5px] sm:text-[10px] font-black uppercase ${
                        selectedOrgan.isAbnormal
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {selectedOrgan.isAbnormal ? (
                        <>
                          <AlertTriangle size={11} className="text-rose-600" />
                          <span>{selectedOrgan.statusLabel}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Optimal</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    {selectedOrgan.isAbnormal
                      ? `${selectedOrgan.abnormalTests.length} parameter(s) require clinical review`
                      : 'All evaluated parameters within physiological reference intervals'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrgan(null)}
                className="rounded-full p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Health Index Score Badge if available */}
            {selectedOrgan.score !== undefined && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2.5">
                <span className="text-xs font-bold text-slate-600">Organ Health Index</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedOrgan.score >= 80
                          ? 'bg-emerald-500'
                          : selectedOrgan.score >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${selectedOrgan.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-slate-900">{selectedOrgan.score}%</span>
                </div>
              </div>
            )}

            {/* 🩺 WHY THIS IS ABNORMAL CLINICAL CARD */}
            <div className="mt-4">
              <div
                className={`rounded-2xl p-4 border ${
                  selectedOrgan.isAbnormal
                    ? 'bg-rose-50/60 border-rose-200/80 text-rose-950'
                    : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                  <Stethoscope
                    size={15}
                    className={selectedOrgan.isAbnormal ? 'text-rose-600' : 'text-emerald-600'}
                  />
                  <span>
                    {selectedOrgan.isAbnormal
                      ? 'Why This Organ Is Abnormal'
                      : 'Normal Physiological Status'}
                  </span>
                </div>

                {/* Primary Doctor Finding if from AI */}
                {selectedOrgan.primaryConcern && (
                  <div className="mt-2 text-xs font-bold text-slate-900 bg-white/90 p-2.5 rounded-xl border border-rose-200/60 shadow-xs">
                    <span className="text-rose-600 font-extrabold">Primary Finding: </span>
                    {selectedOrgan.primaryConcern}
                  </div>
                )}

                {/* Pathophysiology Narrative */}
                <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-700">
                  {selectedOrgan.pathophysiology}
                </p>
              </div>
            </div>

            {/* Specific Abnormal Biomarkers Identified */}
            {selectedOrgan.abnormalTests.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                  <span>Abnormal Biomarkers Detected</span>
                  <span className="text-rose-600 font-bold">
                    {selectedOrgan.abnormalTests.length} High / Critical
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedOrgan.abnormalTests.map((t) => {
                    const rawRange =
                      t.reference_range?.raw ||
                      (t.reference_range?.low !== null && t.reference_range?.high !== null
                        ? `${t.reference_range?.low} - ${t.reference_range?.high}`
                        : 'Standard');

                    const matchedDriver = selectedOrgan.matchedDrivers.find(
                      (d) =>
                        d.test_name.toLowerCase().includes(t.test_name.toLowerCase()) ||
                        t.test_name.toLowerCase().includes(d.test_name.toLowerCase())
                    );

                    return (
                      <div
                        key={t.test_name}
                        className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900">{t.test_name}</span>
                          <span className="rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5">
                            {t.status}
                          </span>
                        </div>

                        <div className="mt-1 flex items-baseline gap-2 text-xs text-slate-600">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {t.value} {t.raw_unit}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">Normal Range: {rawRange}</span>
                        </div>

                        {matchedDriver && (
                          <div className="mt-2 text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                            <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                            <span>{matchedDriver.explanation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Normal Parameters (if any) */}
            {selectedOrgan.normalTests.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Stable Parameters ({selectedOrgan.normalTests.length})
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedOrgan.normalTests.map((t) => (
                    <span
                      key={t.test_name}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
                    >
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      <span>{t.test_name}</span>
                      <span className="text-emerald-600 font-bold">
                        ({t.value} {t.raw_unit})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Clinical Recommendations */}
            <div className="mt-5 space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600" />
                Physician Recommendations & Follow-Up
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                {selectedOrgan.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrgan(null)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition text-center"
              >
                Close Inspector
              </button>

              {onViewParameters && selectedOrgan.primaryProfile && (
                <button
                  onClick={() => {
                    const prof = selectedOrgan.primaryProfile;
                    setSelectedOrgan(null);
                    onViewParameters(prof);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 shadow-sm transition"
                >
                  <span>View {selectedOrgan.label} parameters in table</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BodyMapRealistic = BodyMap;
export default BodyMap;