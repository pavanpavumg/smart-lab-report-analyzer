import React, { useState } from 'react';
import { Utensils, ChevronDown, ChevronUp, Check, X, AlertCircle } from 'lucide-react';
import { DietGroup } from '../types';

interface DietRecommendationsSectionProps {
  recommendations: DietGroup[];
}

export const DietRecommendationsSection: React.FC<DietRecommendationsSectionProps> = ({ recommendations }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-emerald-50/60 rounded-3xl p-4 border border-emerald-200 m-0 text-emerald-900 text-xs font-semibold flex items-center gap-2">
        <Utensils size={16} className="text-emerald-600" />
        <span>Balanced standard diet recommended. No specific restricted profiles detected.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-2xs m-0 transition-all min-w-0 w-full overflow-hidden">

      {/* Header Accordion Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none gap-2"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center text-sm sm:text-base shadow-2xs shrink-0">
            🥗
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                Diet & Lifestyle Guidance
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400">({recommendations.length})</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate sm:line-clamp-none">
              Targeted nutritional advice tailored for detected abnormalities
            </p>
          </div>
        </div>

        <div className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-3 sm:gap-3.5 min-w-0 w-full">
          {/* Quick Legend Pill */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-bold text-slate-500 bg-slate-50/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto max-w-full">
            <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black shrink-0">✓</span> Include
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="flex items-center gap-1 text-rose-700 font-extrabold">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[9px] font-black shrink-0">✕</span> Avoid
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="flex items-center gap-1 text-amber-700 font-extrabold">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-black shrink-0">!</span> Limit
            </span>
          </div>

          {recommendations.map((group) => (
            <div
              key={group.profile}
              className="bg-slate-50/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 transition-all hover:bg-slate-50 min-w-0 w-full"
            >
              {/* Profile Subheader */}
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/80 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base shrink-0">{group.icon}</span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                    {group.profile}
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 shrink-0">
                  {group.items.length} tips
                </span>
              </div>

              {/* Items List */}
              <ul className="flex flex-col gap-2 min-w-0 w-full">
                {group.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 sm:gap-2.5 text-[11.5px] sm:text-xs font-medium leading-relaxed min-w-0 w-full">
                    {item.type === 'do' && (
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 flex items-center justify-center mt-0.5 font-black text-[10px] sm:text-[11px]">
                        ✓
                      </span>
                    )}
                    {item.type === 'avoid' && (
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-100 text-rose-700 shrink-0 flex items-center justify-center mt-0.5 font-black text-[10px] sm:text-[11px]">
                        ✕
                      </span>
                    )}
                    {item.type === 'limit' && (
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-100 text-amber-700 shrink-0 flex items-center justify-center mt-0.5 font-black text-[10px] sm:text-[11px]">
                        !
                      </span>
                    )}
                    <span className={`min-w-0 flex-1 break-words ${
                      item.type === 'do' ? 'text-emerald-950 font-semibold' :
                        item.type === 'avoid' ? 'text-rose-950 font-semibold' :
                          'text-amber-950 font-semibold'
                    }`}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};