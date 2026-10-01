'use client';

import React, { useState, useRef } from 'react';
import { BioHologram3D } from './BioHologram3D';

export interface ProfileItemData {
  name: string;
  icon: string;
  totalTests: number;
  matchingCount: number;
  isAbnormal: boolean;
}

interface Profile3DFilterDockProps {
  profiles: ProfileItemData[];
  selectedProfile: string | null;
  onSelectProfile: (name: string | null) => void;
  filterMode: 'all' | 'high' | 'normal';
  highCount: number;
  normalCount: number;
  totalCount: number;
}

// 3D Tactile Profile Tile with Mouse-Follow Tilt & Spatial Depth
const Tile3D: React.FC<{
  isSelected: boolean;
  onClick: () => void;
  icon: string;
  name: string;
  count: number;
  filterMode: 'all' | 'high' | 'normal';
}> = ({ isSelected, onClick, icon, name, count, filterMode }) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, isHovered: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -y * 16, // rotateX
      y: x * 16,  // rotateY
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, isHovered: false });
  };

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
      }}
      className="group relative w-auto lg:w-full min-w-[145px] sm:min-w-[160px] lg:min-w-0 shrink-0 outline-none select-none text-left"
    >
      <div
        style={{
          transform: tilt.isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px) translateY(-3px)`
            : isSelected
            ? 'translateY(-2px)'
            : 'translateY(0px)',
          transition: tilt.isHovered
            ? 'transform 0.08s ease-out, box-shadow 0.15s ease'
            : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
          transformStyle: 'preserve-3d',
        }}
        className={`relative flex items-center justify-between gap-2 sm:gap-2.5 w-full rounded-xl sm:rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-black transition-all ${
          isSelected
            ? 'bg-gradient-to-b from-[#0066ff] via-[#0055d4] to-[#0047b3] text-white border-t border-blue-200/50 shadow-[0_5px_0_#003380,0_16px_28px_rgba(0,102,255,0.45)]'
            : 'bg-gradient-to-b from-white via-slate-50 to-slate-100/90 text-slate-700 border border-slate-200/90 border-t-white shadow-[0_4px_0_#cbd5e1,0_10px_20px_rgba(15,23,42,0.06)] hover:border-blue-300/80 hover:shadow-[0_6px_0_#94a3b8,0_18px_30px_rgba(0,102,255,0.18)]'
        }`}
      >
        {/* Specular Light Reflection Sheen */}
        <div
          className={`absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none ${
            isSelected
              ? 'bg-gradient-to-b from-white/25 to-transparent'
              : 'bg-gradient-to-b from-white/80 to-transparent'
          }`}
        />

        {/* Left: 3D Floating Icon & Profile Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            style={{ transform: 'translateZ(24px)' }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-xs transition-transform duration-200 ${
              isSelected
                ? 'bg-white/20 text-white shadow-inner'
                : 'bg-white text-slate-800 shadow-sm border border-slate-100 group-hover:scale-110'
            }`}
          >
            {icon}
          </div>

          <div style={{ transform: 'translateZ(14px)' }} className="flex flex-col text-left min-w-0 flex-1">
            <span className="truncate text-xs font-black tracking-tight">
              {name}
            </span>
            <span
              className={`text-[9px] font-extrabold uppercase tracking-wider ${
                isSelected ? 'text-blue-100' : 'text-slate-400'
              }`}
            >
              {filterMode === 'high' ? 'High alert' : filterMode === 'normal' ? 'Normal range' : 'Parameters'}
            </span>
          </div>
        </div>

        {/* Right: 3D Count Pill Badge */}
        <div
          style={{ transform: 'translateZ(18px)' }}
          className={`shrink-0 ml-1 rounded-full px-2 py-0.5 text-[10px] font-black shadow-xs ${
            isSelected
              ? 'bg-white text-[#0066ff] shadow-sm'
              : count > 0 && filterMode === 'high'
              ? 'bg-rose-500 text-white shadow-rose-500/30 shadow-md animate-pulse'
              : count > 0 && filterMode === 'normal'
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {count}
        </div>
      </div>
    </button>
  );
};

export const Profile3DFilterDock: React.FC<Profile3DFilterDockProps> = ({
  profiles,
  selectedProfile,
  onSelectProfile,
  filterMode,
  highCount,
  normalCount,
  totalCount,
}) => {
  const activeTotal =
    filterMode === 'high' ? highCount : filterMode === 'normal' ? normalCount : totalCount;

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-[26px] border border-slate-200/90 bg-white/95 p-3 sm:p-3.5 shadow-[0_20px_55px_-12px_rgba(0,102,255,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset] backdrop-blur-2xl flex flex-col"
    >
      {/* Specular Ambient Glow Effects */}
      <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />
      <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />

      {/* Header Bar with 3D Hologram */}
      <div className="relative z-10 flex items-center justify-between pb-2.5 sm:pb-3 mb-2 sm:mb-2.5 border-b border-slate-100 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className="shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/80 border border-blue-200/80 p-1 shadow-[0_3px_0_#cbd5e1,0_6px_12px_rgba(15,23,42,0.06)]"
            title="3D Laboratory Bio-Hologram"
          >
            <BioHologram3D
              size={28}
              color={filterMode === 'high' ? '#ef4444' : filterMode === 'normal' ? '#10b981' : '#0066ff'}
              isPulsing={selectedProfile !== null}
            />
          </div>
          <div>
            <div className="text-xs font-black tracking-tight text-slate-950">Profiles</div>
            <div className="text-[10px] font-bold text-slate-400">{profiles.length} panels</div>
          </div>
        </div>

        {selectedProfile && (
          <button
            onClick={() => onSelectProfile(null)}
            className="text-[10px] font-black text-[#0066ff] hover:underline"
          >
            Show all
          </button>
        )}
      </div>

      {/* Profile Tiles: horizontal scroll on mobile, vertical stack on desktop */}
      <div className="relative z-10 flex lg:flex-col gap-2 sm:gap-2.5 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto max-h-[140px] lg:max-h-[calc(100vh-230px)] py-1 pr-1 scrollbar-none touch-pan-x">
        {/* "All Profiles" 3D Tile */}
        <Tile3D
          isSelected={selectedProfile === null}
          onClick={() => onSelectProfile(null)}
          icon="🗂️"
          name="All Profiles"
          count={activeTotal}
          filterMode={filterMode}
        />

        {/* Individual 3D Profile Tiles */}
        {profiles.map((p) => (
          <Tile3D
            key={p.name}
            isSelected={selectedProfile === p.name}
            onClick={() => onSelectProfile(selectedProfile === p.name ? null : p.name)}
            icon={p.icon}
            name={p.name}
            count={p.matchingCount}
            filterMode={filterMode}
          />
        ))}
      </div>
    </div>
  );
};
