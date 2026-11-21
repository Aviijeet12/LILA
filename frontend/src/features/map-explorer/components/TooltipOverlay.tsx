import React from 'react';
import { HoveredTarget } from '../../../types/telemetry';
import { EVENT_STYLES } from '../utils/canvasRenderer';

interface TooltipOverlayProps {
  hovered: HoveredTarget;
  containerWidth: number;
  containerHeight: number;
}

export const TooltipOverlay: React.FC<TooltipOverlayProps> = ({
  hovered,
  containerWidth,
  containerHeight,
}) => {
  if (!hovered) return null;

  const tooltipWidth = 240;
  const tooltipHeight = 110;

  let left = hovered.screenX + 14;
  let top = hovered.screenY + 14;

  if (left + tooltipWidth > containerWidth - 10) {
    left = Math.max(10, hovered.screenX - tooltipWidth - 14);
  }
  if (top + tooltipHeight > containerHeight - 10) {
    top = Math.max(10, hovered.screenY - tooltipHeight - 14);
  }

  if (hovered.type === 'event') {
    const ev = hovered.event;
    const style = EVENT_STYLES[ev.event] ?? { label: ev.event, color: '#00E5FF' };

    return (
      <div
        className="absolute pointer-events-none z-30 bg-[#0E131F]/95 backdrop-blur-sm border border-[#1E293B] rounded-lg p-2.5 text-xs font-mono shadow-2xl shadow-black/80"
        style={{ left, top, width: tooltipWidth }}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1E293B]">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: style.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: style.color }} />
            {style.label}
          </span>
          <span className="text-[10px] text-[#64748B]">{ev.iso?.slice(11, 19) ?? `${ev.ts}s`}</span>
        </div>

        <div className="space-y-1 text-[11px]">
          {ev.user_id && (
            <div className="flex justify-between text-[#94A3B8]">
              <span className="text-[#64748B]">Entity:</span>
              <span className="text-[#F8FAFC] truncate max-w-[130px]">{ev.user_id}</span>
            </div>
          )}
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">World (X, Z):</span>
            <span className="text-[#F8FAFC]">({ev.x.toFixed(1)}, {ev.z.toFixed(1)})</span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">UV:</span>
            <span className="text-[#64748B]">({ev.u?.toFixed(3)}, {ev.v?.toFixed(3)})</span>
          </div>
        </div>
      </div>
    );
  }

  if (hovered.type === 'journey') {
    const j = hovered.journey;
    const isHuman = j.entity_type === 'human';

    return (
      <div
        className="absolute pointer-events-none z-30 bg-[#0E131F]/95 backdrop-blur-sm border border-[#1E293B] rounded-lg p-2.5 text-xs font-mono shadow-2xl shadow-black/80"
        style={{ left, top, width: tooltipWidth }}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1E293B]">
          <span className={`font-bold flex items-center gap-1.5 ${isHuman ? 'text-[#00E5FF]' : 'text-[#C084FC]'}`}>
            <span className={`w-2 h-2 rounded-full ${isHuman ? 'bg-[#00E5FF]' : 'bg-[#C084FC]'}`} />
            {isHuman ? 'Human Journey' : 'Bot Journey'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${j.outcome === 'ELIMINATED' ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
            {j.outcome}
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">ID:</span>
            <span className="text-[#F8FAFC] truncate max-w-[130px]">{j.user_id}</span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Distance:</span>
            <span className="text-[#F8FAFC]">{Math.round(j.distance_travelled_meters).toLocaleString()} m</span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Samples:</span>
            <span className="text-[#F8FAFC]">{j.positions_count} pts</span>
          </div>
        </div>
        <div className="mt-2 pt-1 border-t border-[#1E293B] text-[9px] text-[#00E5FF]/70 text-center">
          Click to inspect full telemetry
        </div>
      </div>
    );
  }

  if (hovered.type === 'cell') {
    const { row, col, mapId, cellData } = hovered;

    return (
      <div
        className="absolute pointer-events-none z-30 bg-[#0E131F]/95 backdrop-blur-sm border border-amber-500/30 rounded-lg p-2.5 text-xs font-mono shadow-2xl shadow-black/80"
        style={{ left, top, width: tooltipWidth }}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1E293B]">
          <span className="font-bold flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Sector [{row}, {col}]
          </span>
          <span className="text-[10px] text-slate-400 font-sans">{mapId}</span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Layer:</span>
            <span className="text-[#F8FAFC] truncate max-w-[130px] font-sans">
              {cellData.activeLayerName}
            </span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Raw Count:</span>
            <span className="text-amber-300 font-bold">
              {cellData.total.toLocaleString()} pings
            </span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Normalized Heat:</span>
            <span className="text-cyan-400">
              {(cellData.normalizedIntensity * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="mt-2 pt-1 border-t border-[#1E293B] text-[9px] text-amber-400/80 text-center font-sans">
          Click cell to open Sector Details
        </div>
      </div>
    );
  }

  return null;
};
