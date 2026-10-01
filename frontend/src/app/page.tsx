'use client';

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  FileUp,
  FlaskConical,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Scan,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { TabNavigation } from '../components/TabNavigation';
import { ScoreOverviewRow } from '../components/ScoreMeterCard';
import { WellnessScoreCard } from '../components/WellnessScoreCard';
import { BodyMap } from '../components/BodyMap';
import { DietRecommendationsSection } from '../components/DietRecommendationsSection';
import { RiskCalculatorSection } from '../components/RiskCalculatorSection';
import { SmartViewTab } from '../components/SmartViewTab';
import { ClinicalWellnessScoreResponse, LabReportResponse, TestItem } from '../types';
import {
  calculateRisks,
  calculateWellnessScore,
  generateDietRecommendations,
  groupTestsIntoProfiles,
} from '../utils/healthCalculators';

const UPLOAD_STAGES = [
  {
    step: 1,
    title: 'Document Scanning & Page Layout',
    detail: 'Digitizing image/PDF, aligning coordinate boxes & header metadata...',
    targetProgress: 28,
  },
  {
    step: 2,
    title: 'Biomarker Extraction & Parsing',
    detail: 'Identifying analyte names, numeric test results & measurement units...',
    targetProgress: 60,
  },
  {
    step: 3,
    title: 'Reference Interval & Flag Evaluation',
    detail: 'Matching biological normal ranges & flagging high/low abnormalities...',
    targetProgress: 85,
  },
  {
    step: 4,
    title: 'Clinical Intelligence Synthesis',
    detail: 'Computing wellness score, mapping organ systems & dietary insights...',
    targetProgress: 98,
  },
];

function normalizeBackendResponse(rawJson: any): LabReportResponse {
  if (!rawJson) throw new Error('Empty response received from backend.');

  const data = rawJson.data || rawJson || {};
  const report = data.report || rawJson.report || {};
  const patient = data.patient || rawJson.patient || {};

  const rawTests: any[] = Array.isArray(data.tests)
    ? data.tests
    : Array.isArray(rawJson.tests)
      ? rawJson.tests
      : [];

  const tests: TestItem[] = rawTests
    .filter((t) => {
      const name = String(t.raw_test_name || t.test_name || '').trim().toLowerCase();
      const blocked = [
        'tez.health', 'lab service pathology', 'test performed at', 'lab booking centre',
        'customer care', 'home collection', 'end of report', 'disclaimer', 'interpretation',
      ];
      return name && !blocked.some((x) => name.includes(x));
    })
    .map((t) => {
      const rr = t.reference_range || {};
      let low = typeof rr.low === 'number' ? rr.low : Number.parseFloat(rr.low);
      let high = typeof rr.high === 'number' ? rr.high : Number.parseFloat(rr.high);
      low = Number.isFinite(low) ? low : null;
      high = Number.isFinite(high) ? high : null;

      const rawRange = String(rr.raw || '');
      if ((low === null || high === null) && rawRange) {
        const m = rawRange.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
        if (m) {
          low = Number(m[1]);
          high = Number(m[2]);
        }
      }

      const numeric = typeof t.value === 'number'
        ? t.value
        : Number.parseFloat(String(t.value ?? t.raw_value ?? '').replace(/,/g, ''));
      const value = Number.isFinite(numeric) ? numeric : (t.value ?? t.raw_value ?? null);

      let status = String(t.status || 'UNKNOWN').toUpperCase();
      const operator = rr.operator || null;
      if (typeof value === 'number') {
        if (operator === '<' && high !== null) status = value < high ? 'NORMAL' : 'HIGH';
        else if (operator === '<=' && high !== null) status = value <= high ? 'NORMAL' : 'HIGH';
        else if (operator === '>' && low !== null) status = value > low ? 'NORMAL' : 'LOW';
        else if (operator === '>=' && low !== null) status = value >= low ? 'NORMAL' : 'LOW';
        else if (low !== null && high !== null) {
          status = value < low ? 'LOW' : value > high ? 'HIGH' : 'NORMAL';
        }
      }

      const name = String(t.test_name || t.canonical_test_name || t.raw_test_name || 'Lab Test')
        .replace(/^[\s,:*-]+|[\s,:*-]+$/g, '')
        .trim();

      return {
        test_name: name,
        raw_test_name: t.raw_test_name || name,
        loinc_code: t.loinc_code || null,
        value,
        raw_value: t.raw_value || (value === null ? null : String(value)),
        value_type: t.value_type || 'quantitative',
        method: t.method || null,
        raw_unit: t.raw_unit || t.normalized_unit || t.unit || null,
        reference_range: { low, high, operator, raw: rawRange },
        status: status as any,
        flag: status === 'HIGH' || status === 'LOW' || status === 'CRITICAL' ? 'RED_FLAG' : status === 'NORMAL' ? 'NONE' : (t.flag || 'NONE'),
        specimen_id: t.specimen_id || null,
        specimen_type: t.specimen_type || null,
        panel_name: t.profile || t.panel_name || null,
        profile: t.profile || t.panel_name || null,
        source_trace: t.source_trace || { raw_test_name: name, raw_value: String(value ?? '') },
      } as TestItem;
    });

  const genderRaw = String(patient.gender || patient.sex || '').toLowerCase();
  const gender: 'Male' | 'Female' = genderRaw.startsWith('m') ? 'Male' : 'Female';

  return {
    report_id: rawJson.report_id || report.report_id || `REP-${Date.now()}`,
    status: rawJson.status || 'VALIDATED',
    data: {
      schema_version: data.schema_version || '2.1',
      report: {
        report_id: report.report_id || rawJson.report_id || `REP-${Date.now()}`,
        report_date: report.report_date || report.reporting_date || new Date().toISOString(),
        lab_name: report.lab_name || rawJson.lab_name || 'Diagnostic Laboratory',
      },
      patient: {
        patient_id: patient.patient_id || rawJson.patient_id || 'N/A',
        name: patient.name || patient.patient_name || rawJson.patient_name || 'Patient',
        age: Number.isFinite(Number(patient.age)) ? Number(patient.age) : 0,
        gender,
      },
      tests,
      warnings: data.warnings || rawJson.warnings || [],
      completeness: data.completeness || rawJson.completeness || {
        expected_count: tests.length,
        extracted_count: tests.length,
        missing_tests: [],
        unexpected_tests: [],
        complete: true,
      },
    },
  };
}

