import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ClinicalWellnessScoreResponse, WellnessScoreResult } from '../types';

interface WellnessScoreCardProps {
  scoreData: WellnessScoreResult;
  aiScoreData?: ClinicalWellnessScoreResponse | null;
  isAiLoading?: boolean;
  onFilterClick?: (filter: 'all' | 'normal' | 'high') => void;
}

export const WellnessScoreCard: React.FC<WellnessScoreCardProps> = ({
  scoreData,
  aiScoreData,
  isAiLoading = false,
  onFilterClick,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [showOrganBreakdown, setShowOrganBreakdown] = useState(true);

  // Active effective score data (prefers AI clinical score once synthesized)
  const effectiveScore = aiScoreData?.score ?? scoreData.score;
  const effectiveLabel = aiScoreData?.label ?? (isAiLoading ? 'Analyzing...' : scoreData.label);

  useEffect(() => {
    // If waiting for AI synthesis, do not animate to temporary local score
    if (isAiLoading && !aiScoreData) {
      return;
    }

    let current = 0;
    const target = effectiveScore;
    const timer = window.setInterval(() => {
      current += Math.max(1, Math.ceil((target - current) / 6));
      if (current >= target) {
        current = target;
        window.clearInterval(timer);
      }
      setDisplayScore(current);
    }, 24);
    return () => window.clearInterval(timer);
  }, [effectiveScore, isAiLoading, Boolean(aiScoreData)]);

  const isGood =
    aiScoreData?.color === 'green' ||
    aiScoreData?.color === 'light-green' ||
    scoreData.color === 'green' ||
    scoreData.color === 'light-green';
  const isRed = aiScoreData?.color === 'rose' || scoreData.color === 'red';

  // Thematic styling tokens based on health index
  const theme = isRed
    ? {
        accent: 'text-rose-600',
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
        gradientStart: '#ef4444',
        gradientEnd: '#b91c1c',
        glowBg: 'bg-rose-400/15',
        Icon: ShieldAlert,
        statusText: 'Clinical Attention Advised',
        description:
          aiScoreData?.clinical_summary ||
          'Multiple parameters exceed normal physiological intervals. Medical follow-up recommended.',
      }
    : isGood
    ? {
        accent: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        gradientStart: '#10b981',
        gradientEnd: '#059669',
        glowBg: 'bg-emerald-400/15',
        Icon: ShieldCheck,
        statusText: 'Optimal Biomarker Balance',
        description:
          aiScoreData?.clinical_summary ||
          'The vast majority of extracted biomarkers lie well within standard biological reference ranges.',
      }
    : {
        accent: 'text-amber-600',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-700',
        gradientStart: '#f59e0b',
        gradientEnd: '#d97706',
        glowBg: 'bg-amber-400/15',
        Icon: AlertTriangle,
        statusText: 'Moderate Deviations Found',
        description:
          aiScoreData?.clinical_summary ||
          'Most values are stable, but selected parameters require routine dietary or lifestyle review.',
      };

  const normalPct = scoreData.total > 0 ? Math.round((scoreData.normal / scoreData.total) * 100) : 100;
  const highPct = scoreData.total > 0 ? Math.round((scoreData.abnormal / scoreData.total) * 100) : 0;

  // SVG Gauge calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, displayScore))) / 100;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-all">
      {/* Decorative ambient auras */}
      <div className={`absolute -right-16 -top-16 h-56 w-56 rounded-full ${theme.glowBg} blur-3xl pointer-events-none`} />
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />

      {/* Top Header & Radial Gauge */}
      <div className="relative flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
              <Sparkles size={12} className="text-[#0066ff]" />
              Clinical Health Index
            </span>

            {/* AI & DLP Privacy Badge */}
            {aiScoreData ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700 shadow-xs animate-in fade-in duration-300">
                <Sparkles size={11} className="text-purple-600 animate-spin-slow" />
                <span>AI Clinical Synthesis</span>
                <span className="text-purple-400">•</span>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 font-extrabold" title="PHI de-identified by Google Cloud DLP before processing">
                  <Shield size={10} /> Cloud DLP Protected
                </span>
              </span>
            ) : isAiLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-[10px] font-black text-blue-700 animate-pulse">
                <Activity size={11} className="animate-spin" />
                <span>Cloud DLP Sanitizing & AI Scoring...</span>
              </span>
            ) : null}

            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${theme.badgeBg}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {theme.statusText}
            </span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            {isAiLoading && !aiScoreData ? (
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-[#0066ff] animate-pulse">
                Evaluating...
              </span>
            ) : (
              <>
                <span className={`text-6xl sm:text-7xl font-black tracking-[-0.06em] ${theme.accent}`}>
                  {displayScore}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-300">/ 100</span>
              </>
            )}
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md leading-relaxed">
            {theme.description}
          </p>
        </div>

        {/* High-Tech Circular Meter */}
        <div className="relative flex shrink-0 items-center justify-center self-start sm:self-center">
          <div className="relative h-28 w-28 sm:h-32 sm:w-32">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="scoreGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme.gradientStart} />
                  <stop offset="100%" stopColor={theme.gradientEnd} />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="10"
              />
              {/* Progress Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#scoreGaugeGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                style={{
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </svg>

            {/* Inner Content Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <theme.Icon size={22} className={theme.accent} />
              <span className="mt-1 text-xs font-black tracking-tight text-slate-800">
                {effectiveLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Proportional Biomarker Health Balance Bar */}
      <div className="relative mt-6 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Normal: {normalPct}% ({scoreData.normal} tests)
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            High / Attention: {highPct}% ({scoreData.abnormal} tests)
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/80 flex shadow-inner">
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${normalPct}%` }}
            title={`Normal parameters: ${normalPct}%`}
          />
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-700"
            style={{ width: `${highPct}%` }}
            title={`High parameters: ${highPct}%`}
          />
        </div>
      </div>

      {/* 3 Parameter Metric Cards */}
      <div className="relative mt-6 grid grid-cols-3 gap-3">
        {/* Total Parameters */}
        <div
          onClick={() => onFilterClick?.('all')}
          className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total
            </span>
            <FlaskConical size={14} className="text-slate-400 group-hover:text-slate-700 transition" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {scoreData.total}
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-500">
            Parameters evaluated
          </div>
        </div>

        {/* Normal Parameters */}
        <div
          onClick={() => onFilterClick?.('normal')}
          className="group flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3 sm:p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/80 hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Normal
            </span>
            <CheckCircle2 size={14} className="text-emerald-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">
            {scoreData.normal}
          </div>
          <div className="mt-1 text-[10px] font-bold text-emerald-700/80">
            Within reference range
          </div>
        </div>

        {/* High Parameters */}
        <div
          onClick={() => onFilterClick?.('high')}
          className="group flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-rose-50/40 p-3 sm:p-4 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50/80 hover:shadow-sm cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
              High
            </span>
            <AlertCircle size={14} className="text-rose-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600">
            {scoreData.abnormal}
          </div>
          <div className="mt-1 text-[10px] font-bold text-rose-700/80">
            Attention required
          </div>
        </div>
      </div>

      {/* AI Organ System Scores & Key Biomarker Drivers */}
      {aiScoreData && (aiScoreData.organ_scores?.length > 0 || aiScoreData.key_drivers?.length > 0) && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">
                Organ System Health Index
              </span>
              <span className="rounded-full bg-blue-50 text-[#0066ff] px-2 py-0.5 text-[9px] font-extrabold border border-blue-100">
                DLP Anonymized · AI Synthesis
              </span>
            </div>
            <button
              onClick={() => setShowOrganBreakdown(!showOrganBreakdown)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              {showOrganBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showOrganBreakdown && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Organ Score Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {aiScoreData.organ_scores.map((organ) => {
                  const isOptimal = organ.status === 'OPTIMAL';
                  const isCritical = organ.status === 'CRITICAL';

                  return (
                    <div
                      key={organ.system}
                      className={`rounded-xl p-2.5 border transition-all ${
                        isCritical
                          ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                          : isOptimal
                          ? 'bg-emerald-50/40 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/40 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="truncate">{organ.system}</span>
                        <span
                          className={`font-black ${
                            isCritical
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
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                          {organ.primary_concern}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Key Biomarker Drivers */}
              {aiScoreData.key_drivers?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Primary Biomarker Drivers
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiScoreData.key_drivers.map((driver) => (
                      <div
                        key={driver.test_name}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-[11px]"
                      >
                        <span className="font-extrabold text-slate-800">{driver.test_name}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 font-medium text-[10px]">{driver.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

