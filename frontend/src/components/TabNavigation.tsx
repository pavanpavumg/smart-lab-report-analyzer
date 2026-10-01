import React from 'react';
import { Activity, LayoutDashboard, Search, X } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'overview' | 'anatomy' | 'smart-view';
  setActiveTab: (tab: 'overview' | 'anatomy' | 'smart-view') => void;
  abnormalCount?: number;
  totalCount?: number;
  normalCount?: number;
  filterMode?: 'all' | 'high' | 'normal';
  onFilterChange?: (filter: 'all' | 'high' | 'normal') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  abnormalCount = 0,
  totalCount = 0,
  normalCount = 0,
  filterMode = 'all',
  onFilterChange,
  searchQuery = '',
  onSearchChange,
}) => (
  <div className="sticky top-14 sm:top-[68px] z-40 mt-3 sm:mt-4 border-b border-slate-200 bg-[#f6f9fc]/95 py-2 sm:py-2.5 backdrop-blur-xl w-full min-w-0">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
      {/* Left: 3 Tabs (Overview / Human Anatomy Map / All parameters) & Segmented Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
        {/* Navigation Tabs (3 Columns on Mobile, Inline on Desktop) */}
        <div className="grid grid-cols-3 sm:inline-flex rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-0.5 sm:p-1 shadow-xs w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black transition ${
              activeTab === 'overview'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={13} className="sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('anatomy')}
            className={`flex items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black transition ${
              activeTab === 'anatomy'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-xs sm:text-sm">🫀</span>
            <span className="sm:hidden">Anatomy</span>
            <span className="hidden sm:inline">Human Anatomy Map</span>
          </button>

          <button
            onClick={() => setActiveTab('smart-view')}
            className={`flex items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black transition ${
              activeTab === 'smart-view'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Activity size={13} className="sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden">Parameters</span>
            <span className="hidden sm:inline">All parameters</span>
            {abnormalCount > 0 && activeTab !== 'smart-view' && (
              <span className="rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black bg-rose-100 text-rose-700">
                {abnormalCount}
              </span>
            )}
          </button>
        </div>

        {/* When activeTab === 'smart-view': Segmented Filter Tabs (All, High, Normal) */}
        {activeTab === 'smart-view' && onFilterChange && (
          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-white rounded-xl sm:rounded-2xl p-0.5 sm:p-1 border border-slate-200 shadow-xs w-full sm:w-auto shrink-0 animate-in fade-in duration-200">
            <button
              onClick={() => onFilterChange('all')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-1.5 text-[10.5px] sm:text-xs font-black transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] ${
                  filterMode === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => onFilterChange('high')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-1.5 text-[10.5px] sm:text-xs font-black transition-all ${
                filterMode === 'high'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25 ring-1 ring-rose-600'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span>High</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                  filterMode === 'high' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {abnormalCount}
              </span>
            </button>

            <button
              onClick={() => onFilterChange('normal')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-1.5 text-[10.5px] sm:text-xs font-black transition-all ${
                filterMode === 'normal'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 ring-1 ring-emerald-600'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Normal</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                  filterMode === 'normal' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {normalCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right side: Search Bar when in smart-view, or Structured Report View when in overview */}
      {activeTab === 'smart-view' && onSearchChange ? (
        <div className="relative flex-1 max-w-sm md:max-w-md sm:ml-auto w-full md:w-auto animate-in fade-in duration-200">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={14} className="sm:w-[15px] sm:h-[15px]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search test names or profiles..."
            className="w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="hidden items-center gap-2 text-[10px] font-bold text-slate-400 lg:flex shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Structured report view
        </div>
      )}
    </div>
  </div>
);

