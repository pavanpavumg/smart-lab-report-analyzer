import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';
import { RiskFactor } from '../types';

interface RiskCalculatorSectionProps {
  risks: RiskFactor[];
  onSelectProfile?: (profileName: string) => void;
}

export const RiskCalculatorSection: React.FC<RiskCalculatorSectionProps> = ({ risks, onSelectProfile }) => {
  if (!risks || risks.length === 0) {
    return (
      <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200 shadow-sm m-0 flex items-center gap-3">
        <CheckCircle size={24} className="text-emerald-600 shrink-0" />
        <div>
          <h3 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
            Low Clinical Risk Profile
          </h3>
          <p className="text-xs text-emerald-700 font-medium">
            No critical health risks detected based on analyzed test parameters. Maintain healthy lifestyle habits.
          </p>
        </div>
      </div>
    );
  }

  const highRisks = risks.filter(r => r.severity === 'HIGH');

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-2xs m-0 min-w-0 w-full overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 sm:mb-3.5 sm:pb-3 border-b border-slate-100 min-w-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center text-sm sm:text-base shadow-2xs shrink-0">
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                Clinical Risk Assessment
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400">({risks.length})</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate sm:line-clamp-none">
              Identified health conditions requiring medical awareness
            </p>
          </div>
        </div>

        <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border shrink-0 ${
          highRisks.length > 0 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-rose-500 animate-pulse" />
          {highRisks.length > 0 ? `${highRisks.length} High Risk` : 'Moderate Risk'}
        </span>
      </div>

      {/* Risks List */}
      <div className="flex flex-col gap-2.5 sm:gap-3 min-w-0 w-full">
        {risks.map((risk) => (
          <div
            key={risk.id}
            className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all min-w-0 w-full ${
              risk.severity === 'HIGH'
                ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                : 'bg-amber-50/50 border-amber-200 text-amber-950'
            }`}
          >
            {/* Risk Title & Severity Dot */}
            <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                  risk.severity === 'HIGH' ? 'bg-rose-600 shadow-sm shadow-rose-500/50 animate-pulse' : 'bg-amber-500'
                }`} />
                <span className="text-xs sm:text-[13px] font-black text-slate-900 leading-snug break-words">
                  {risk.name}
                </span>
              </div>
              <span className={`shrink-0 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                risk.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {risk.severity}
              </span>
            </div>

            {/* Affected Parameters */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 my-1.5 max-w-full">
              <span className="text-[10px] font-bold text-slate-400">Triggered by:</span>
              {risk.tests.map((t) => (
                <span
                  key={t}
                  className="text-[9.5px] sm:text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700 shadow-2xs"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Actionable Advice */}
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-black/5 text-[11px] sm:text-xs font-semibold text-slate-800 leading-relaxed min-w-0 w-full">
              <UserCheck size={14} className="text-[#0066ff] shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0 break-words">{risk.advice}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};