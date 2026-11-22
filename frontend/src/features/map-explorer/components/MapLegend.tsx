import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { EVENT_STYLES } from '../utils/canvasRenderer';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-20 bg-[#101925]/95 backdrop-blur-md border border-[#1E2B3E] rounded-lg shadow-xl text-xs font-mono text-[#F8FAFC] select-none transition-all">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-[#1E2B3E] hover:bg-[#172435]"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-300">
          <Layers size={13} className="text-[#00D9F5]" />
          <span>Spatial Legend</span>
        </span>
        <button type="button" aria-label="Toggle Legend" className="text-slate-400 hover:text-white">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 min-w-[210px]">
          {/* Entity Emotes & Trajectories */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Entity Visuals & Emotes</div>
            <div className="space-y-2 text-[11px]">
              {/* Human Operative Emote */}
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rotate-45 border border-[#00D9F5] bg-[#061320] flex items-center justify-center flex-shrink-0">
                  <span className="-rotate-45 w-1.5 h-1.5 bg-[#00D9F5] rounded-full" />
                </span>
                <span className="text-slate-200 font-medium">Human Operative Emote</span>
              </div>

              {/* Bot Mech Emote */}
              <div className="flex items-center gap-2">
                <span className="relative w-3.5 h-3.5 rounded-sm border border-[#FF9F1C] bg-[#1A1207] flex items-center justify-center flex-shrink-0">
                  <span className="absolute -top-1 w-0.5 h-1 bg-[#EF4444]" />
                  <span className="w-2 h-1 bg-[#FF9F1C] rounded-[1px] flex items-center justify-around px-0.5">
                    <span className="w-0.5 h-0.5 bg-[#00D9F5] rounded-full" />
                    <span className="w-0.5 h-0.5 bg-[#00D9F5] rounded-full" />
                  </span>
                </span>
                <span className="text-slate-200 font-medium">AI Combat Bot Emote</span>
              </div>

              {/* Human Trajectory */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#1E2B3E]">
                <span className="w-5 h-1 bg-[#00D9F5] rounded-full shadow-[0_0_6px_rgba(0,217,245,0.6)]" />
                <span className="text-slate-300">Human Path (Solid Cyan)</span>
              </div>

              {/* Bot Trajectory */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-1 border-t-2 border-dashed border-[#FF9F1C] bg-black/60" />
                <span className="text-slate-300">Bot Path (Dashed Amber)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-white/60" />
                <span className="text-slate-300">Spawn Point / Origin</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#EF4444] border border-white/60" />
                <span className="text-slate-300">Elimination Marker</span>
              </div>
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Discrete Events</div>
            <div className="space-y-1.5 text-[11px]">
              {Object.entries(EVENT_STYLES).map(([key, item]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-slate-300">
                    {item.label === 'Loot' ? 'Loot Events' : item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
