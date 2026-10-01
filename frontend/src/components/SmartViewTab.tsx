import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProcessedProfile, TestItem } from '../types';
import { RangeIndicatorBar } from './RangeIndicatorBar';
import { getTestExplanation } from '../data/explanations';
import { Profile3DFilterDock } from './Profile3DFilterDock';

interface SmartViewTabProps {
  profiles: Record<string, ProcessedProfile>;
  selectedProfileName?: string | null;
  initialFilter?: 'all' | 'high' | 'normal';
  onFilterChange?: (filter: 'all' | 'high' | 'normal') => void;
  filterMode?: 'all' | 'high' | 'normal';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

interface EnrichedTest extends TestItem {
  profileName: string;
  profileIcon: string;
  uniqueKey: string;
}

export const SmartViewTab: React.FC<SmartViewTabProps> = ({
  profiles,
  selectedProfileName,
  initialFilter = 'all',
  onFilterChange,
  filterMode: controlledFilterMode,
  searchQuery: controlledSearchQuery,
  onSearchChange,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalFilterMode, setInternalFilterMode] = useState<'all' | 'high' | 'normal'>(initialFilter);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(selectedProfileName || null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const filterMode = controlledFilterMode !== undefined ? controlledFilterMode : internalFilterMode;
  const searchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;

  // Sync when parent changes initialFilter or selectedProfileName
  useEffect(() => {
    if (initialFilter && controlledFilterMode === undefined) setInternalFilterMode(initialFilter);
  }, [initialFilter, controlledFilterMode]);

  useEffect(() => {
    if (selectedProfileName !== undefined) setSelectedProfile(selectedProfileName);
  }, [selectedProfileName]);

  const handleFilterChange = (mode: 'all' | 'high' | 'normal') => {
    if (controlledFilterMode === undefined) setInternalFilterMode(mode);
    onFilterChange?.(mode);
  };

  // Flatten all tests across profiles with profile metadata
  const allTests = useMemo<EnrichedTest[]>(() => {
    const list: EnrichedTest[] = [];
    let idx = 0;
    for (const [pName, p] of Object.entries(profiles)) {
      for (const t of p.tests) {
        list.push({
          ...t,
          profileName: pName,
          profileIcon: p.icon || '🔬',
          uniqueKey: `${pName}-${t.test_name}-${idx++}`,
        });
      }
    }
    return list;
  }, [profiles]);

  const isHighTest = (t: TestItem) =>
    ['HIGH', 'LOW', 'CRITICAL', 'POSITIVE'].includes(t.status) && t.flag !== 'REVIEW_REQUIRED';

  const isNormalTest = (t: TestItem) =>
    ['NORMAL', 'REPORTED', 'OPTIMAL', 'DESIRABLE'].includes(t.status);

  // Global counts for filter tabs
  const totalCount = allTests.length;
  const highCount = useMemo(() => allTests.filter(isHighTest).length, [allTests]);
  const normalCount = useMemo(() => allTests.filter(isNormalTest).length, [allTests]);

  // Profile-level counts
  const profileList = useMemo(() => {
    return Object.entries(profiles).map(([name, p]) => {
      let matchingCount = 0;
      if (filterMode === 'high') {
        matchingCount = p.tests.filter(isHighTest).length;
      } else if (filterMode === 'normal') {
        matchingCount = p.tests.filter(isNormalTest).length;
      } else {
        matchingCount = p.tests.length;
      }
      return {
        name,
        icon: p.icon || '🔬',
        totalTests: p.tests.length,
        matchingCount,
        isAbnormal: p.is_abnormal,
      };
    });
  }, [profiles, filterMode]);

  // Filtered test list
  const displayedTests = useMemo(() => {
    let result = allTests;

    // 1. Status filter (High vs Normal vs All)
    if (filterMode === 'high') {
      result = result.filter(isHighTest);
    } else if (filterMode === 'normal') {
      result = result.filter(isNormalTest);
    }

    // 2. Profile filter
    if (selectedProfile) {
      result = result.filter((t) => t.profileName === selectedProfile);
    }

    // 3. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(
        (t) =>
          t.test_name.toLowerCase().includes(query) ||
          t.raw_test_name.toLowerCase().includes(query) ||
          t.profileName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allTests, filterMode, selectedProfile, searchQuery]);

  // Toggle test row expansion
  const toggleTest = (key: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTests(new Set(displayedTests.map((t) => t.uniqueKey)));
  };

  const collapseAll = () => {
    setExpandedTests(new Set());
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* 2-Column Responsive Layout: Left Sidebar (Profiles) + Right Main (Test Parameters) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-1">
        {/* Left Column: Fixed / Sticky 3D Profile Dock */}
        <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-[132px] self-start w-full">
          <Profile3DFilterDock
            profiles={profileList}
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfile}
            filterMode={filterMode}
            highCount={highCount}
            normalCount={normalCount}
            totalCount={totalCount}
          />
        </aside>

        {/* Right Column: Showing All Test Parameters & Test Cards List */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3 min-w-0">
          {/* Active Filter & Context Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Profile Badge (if selected) */}
              {selectedProfile && (
                <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-extrabold text-[#0066ff]">
                  <span>Panel:</span>
                  <span className="text-slate-900">{selectedProfile}</span>
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-blue-100 text-blue-700"
                    title="Clear panel filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Status explanation pill */}
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                {filterMode === 'high' ? (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>High / Attention ({displayedTests.length})</span>
                  </span>
                ) : filterMode === 'normal' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Normal Range ({displayedTests.length})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                    <span>All Parameters ({displayedTests.length})</span>
                  </span>
                )}
              </div>

              {/* Quick switch chip buttons for mobile convenience */}
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                {filterMode !== 'all' && (
                  <button
                    onClick={() => handleFilterChange('all')}
                    className="text-[#0066ff] hover:underline px-1.5 py-0.5"
                  >
                    Show all ({totalCount})
                  </button>
                )}
                {filterMode !== 'high' && highCount > 0 && (
                  <button
                    onClick={() => handleFilterChange('high')}
                    className="text-rose-600 hover:underline px-1.5 py-0.5 flex items-center gap-0.5"
                  >
                    <span>Show high ({highCount})</span>
                  </button>
                )}
                {filterMode !== 'normal' && (
                  <button
                    onClick={() => handleFilterChange('normal')}
                    className="text-emerald-600 hover:underline px-1.5 py-0.5"
                  >
                    Show normal ({normalCount})
                  </button>
                )}
              </div>
            </div>

            {/* Expand / Collapse Controls */}
            {displayedTests.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-slate-500 self-end sm:self-auto">
                <button
                  onClick={expandAll}
                  className="hover:text-[#0066ff] transition"
                >
                  Expand all
                </button>
                <span>•</span>
                <button
                  onClick={collapseAll}
                  className="hover:text-[#0066ff] transition"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>

          {/* 3. Direct Test List View (Requirement 2) */}
          {displayedTests.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-500 my-2 border border-slate-200 shadow-sm">
              {filterMode === 'high' ? (
                <>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedProfile
                      ? `No High parameters found in ${selectedProfile}`
                      : 'All evaluated parameters are Normal!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {selectedProfile
                      ? 'None of the tests in this profile exceed clinical alert thresholds.'
                      : 'Great news! None of the test values in this report are in the high or abnormal range.'}
                  </p>
                  {selectedProfile && (
                    <button
                      onClick={() => setSelectedProfile(null)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      <RotateCcw size={13} /> View all High tests
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Activity size={36} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-black text-slate-900">No test parameters match your query</h3>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the search query or switching the profile filter.</p>
                  {selectedProfile && (
                    <button
                      onClick={() => setSelectedProfile(null)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800"
                    >
                      Show all profiles
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTests.map((test) => {
                const isExpanded = expandedTests.has(test.uniqueKey);
                const isHigh = isHighTest(test);
                const isBorderline = test.status === 'BORDERLINE';
                const isNormal = isNormalTest(test);

                return (
                  <div
                    key={test.uniqueKey}
                    className={`rounded-2xl border transition-all overflow-hidden ${isHigh
                      ? 'border-rose-200/90 bg-white hover:border-rose-300 shadow-xs'
                      : isBorderline
                        ? 'border-amber-200 bg-white hover:border-amber-300 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                  >
                    {/* Test Row Header Button */}
                    <button
                      onClick={() => toggleTest(test.uniqueKey)}
                      className={`w-full px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between text-left transition-colors ${isExpanded ? 'bg-slate-50/70 border-b border-slate-100' : 'hover:bg-slate-50/50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0 pr-2 sm:pr-4">
                        <div
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${isHigh
                            ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                            : isBorderline
                              ? 'bg-amber-500'
                              : isNormal
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-slate-950 truncate">
                              {test.test_name}
                            </span>

                            {/* Profile category badge */}
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-600">
                              <span>{test.profileIcon}</span>
                              <span className="max-w-[85px] sm:max-w-[140px] truncate">{test.profileName}</span>
                            </span>

                            {test.specimen_type && (
                              <span className="text-[8.5px] sm:text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {test.specimen_type}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                            <span className="truncate">{test.raw_test_name}</span>
                            {test.method && (
                              <span className="text-slate-400 italic hidden sm:inline">· {test.method}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Value and Status Tag */}
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xs sm:text-base font-black ${isHigh
                              ? 'text-rose-600'
                              : isBorderline
                                ? 'text-amber-600'
                                : isNormal
                                  ? 'text-emerald-700'
                                  : 'text-slate-900'
                              }`}
                          >
                            {test.raw_value
                              ? test.raw_value.includes(test.raw_unit || '___')
                                ? test.raw_value
                                : `${test.raw_value} ${test.raw_unit || ''}`
                              : `${test.value ?? '—'} ${test.raw_unit || ''}`}
                          </div>

                          <div className="text-[9px] sm:text-[10px] font-semibold text-slate-400">
                            Ref: {test.inferred_range ? `${test.inferred_range}` : (test.reference_range.raw || (test.reference_range.low !== null && test.reference_range.high !== null ? `${test.reference_range.low} - ${test.reference_range.high}` : 'Standard'))}
                          </div>
                        </div>

                        {/* Status Pill Badge */}
                        <div className="min-w-[55px] sm:min-w-[70px] text-center">
                          {isHigh ? (
                            <span className="inline-block w-full rounded-full bg-rose-100 border border-rose-200 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-700 uppercase">
                              {test.status === 'LOW' ? 'Low' : test.status === 'CRITICAL' ? 'Critical' : 'High'}
                              {test.is_inferred && (
                                <span className="block text-[7.5px] font-bold text-rose-500 normal-case tracking-tight">AI Inferred</span>
                              )}
                            </span>
                          ) : isNormal ? (
                            <span className="inline-block w-full rounded-full bg-emerald-100 border border-emerald-200 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-700 uppercase">
                              Normal
                              {test.is_inferred && (
                                <span className="block text-[7.5px] font-bold text-emerald-600 normal-case tracking-tight">AI Inferred</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-block w-full rounded-full bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-600 uppercase">
                              {test.status}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Test Details & Biological Explanation */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 bg-slate-50/60">
                        <RangeIndicatorBar
                          value={test.value}
                          unit={test.raw_unit}
                          range={test.reference_range}
                          status={test.status}
                        />

                        {/* AI Clinical Inferred Interval Explainer */}
                        {test.is_inferred && (
                          <div className="mt-3 p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-xs text-blue-950 flex items-start gap-2.5">
                            <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-blue-900">
                                AI Clinical Reference Range Resolution
                              </p>
                              <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                                {test.clinical_rationale || `Evaluated against standard clinical reference interval of ${test.inferred_range || 'universal limits'}.`}
                              </p>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const exp = getTestExplanation(test.test_name, test.status);
                          if (!exp) return null;
                          const statusMeaning =
                            test.status === 'HIGH'
                              ? exp.high_meaning || exp.meaning
                              : test.status === 'LOW'
                                ? exp.low_meaning || exp.meaning
                                : exp.meaning;

                          return (
                            <div className="mt-3.5 p-4 bg-white rounded-2xl border border-blue-100/90 shadow-xs flex flex-col gap-2 text-xs">
                              <div className="flex items-start gap-2.5">
                                <Info size={16} className="text-[#0066ff] shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1 w-full">
                                  <p className="text-[11px] font-black text-[#0066ff] uppercase tracking-wider">
                                    About {test.test_name} ({test.profileName})
                                  </p>
                                  <p className="text-slate-700 leading-relaxed font-semibold">
                                    {exp.what}
                                  </p>
                                  <p className="text-slate-600 leading-relaxed text-[11px]">
                                    <span className="font-bold text-slate-800">Biological Role: </span>
                                    {exp.function}
                                  </p>
                                  {statusMeaning && (
                                    <p className="text-slate-800 leading-relaxed text-[11px] pt-2 border-t border-slate-100 font-medium">
                                      <span
                                        className={`font-black ${isNormal ? 'text-emerald-700' : 'text-rose-700'
                                          }`}
                                      >
                                        Clinical Finding ({test.status}):
                                      </span>{' '}
                                      {statusMeaning}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};