import React from 'react';
import { MapId } from '../../../types/telemetry';
import { Database, ShieldCheck, MapPin, Calendar, Layers } from 'lucide-react';

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
    <div className="bg-[#0E131F] border-b border-[#1E293B] px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
      {/* Left: Context Selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Map Selector */}
        <div className="flex items-center gap-1.5 bg-[#151D2E] border border-[#1E293B] px-2.5 py-1.5 rounded-lg text-slate-300">
          <MapPin size={13} className="text-[#00E5FF]" />
          <span className="text-[#64748B] uppercase">Map:</span>
          <select
            value={selectedMap}
            onChange={(e) => onSelectMap(e.target.value as MapId | 'all')}
            className="bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
          >
            <option value="AmbroseValley" className="bg-[#0E131F] text-slate-200">Ambrose Valley</option>
            <option value="GrandRift" className="bg-[#0E131F] text-slate-200">Grand Rift</option>
            <option value="Lockdown" className="bg-[#0E131F] text-slate-200">Lockdown</option>
            <option value="all" className="bg-[#0E131F] text-slate-200">All Maps Combined</option>
          </select>
        </div>

        {/* Date Scope */}
        <div className="flex items-center gap-1.5 bg-[#151D2E] border border-[#1E293B] px-2.5 py-1.5 rounded-lg text-slate-300">
          <Calendar size={13} className="text-[#F59E0B]" />
          <span className="text-[#64748B] uppercase">Date Range:</span>
          <span className="text-slate-200 font-semibold">Feb 10 – 14, 2026</span>
        </div>

        {/* Entity Classification Scope */}
        <div className="flex items-center gap-1.5 bg-[#151D2E] border border-[#1E293B] px-2.5 py-1.5 rounded-lg text-slate-300">
          <Layers size={13} className="text-[#A855F7]" />
          <span className="text-[#64748B] uppercase">Entity Scope:</span>
          <span className="text-slate-200 font-semibold">Humans (245) & Bots (94)</span>
        </div>
      </div>

      {/* Right: Data Scope & Engine Status */}
      <div className="flex items-center gap-3">
        {/* Active Grounded Status */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded text-emerald-400">
          <ShieldCheck size={13} />
          <span className="font-semibold tracking-wider uppercase">Deterministic Grounding</span>
        </div>

        {/* Record Counter */}
        <div className="flex items-center gap-1.5 text-[#94A3B8] bg-[#151D2E] px-3 py-1 rounded border border-[#1E293B]">
          <Database size={13} className="text-[#10B981]" />
          <span>{recordCount.toLocaleString()} Records Available</span>
        </div>
      </div>
    </div>
  );
};
