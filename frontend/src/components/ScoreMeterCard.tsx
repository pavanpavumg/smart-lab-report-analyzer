import React from 'react';
import { Activity, Info, Sparkles } from 'lucide-react';

interface ScoreOverviewRowProps {
  score: number;
  label?: string;
  color?: string;
  isAiLoading?: boolean;
  onTapOrgans?: () => void;
  onParametersInfo?: () => void;
}

export const ScoreOverviewRow: React.FC<ScoreOverviewRowProps> = ({
  score,
  label = 'Fair',
  color = 'amber',
  isAiLoading = false,
  onTapOrgans,
  onParametersInfo,
}) => {
  // Determine scale tier based on the standard clinical rubric
  const getScaleTier = (val: number) => {
    if (val < 50) return { key: 'poor', label: 'Poor', range: '(<50)', color: '#EF4444', textColor: 'text-rose-600', badgeBg: 'bg-rose-600' };
    if (val <= 60) return { key: 'suboptimal', label: 'Suboptimal', range: '(51-60)', color: '#F97316', textColor: 'text-orange-600', badgeBg: 'bg-orange-500' };
    if (val <= 69) return { key: 'fair', label: 'Fair', range: '(61-69)', color: '#D97706', textColor: 'text-amber-600', badgeBg: 'bg-[#D97706]' };
    if (val <= 90) return { key: 'good', label: 'Good', range: '(70-90)', color: '#10B981', textColor: 'text-emerald-600', badgeBg: 'bg-emerald-600' };
    return { key: 'optimal', label: 'Optimal', range: '(>90)', color: '#0891B2', textColor: 'text-cyan-700', badgeBg: 'bg-cyan-600' };
  };

  const currentTier = getScaleTier(score);

  // Clamp pointer position between 2% and 98%
  const pinLeft = Math.min(97, Math.max(3, score));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3.5 sm:gap-4 items-stretch min-w-0 w-full">
      {/* 1. Score Card (Left) */}
      <div className="rounded-2xl sm:rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center gap-3 sm:gap-4 transition hover:shadow-sm min-w-0 w-full overflow-hidden">
        {/* Pulse circular icon */}
        <div className="shrink-0 flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-amber-300 bg-amber-50/70 text-amber-600">
          <Activity size={20} className="sm:w-6 sm:h-6 stroke-[2.5]" />
        </div>

        {/* Score & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Score: <span className={currentTier.textColor}>{isAiLoading ? '...' : score}</span>{' '}
              <span className="text-slate-400 font-extrabold text-sm sm:text-base">/ 100</span>
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-xs font-black text-white shadow-xs ${currentTier.badgeBg}`}
            >
              {label || currentTier.label} Wellness Score
            </span>
          </div>

          <button
            onClick={onTapOrgans}
            className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-blue-600 transition text-left group"
          >
            <span>Tap organs below to check abnormalities.</span>
            <span className="text-blue-500 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </div>

      {/* 2. Score Scale Meter Card (Right) */}
      <div className="rounded-2xl sm:rounded-[24px] border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between min-w-0 w-full overflow-hidden">
        {/* Header: Score Scale + Badges + Parameters Info Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">Score Scale</span>
            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-amber-700">
              {score} • {currentTier.label}
            </span>
          </div>

          {onParametersInfo && (
            <button
              onClick={onParametersInfo}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300"
            >
              <Info size={12} className="text-[#0066ff]" />
              <span>Parameters Info</span>
            </button>
          )}
        </div>

        {/* Multi-Segment Horizontal Scale Meter with Pointer Pin */}
        <div className="relative pt-5 sm:pt-6 pb-1 sm:pb-2">
          {/* Active Marker Pin pointing down */}
          <div
            className="absolute -top-1 transition-all duration-700 ease-out z-10 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${pinLeft}%` }}
          >
            <div className="rounded-lg bg-[#D97706] text-white px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[10px] sm:text-[11px] font-black shadow-md flex items-center justify-center min-w-[24px] sm:min-w-[28px]">
              {score}
            </div>
            <div className="w-0 h-0 border-x-[3.5px] sm:border-x-4 border-x-transparent border-t-[4px] sm:border-t-[5px] border-t-[#D97706]" />
          </div>

          {/* 5-Segment Color Bar */}
          <div className="h-2.5 sm:h-3 w-full rounded-full overflow-hidden flex shadow-inner border border-slate-200/60 p-0.5 bg-slate-100">
            {/* Poor (<50): 50% width */}
            <div
              className="h-full rounded-l-full bg-[#EF4444] transition-all"
              style={{ width: '50%' }}
              title="Poor (<50)"
            />
            {/* Suboptimal (51-60): 10% width */}
            <div
              className="h-full bg-[#F97316] transition-all"
              style={{ width: '10%' }}
              title="Suboptimal (51-60)"
            />
            {/* Fair (61-69): 9% width */}
            <div
              className="h-full bg-[#D97706] transition-all"
              style={{ width: '9%' }}
              title="Fair (61-69)"
            />
            {/* Good (70-90): 21% width */}
            <div
              className="h-full bg-[#10B981] transition-all"
              style={{ width: '21%' }}
              title="Good (70-90)"
            />
            {/* Optimal (>90): 10% width */}
            <div
              className="h-full rounded-r-full bg-[#0891B2] transition-all"
              style={{ width: '10%' }}
              title="Optimal (>90)"
            />
          </div>

          {/* Scale Labels Under Segments */}
          <div className="mt-1.5 sm:mt-2 grid grid-cols-5 text-center text-[8.5px] sm:text-[10.5px]">
            <div className={currentTier.key === 'poor' ? 'font-black text-rose-600' : 'text-slate-500 font-semibold'}>
              <div>Poor</div>
              <div className="text-[7.5px] sm:text-[9px] text-slate-400 font-medium">&lt;50</div>
            </div>
            <div className={currentTier.key === 'suboptimal' ? 'font-black text-orange-600' : 'text-slate-500 font-semibold'}>
              <div>
                <span className="sm:hidden">Subopt.</span>
                <span className="hidden sm:inline">Suboptimal</span>
              </div>
              <div className="text-[7.5px] sm:text-[9px] text-slate-400 font-medium">51-60</div>
            </div>
            <div className={currentTier.key === 'fair' ? 'font-black text-amber-700' : 'text-slate-500 font-semibold'}>
              <div>Fair</div>
              <div className="text-[7.5px] sm:text-[9px] text-slate-400 font-medium">61-69</div>
            </div>
            <div className={currentTier.key === 'good' ? 'font-black text-emerald-600' : 'text-slate-500 font-semibold'}>
              <div>Good</div>
              <div className="text-[7.5px] sm:text-[9px] text-slate-400 font-medium">70-90</div>
            </div>
            <div className={currentTier.key === 'optimal' ? 'font-black text-cyan-700' : 'text-slate-500 font-semibold'}>
              <div>Optimal</div>
              <div className="text-[7.5px] sm:text-[9px] text-slate-400 font-medium">&gt;90</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreOverviewRow;