export default function SmartHealthReportApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeReport, setActiveReport] = useState<LabReportResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'anatomy' | 'smart-view'>('overview');
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(null);
  const [smartViewFilter, setSmartViewFilter] = useState<'all' | 'high' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiScoreData, setAiScoreData] = useState<ClinicalWellnessScoreResponse | null>(null);
  const [isAiScoreLoading, setIsAiScoreLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(10);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [currentFileSize, setCurrentFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const rawTests = useMemo(() => activeReport?.data.tests || [], [activeReport]);

  // Enrich tests with AI inferred clinical statuses & reference ranges when returned from the scoring engine
  const tests = useMemo<TestItem[]>(() => {
    if (!aiScoreData?.inferred_biomarkers || aiScoreData.inferred_biomarkers.length === 0) {
      return rawTests;
    }
    const inferredMap = new Map(
      aiScoreData.inferred_biomarkers.map((ib) => [ib.test_name.toLowerCase().trim(), ib])
    );
    return rawTests.map((t) => {
      const key = t.test_name.toLowerCase().trim();
      const rawKey = (t.raw_test_name || '').toLowerCase().trim();
      const match = inferredMap.get(key) || inferredMap.get(rawKey);
      if (match && t.status === 'UNKNOWN') {
        const infStatus = match.inferred_status;
        const isAbnormal = ['HIGH', 'LOW', 'CRITICAL', 'POSITIVE'].includes(infStatus);

        let low = t.reference_range.low;
        let high = t.reference_range.high;
        if ((low === null || high === null) && match.standard_range) {
          const m = match.standard_range.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
          if (m) {
            low = parseFloat(m[1]);
            high = parseFloat(m[2]);
          }
        }

        return {
          ...t,
          status: infStatus,
          flag: isAbnormal ? ('RED_FLAG' as const) : ('NONE' as const),
          is_inferred: true,
          inferred_status: infStatus,
          inferred_range: match.standard_range,
          clinical_rationale: match.clinical_rationale,
          reference_range: {
            ...t.reference_range,
            low: low ?? t.reference_range.low,
            high: high ?? t.reference_range.high,
            raw: t.reference_range.raw || match.standard_range,
          },
        };
      }
      return t;
    });
  }, [rawTests, aiScoreData]);

  const patient = useMemo(() => activeReport?.data.patient || { patient_id: '', name: 'Patient', age: 0, gender: 'Female' as const }, [activeReport]);
  const report = useMemo(() => activeReport?.data.report || { report_id: '', report_date: new Date().toISOString(), lab_name: 'Diagnostic Laboratory' }, [activeReport]);
  const profiles = useMemo(() => groupTestsIntoProfiles(tests), [tests]);
  const wellnessScore = useMemo(() => calculateWellnessScore(tests), [tests]);
  const risks = useMemo(() => calculateRisks(tests, profiles), [tests, profiles]);
  const dietRecommendations = useMemo(() => generateDietRecommendations(profiles), [profiles]);
  const abnormalCount = tests.filter((t) => ['HIGH', 'LOW', 'CRITICAL', 'POSITIVE'].includes(t.status)).length;
  const normalCount = tests.filter((t) => ['NORMAL', 'OPTIMAL', 'DESIRABLE'].includes(t.status)).length;

  const scoredReportIdRef = useRef<string | null>(null);

  // Asynchronously request AI Clinical Wellness Score (Cloud DLP sanitized + LLM evaluated)
  useEffect(() => {
    if (!activeReport || rawTests.length === 0) {
      setAiScoreData(null);
      setIsAiScoreLoading(false);
      scoredReportIdRef.current = null;
      return;
    }

    // Skip if already scored for this report
    if (scoredReportIdRef.current === activeReport.report_id) {
      return;
    }

    let isMounted = true;
    setIsAiScoreLoading(true);
    scoredReportIdRef.current = activeReport.report_id;

    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
    fetch(`${base}/api/v1/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: {
          name: patient.name,
          patient_name: patient.name,
          age: patient.age,
          gender: patient.gender,
        },
        tests: rawTests.map((t) => ({
          test_name: t.test_name,
          raw_test_name: t.raw_test_name || t.test_name,
          test_id: t.test_name,
          value: t.value,
          raw_value: t.raw_value,
          raw_unit: t.raw_unit,
          reference_range: t.reference_range,
          status: t.status,
          flag: t.flag === 'NONE' ? 'NORMAL' : t.flag,
          profile: t.profile || t.panel_name || 'General',
        })),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Score fetch failed (${res.status})`);
        return res.json();
      })
      .then((data: ClinicalWellnessScoreResponse) => {
        if (isMounted) {
          setAiScoreData(data);
          setIsAiScoreLoading(false);
        }
      })
      .catch((err) => {
        console.warn('AI Clinical Score fetch failed, falling back to deterministic score:', err);
        if (isMounted) {
          setIsAiScoreLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeReport?.report_id]);

  const handleBackToHome = () => {
    setActiveReport(null);
    setUploadError(null);
    setSearchQuery('');
    setSmartViewFilter('all');
    setAiScoreData(null);
    setIsAiScoreLoading(false);
    scoredReportIdRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.includes('pdf') && !file.type.startsWith('image/')) {
      setUploadError('Please select a PDF or supported image report.');
      return;
    }

    setCurrentFileName(file.name);
    setCurrentFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setUploading(true);
    setUploadStage(0);
    setUploadProgress(12);
    setUploadError(null);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1600) {
        setUploadStage(0);
        setUploadProgress((prev) => Math.min(28, prev + 2.5));
      } else if (elapsed < 3400) {
        setUploadStage(1);
        setUploadProgress((prev) => Math.min(60, prev + 3));
      } else if (elapsed < 5200) {
        setUploadStage(2);
        setUploadProgress((prev) => Math.min(85, prev + 2.5));
      } else {
        setUploadStage(3);
        setUploadProgress((prev) => Math.min(96, prev + 0.6));
      }
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${base}/api/v1/analyze`, { method: 'POST', body: formData });
      const json = await response.json().catch(() => null);
      clearInterval(interval);
      setUploadStage(3);
      setUploadProgress(92);

      const normalized = normalizeBackendResponse(json);

      // Synthesize AI Clinical Wellness Score in Step 4 before revealing the report
      try {
        const scoreRes = await fetch(`${base}/api/v1/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient: {
              name: normalized.data.patient.name,
              patient_name: normalized.data.patient.name,
              age: normalized.data.patient.age,
              gender: normalized.data.patient.gender,
            },
            tests: normalized.data.tests.map((t) => ({
              test_name: t.test_name,
              raw_test_name: t.raw_test_name || t.test_name,
              test_id: t.test_name,
              value: t.value,
              raw_value: t.raw_value,
              raw_unit: t.raw_unit,
              reference_range: t.reference_range,
              status: t.status,
              flag: t.flag === 'NONE' ? 'NORMAL' : t.flag,
              profile: t.profile || t.panel_name || 'General',
            })),
          }),
        });

        if (scoreRes.ok) {
          const aiData = await scoreRes.json();
          setAiScoreData(aiData);
          scoredReportIdRef.current = normalized.report_id;
        }
      } catch (scoreErr) {
        console.warn('AI score prefetch during upload failed:', scoreErr);
      }

      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));

      setIsAiScoreLoading(false);
      setActiveReport(normalized);
      setActiveTab('overview');
      setSelectedProfileName(null);
    } catch (error: any) {
      clearInterval(interval);
      setUploadError(error?.message || 'Unable to analyze this report.');
    } finally {
      clearInterval(interval);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => uploadFile(e.target.files?.[0]);

  const selectProfile = (name: string) => {
    setSelectedProfileName(name);
    setSmartViewFilter('all');
    setActiveTab('smart-view');
  };

  // 1. Dynamic Scanning & Processing View
  if (uploading) {
    return (
      <div className="min-h-screen bg-[#f6f9fc] text-slate-900 flex flex-col justify-between">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 sm:h-[72px] max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl sm:rounded-2xl bg-[#0066ff] text-white shadow-lg shadow-blue-500/20">
                <Activity size={18} className="sm:hidden" />
                <Activity size={21} className="hidden sm:block" />
              </div>
              <div>
                <div className="text-sm sm:text-[15px] font-black tracking-tight">Tez <span className="text-[#0066ff]">SmartApp</span></div>
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Lab intelligence</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-extrabold text-[#0066ff]">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#0066ff] animate-ping" />
              <span className="hidden sm:inline">Processing Clinical Data</span>
              <span className="sm:hidden">Processing...</span>
            </div>
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-4xl px-3.5 py-4 sm:px-5 sm:py-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-10 shadow-[0_24px_70px_rgba(15,23,42,.12)]">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />

            <div className="relative grid gap-5 sm:gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
              {/* Document Scanner Visual */}
              <div className="flex flex-col items-center">
                <div className="relative w-48 sm:w-64 h-56 sm:h-80 rounded-2xl border-2 border-blue-200/90 bg-slate-50/95 shadow-xl overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between">
                  {/* Subtle grid pattern background */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0066ff_1px,transparent_1px)] [background-size:12px_12px]" />

                  {/* Laser Scan Beam */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0066ff] to-transparent shadow-[0_0_16px_#0066ff] animate-scan-beam z-20 pointer-events-none" />
                  <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-[#0066ff]/20 to-transparent animate-scan-beam z-10 pointer-events-none" />

                  {/* Simulated Document Content */}
                  <div className="relative z-0 space-y-3">
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="h-3 w-20 rounded bg-blue-300 animate-pulse" />
                      <div className="h-2 w-14 rounded bg-slate-300" />
                    </div>

                    {/* Patient detail lines */}
                    <div className="space-y-1.5 pt-1">
                      <div className="h-2 w-32 rounded bg-slate-300" />
                      <div className="h-2 w-24 rounded bg-slate-200" />
                    </div>

                    {/* Biomarker rows */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-20 rounded bg-slate-300" />
                        <div className="h-2 w-10 rounded bg-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-24 rounded bg-slate-300" />
                        <div className="h-2 w-8 rounded bg-blue-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-16 rounded bg-slate-300" />
                        <div className="h-2 w-10 rounded bg-rose-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-28 rounded bg-slate-300" />
                        <div className="h-2 w-8 rounded bg-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-20 rounded bg-slate-300" />
                        <div className="h-2 w-12 rounded bg-slate-200" />
                      </div>
                    </div>
                  </div>

                  {/* Document Footer badge */}
                  <div className="relative z-0 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> OCR ACTIVE
                    </span>
                    <span>AI PARSER</span>
                  </div>
                </div>

                {/* File info pill */}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm max-w-full">
                  <FileText size={15} className="text-[#0066ff] shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-[200px]" title={currentFileName || ''}>
                    {currentFileName || 'document.pdf'}
                  </span>
                  {currentFileSize && (
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">({currentFileSize})</span>
                  )}
                </div>
              </div>

              {/* Progress and Pipeline Steps */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#0066ff]">
                      Step {uploadStage + 1} of 4 · {UPLOAD_STAGES[uploadStage]?.title}
                    </span>
                    <span className="text-xl font-black text-slate-950 font-mono">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-0.5 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {UPLOAD_STAGES[uploadStage]?.detail || 'Processing report data...'}
                  </p>
                </div>

                {/* Pipeline Checklist */}
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  {UPLOAD_STAGES.map((stg, idx) => {
                    const isDone = uploadProgress >= 100 || uploadStage > idx;
                    const isCurrent = uploadStage === idx && uploadProgress < 100;
                    return (
                      <div
                        key={stg.step}
                        className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${isCurrent ? 'bg-blue-50/90 border border-blue-200/80 shadow-xs' : ''
                          }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : isCurrent ? (
                            <Loader2 size={18} className="text-[#0066ff] animate-spin" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-slate-300 bg-white" />
                          )}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-extrabold ${isDone
                              ? 'text-slate-700'
                              : isCurrent
                                ? 'text-[#0066ff]'
                                : 'text-slate-400'
                              }`}
                          >
                            {stg.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {stg.detail}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Safe & Private
                  </span>
                  <span className="font-medium text-slate-500">Please wait for update...</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white/90 px-4 py-3 text-center text-xs font-semibold text-slate-400">
          Tez SmartApp · Laboratory Intelligence Engine
        </footer>
      </div>
    );
  }

  // 2. Landing / Upload Page
  if (!activeReport) {
    return (
      <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f6f9fc] text-slate-900 flex flex-col justify-between">
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_50%_-20%,rgba(0,102,255,.14),transparent_60%)] pointer-events-none" />

        {/* Compact Header */}
        <header className="relative z-10 shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0066ff] text-white shadow-md shadow-blue-500/20">
                <Activity size={18} />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight">Tez <span className="text-[#0066ff]">SmartApp</span></div>
                <div className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">Lab intelligence</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content (Fits on a single laptop screen) */}
        <main className="relative z-10 flex-1 flex flex-col justify-evenly px-4 py-2 sm:py-3 max-w-4xl mx-auto w-full">
          {/* Hero Section */}
          <div className="text-center">
            <div className="mx-auto mb-1.5 flex w-fit items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 shadow-2xs">
              <Sparkles size={11} /> Clinical document intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-[-.03em] text-slate-950 leading-tight">
              Turn a lab report into a <span className="text-[#0066ff]">clear health view.</span>
            </h1>
            <p className="mx-auto mt-1.5 max-w-xl text-xs sm:text-[13px] leading-relaxed text-slate-500">
              Upload a blood laboratory PDF or image. The backend extracts patient details, biomarkers, units, reference ranges and abnormal findings into a structured dashboard.
            </p>
          </div>

          {/* Compact Dropzone Box */}
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-full">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) uploadFile(file);
              }}
              className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 px-4 py-5 sm:py-6 text-center ${isDragging
                ? 'border-[#0066ff] bg-blue-50/90 scale-[1.01] shadow-lg shadow-blue-500/10'
                : 'border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-slate-50'
                }`}
            >
              <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-200/30 blur-2xl" />
              <div className="relative mx-auto max-w-lg">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0066ff] shadow-md shadow-blue-100 ring-1 ring-blue-100">
                  <FileUp size={24} />
                </div>
                <h2 className="mt-2.5 text-base sm:text-lg font-black tracking-tight text-slate-950">
                  {isDragging ? 'Drop your report file now' : 'Drop your report here'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">PDF, PNG, JPG, WEBP or TIFF · processed through your FastAPI pipeline</p>
                <label className="mx-auto mt-3.5 flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0066ff] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
                  <Upload size={15} />
                  Choose laboratory report
                  <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                {uploadError && (
                  <div className="mx-auto mt-3 flex max-w-sm items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-left text-xs font-semibold text-rose-800">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" /> {uploadError}
                    <button onClick={() => setUploadError(null)} className="ml-auto"><X size={13} /></button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600" /> Stateless processing</span>
                  <span className="flex items-center gap-1.5"><LockKeyhole size={13} className="text-blue-600" /> No database storage</span>
                  <span className="flex items-center gap-1.5"><Zap size={13} className="text-amber-500" /> Deterministic extraction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Feature Cards (3 columns) */}
          <div className="mx-auto grid max-w-3xl grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
            {[
              [FileCheck2, 'Structured extraction', 'Patient, tests, units & ranges'],
              [FlaskConical, 'Lab-aware parsing', 'Vendor layouts & multiline rows'],
              [ShieldCheck, 'Evidence-first output', 'No invented or unsupported values'],
            ].map(([Icon, title, text]) => (
              <div key={String(title)} className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-2xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#0066ff]">
                  {/* @ts-ignore */}
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900 truncate">{title as string}</h3>
                  <p className="text-[10px] leading-tight text-slate-500 line-clamp-1">{text as string}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // 3. Analyzed Report Dashboard View
  return (
    <div className="min-h-screen bg-[#f6f9fc] text-slate-900 pb-20">
      <HeaderBar
        patient={patient}
        report={report}
        status={activeReport.status}
        onUploadNewPdf={() => inputRef.current?.click()}
        onBackToHome={handleBackToHome}
      />
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />

      <main className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 pt-[68px] sm:pt-24 min-w-0 w-full overflow-hidden">
        <section className="overflow-hidden rounded-2xl sm:rounded-[28px] border border-slate-200 bg-white shadow-sm min-w-0 w-full">
          <div className="relative px-4 py-4 sm:px-7 sm:py-6">
            <div className="absolute right-0 top-0 h-40 w-64 bg-[radial-gradient(circle,rgba(0,102,255,.10),transparent_68%)] pointer-events-none" />
            <div className="relative flex flex-col justify-between gap-4 sm:gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[.14em] text-blue-600">
                    <CheckCircle2 size={13} /> Report analyzed
                  </div>
                  <button
                    onClick={handleBackToHome}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold text-slate-600 shadow-xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-[#0066ff]"
                    title="Return to home page to upload another file"
                  >
                    <ArrowLeft size={12} className="text-[#0066ff]" />
                    <span>Upload another report</span>
                  </button>
                </div>
                <h1 className="mt-1.5 text-xl font-black tracking-tight sm:text-3xl text-slate-900">{patient.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-500">
                  <span>{patient.age ? `${patient.age} years` : 'Age unavailable'}</span><span>•</span><span>{patient.gender}</span><span>•</span><span>{report.lab_name}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 divide-x divide-slate-200 shadow-xs">
                <button
                  onClick={() => {
                    setActiveTab('smart-view');
                    setSmartViewFilter('all');
                    setSelectedProfileName(null);
                  }}
                  className={`px-2 sm:px-4 py-2 sm:py-3 text-center transition group relative ${activeTab === 'smart-view' && smartViewFilter === 'all'
                    ? 'bg-blue-50/90 ring-1 ring-blue-500/30'
                    : 'hover:bg-white/80'
                    }`}
                  title="View all test parameters"
                >
                  <div className={`text-lg sm:text-xl font-black transition ${activeTab === 'smart-view' && smartViewFilter === 'all'
                    ? 'text-[#0066ff]'
                    : 'text-slate-950 group-hover:text-[#0066ff]'
                    }`}>
                    {tests.length}
                  </div>
                  <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${activeTab === 'smart-view' && smartViewFilter === 'all'
                    ? 'text-blue-700'
                    : 'text-slate-400'
                    }`}>
                    All Tests
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('smart-view');
                    setSmartViewFilter('normal');
                    setSelectedProfileName(null);
                  }}
                  className={`px-2 sm:px-4 py-2 sm:py-3 text-center transition group relative ${activeTab === 'smart-view' && smartViewFilter === 'normal'
                    ? 'bg-emerald-50/90 ring-1 ring-emerald-500/30'
                    : 'hover:bg-white/80'
                    }`}
                  title="View normal parameters"
                >
                  <div className="text-lg sm:text-xl font-black text-emerald-600 transition">{normalCount}</div>
                  <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${activeTab === 'smart-view' && smartViewFilter === 'normal'
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                    }`}>
                    Normal
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('smart-view');
                    setSmartViewFilter('high');
                    setSelectedProfileName(null);
                  }}
                  className={`px-2 sm:px-4 py-2 sm:py-3 text-center transition group relative ${activeTab === 'smart-view' && smartViewFilter === 'high'
                    ? 'bg-rose-50/90 ring-1 ring-rose-500/30'
                    : 'hover:bg-white/80'
                    }`}
                  title="View high parameters"
                >
                  <div className="text-lg sm:text-xl font-black text-rose-600 transition">{abnormalCount}</div>
                  <div className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${activeTab === 'smart-view' && smartViewFilter === 'high'
                    ? 'text-rose-700 font-black'
                    : 'text-rose-600'
                    }`}>
                    High
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Score Card & Score Scale Meter in the same line */}
        <div className="mt-3.5 sm:mt-4 min-w-0 w-full">
          <ScoreOverviewRow
            score={aiScoreData?.score ?? wellnessScore.score}
            label={aiScoreData?.label ?? wellnessScore.label}
            color={aiScoreData?.color ?? wellnessScore.color}
            isAiLoading={isAiScoreLoading}
            onTapOrgans={() => setActiveTab('anatomy')}
            onParametersInfo={() => {
              setActiveTab('smart-view');
              setSmartViewFilter('all');
            }}
          />
        </div>

        {/* 3. Tab Navigation: Overview | Human Anatomy Map | All parameters */}
        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          abnormalCount={abnormalCount}
          totalCount={tests.length}
          normalCount={normalCount}
          filterMode={smartViewFilter}
          onFilterChange={setSmartViewFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* View 1: Overview */}
        {activeTab === 'overview' && (
          <div className="mt-4 sm:mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-4 sm:gap-5 items-start min-w-0 w-full">
            {/* Left Column: AI Clinical Summary & Pathologist Analysis */}
            <div className="space-y-4 sm:space-y-5 min-w-0 w-full">
              {/* Doctor-level AI Clinical Synthesis Card */}
              <div className="rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-white p-4 sm:p-7 shadow-xs relative overflow-hidden min-w-0 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-700">
                      <Sparkles size={11} className="text-[#0066ff]" />
                      Clinical Health Index
                    </span>
                    {aiScoreData && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black text-purple-700">
                        <Sparkles size={10} className="text-purple-600" />
                        <span>AI Clinical Synthesis</span>
                        <span className="text-purple-400">•</span>
                        <span className="hidden sm:inline">Cloud DLP Protected</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                    Confidence: {Math.round((aiScoreData?.confidence ?? 0.95) * 100)}%
                  </span>
                </div>

                <div className="mt-3.5 sm:mt-4">
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Pathologist Clinical Interpretation
                  </h3>
                  <p className="text-xs sm:text-base font-semibold text-slate-700 leading-relaxed break-words">
                    {aiScoreData?.clinical_summary ||
                      'The laboratory report has been evaluated. Parameters outside normal physiological intervals are flagged for clinical correlation and medical review.'}
                  </p>
                </div>

                {/* Organ System Scores Chips (1 column on mobile, 2 on sm, 3 on lg) */}
                {aiScoreData && aiScoreData.organ_scores?.length > 0 && (
                  <div className="mt-5 pt-4 sm:mt-6 sm:pt-5 border-t border-slate-100 min-w-0 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 sm:mb-3">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                        Organ System Health Index
                      </span>
                      <button
                        onClick={() => setActiveTab('anatomy')}
                        className="text-[11px] sm:text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <span>View in Anatomy Map</span>
                        <span>→</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 min-w-0 w-full">
                      {aiScoreData.organ_scores.map((organ) => {
                        const isOptimal = organ.status === 'OPTIMAL';
                        const isCritical = organ.status === 'CRITICAL';
                        return (
                          <div
                            key={organ.system}
                            className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border transition min-w-0 ${isCritical
                              ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                              : isOptimal
                                ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                                : 'bg-amber-50/40 border-amber-200 text-amber-900'
                              }`}
                          >
                            <div className="flex items-center justify-between text-[11px] sm:text-xs font-black gap-2 min-w-0">
                              <span className="truncate flex-1">{organ.system}</span>
                              <span
                                className={`font-black shrink-0 ${isCritical
                                  ? 'text-rose-600'
                                  : isOptimal
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                  }`}
                              >
                                {organ.score}%
                              </span>
                            </div>
                            {organ.primary_concern && (
                              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium truncate mt-1">
                                {organ.primary_concern}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Biomarker Drivers */}
                {aiScoreData && aiScoreData.key_drivers?.length > 0 && (
                  <div className="mt-4 pt-3.5 sm:mt-5 sm:pt-4 border-t border-slate-100 min-w-0 w-full">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block">
                      Primary Biomarker Drivers
                    </span>
                    <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0 w-full">
                      {aiScoreData.key_drivers.map((driver) => (
                        <div
                          key={driver.test_name}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 rounded-xl bg-slate-50 border border-slate-200/90 p-2 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs min-w-0 w-full"
                        >
                          <span className="font-extrabold text-slate-900 shrink-0">{driver.test_name}</span>
                          <span className="hidden sm:inline text-slate-300">·</span>
                          <span className="text-slate-500 font-medium text-[10px] sm:text-[11px] leading-relaxed break-words">{driver.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Calculator Section */}
              <RiskCalculatorSection risks={risks} onSelectProfile={selectProfile} />
            </div>

            {/* Right Column: Diet Recommendations & Anatomy Teaser Card */}
            <div className="space-y-4 sm:space-y-5 min-w-0 w-full">
              {/* Human Anatomy Map Teaser Card */}
              <div
                onClick={() => setActiveTab('anatomy')}
                className="rounded-2xl sm:rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-4 sm:p-6 shadow-xs cursor-pointer group hover:border-blue-400 hover:shadow-md transition-all min-w-0 w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-700">
                    <span className="text-base sm:text-lg">🫀</span> Medical Human Anatomy Map
                  </div>
                  <span className="text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open Map →
                  </span>
                </div>
                <h4 className="mt-2.5 sm:mt-3 text-sm sm:text-base font-black text-slate-900">
                  Targeted Organ Pathology Visualization
                </h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  Inspect Heart, Liver, Pancreas, Kidneys, Thyroid, and Hematologic systems. Click any organ to see exactly why it is abnormal.
                </p>
                <div className="mt-3.5 sm:mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-rose-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    {abnormalCount} High parameter(s) mapped
                  </span>
                </div>
              </div>

              {/* Diet Recommendations */}
              <DietRecommendationsSection recommendations={dietRecommendations} />
            </div>
          </div>
        )}

        {/* View 2: Human Anatomy Map */}
        {activeTab === 'anatomy' && (
          <div className="mt-4 sm:mt-5 max-w-2xl mx-auto">
            <BodyMap
              profiles={profiles}
              aiScoreData={aiScoreData}
              onSelectProfile={selectProfile}
              onViewParameters={(profileName) => {
                selectProfile(profileName);
              }}
            />
          </div>
        )}

        {/* View 3: All parameters */}
        {activeTab === 'smart-view' && (
          <div className="mt-4 sm:mt-5">
            <SmartViewTab
              profiles={profiles}
              selectedProfileName={selectedProfileName}
              filterMode={smartViewFilter}
              onFilterChange={setSmartViewFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/90 px-3.5 sm:px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] font-bold text-slate-400 sm:text-xs">
          <span className="truncate mr-2"><span className="hidden sm:inline">Tez SmartApp · </span>Laboratory Intelligence</span>
          <span className="flex items-center gap-1.5 text-emerald-600 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">FastAPI connected</span>
            <span className="sm:hidden">Online</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
