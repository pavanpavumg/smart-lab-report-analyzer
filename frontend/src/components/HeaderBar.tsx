import React from 'react';
import { ArrowLeft, CalendarDays, FileUp, Share2, UserRound } from 'lucide-react';
import { PatientInfo, ReportMetadata } from '../types';

interface HeaderBarProps {
  patient: PatientInfo;
  report: ReportMetadata;
  status: string;
  onUploadNewPdf?: () => void;
  onBackToHome?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ patient, report, onUploadNewPdf, onBackToHome }) => {
  const date = (() => {
    const d = new Date(report.report_date);
    return Number.isNaN(d.getTime()) ? report.report_date : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 sm:h-[68px] max-w-[1440px] items-center justify-between px-3 sm:px-6 lg:px-8">
        <div 
          onClick={onBackToHome}
          className={`flex min-w-0 items-center gap-2 sm:gap-3 ${onBackToHome ? 'cursor-pointer group' : ''}`}
          title={onBackToHome ? 'Click to return to home upload page' : undefined}
        >
          <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-[#0066ff] text-white shadow-md shadow-blue-500/20 transition group-hover:scale-105">
            <span className="text-xs sm:text-sm font-black">T</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-tight text-slate-950 group-hover:text-[#0066ff] transition">
              Tez <span className="text-[#0066ff]">SmartApp</span>
            </div>
            <div className="hidden text-[9px] font-bold uppercase tracking-[.18em] text-slate-400 sm:block">
              Laboratory intelligence
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <UserRound size={13} className="text-[#0066ff]" />
            <span className="max-w-[150px] truncate text-xs font-extrabold text-slate-800">{patient.name}</span>
            {patient.age ? <span className="text-[10px] font-semibold text-slate-400">{patient.age}y · {patient.gender}</span> : null}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">
            <CalendarDays size={13} className="text-[#0066ff]" /> {date}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-[#0066ff]"
              title="Return to main upload page"
            >
              <ArrowLeft size={14} className="text-[#0066ff]" />
              <span className="hidden sm:inline">Upload New File</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
          {onUploadNewPdf && (
            <button 
              onClick={onUploadNewPdf} 
              className="hidden items-center gap-1.5 rounded-xl bg-[#0066ff] px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/15 transition hover:bg-blue-700 sm:flex"
            >
              <FileUp size={14} /> Quick Pick
            </button>
          )}
          <button 
            onClick={() => navigator.share?.({ title: `Lab report — ${patient.name}`, url: window.location.href })} 
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0066ff]" 
            aria-label="Share report"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};

