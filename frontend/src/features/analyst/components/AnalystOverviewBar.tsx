import React from 'react';
import { MapId } from '../../../types/telemetry';
import { ShieldCheck, MapPin, Calendar, Layers, Database } from 'lucide-react';

interface AnalystOverviewBarProps {
  selectedMap: MapId | 'all';
  onSelectMap: (map: MapId | 'all') => void;
  recordCount: number;
}

export const AnalystOverviewBar: React.FC<AnalystOverviewBarProps> = ({
  selectedMap,
  onSelectMap,
  recordCount,
}) => {
  return (
    <div className="glass-header px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-10">
      {/* Left: Context Selectors */}
      <div className="flex items-center gap-3.5 flex-wrap">
        {/* Map Selector */}
        <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-xl text-slate-300">
          <MapPin size={14} className="text-[#00E5FF]" />
          <span className="text-slate-400 uppercase text-[10px] tracking-wider">Map:</span>
          <select
            value={selectedMap}
            onChange={(e) => onSelectMap(e.target.value as MapId | 'all')}
            className="bg-transparent text-slate-100 outline-none cursor-pointer font-bold font-mono text-xs pr-1"
          >
            <option value="AmbroseValley" className="bg-[#0E131F] text-slate-100">Ambrose Valley</option>
            <option value="GrandRift" className="bg-[#0E131F] text-slate-100">Grand Rift</option>
            <option value="Lockdown" className="bg-[#0E131F] text-slate-100">Lockdown</option>
            <option value="all" className="bg-[#0E131F] text-slate-100">All Maps Combined</option>
          </select>
        </div>

        {/* Date Scope */}
        <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-xl text-slate-300">
          <Calendar size={14} className="text-[#F59E0B]" />
          <span className="text-slate-400 uppercase text-[10px] tracking-wider">Date:</span>
          <span className="text-slate-200 font-semibold font-sans">Feb 10 – 14, 2026</span>
        </div>

        {/* Entity Classification Scope */}
        <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-xl text-slate-300">
          <Layers size={14} className="text-[#A855F7]" />
          <span className="text-slate-400 uppercase text-[10px] tracking-wider">Scope:</span>
          <span className="text-slate-200 font-semibold font-sans">245 Humans · 94 Bots</span>
        </div>
      </div>

      {/* Right: Data Scope & Engine Status */}
      <div className="flex items-center gap-3">
        {/* Active Grounded Status */}
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
          <ShieldCheck size={14} />
          <span className="font-semibold tracking-wider uppercase text-[10px]">Deterministic Grounding</span>
        </div>

        {/* Record Counter */}
        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-xl text-slate-300">
          <Database size={14} className="text-cyan-400" />
          <span className="text-slate-400 text-[10px]">Events:</span>
          <span className="text-slate-100 font-bold font-mono">{recordCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
