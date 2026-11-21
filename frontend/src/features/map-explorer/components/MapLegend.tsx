import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { EVENT_STYLES } from '../utils/canvasRenderer';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-3 right-3 z-20 bg-[#0E131F]/90 backdrop-blur-md border border-[#1E293B] rounded-lg shadow-xl text-xs font-mono text-[#F8FAFC] select-none transition-all">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-[#1E293B] hover:bg-[#151D2E]/60"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="flex items-center gap-1.5 font-semibold text-[11px] text-[#94A3B8]">
          <Layers size={12} className="text-[#00E5FF]" />
          Visual Legend
        </span>
        <button className="text-[#64748B] hover:text-[#F8FAFC]">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 min-w-[200px]">
          {/* Trajectories */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5">Trajectories</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[#00E5FF]" />
                <span className="text-[#94A3B8]">Human Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t border-dashed border-[#A855F7]" />
                <span className="text-[#94A3B8]">Bot Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-white/60" />
                <span className="text-[#94A3B8]">Spawn (Start)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#EF4444] border border-white/60" />
                <span className="text-[#94A3B8]">Terminal (Death)</span>
              </div>
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5">Event Nodes</div>
            <div className="space-y-1 text-[11px]">
              {Object.entries(EVENT_STYLES).map(([key, item]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-[#94A3B8]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
