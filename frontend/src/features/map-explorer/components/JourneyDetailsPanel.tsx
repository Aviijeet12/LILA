import React from 'react';
import { X, User, Bot, Route, Compass, Clock, Award, Activity, AlertCircle } from 'lucide-react';
import { Journey } from '../../../types/telemetry';
import { EVENT_STYLES } from '../utils/canvasRenderer';

interface JourneyDetailsPanelProps {
  journey: Journey | null;
  onClose: () => void;
}

export const JourneyDetailsPanel: React.FC<JourneyDetailsPanelProps> = ({
  journey,
  onClose,
}) => {
  if (!journey) return null;

  const isHuman = journey.entity_type === 'human';
  const mins = Math.floor(journey.duration_seconds / 60);
  const secs = journey.duration_seconds % 60;
  const durationFormatted = `${mins}m ${secs}s`;

  return (
    <div className="absolute top-3 left-3 z-20 w-80 bg-[#0E131F]/95 backdrop-blur-md border border-[#1E293B] rounded-xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[calc(100%-24px)]">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#151D2E]/60">
        <div className="flex items-center gap-2">
          {isHuman ? (
            <div className="w-6 h-6 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
              <User size={13} />
            </div>
          ) : (
            <div className="w-6 h-6 rounded bg-[#C084FC]/10 border border-[#C084FC]/40 flex items-center justify-center text-[#C084FC]">
              <Bot size={13} />
            </div>
          )}
          <div>
            <div className="font-bold text-sm text-[#F8FAFC] tracking-wide">
              {isHuman ? 'Human Player' : 'Bot Entity'}
            </div>
            <div className="text-[10px] text-[#64748B] truncate max-w-[170px]" title={journey.user_id}>
              {journey.user_id}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
          title="Deselect Journey"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1">
        {/* Outcome Card */}
        <div className={`p-2.5 rounded-lg border ${journey.outcome === 'ELIMINATED' ? 'bg-[#EF4444]/10 border-[#EF4444]/30' : 'bg-[#10B981]/10 border-[#10B981]/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
              <Award size={11} /> Outcome
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${journey.outcome === 'ELIMINATED' ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
              {journey.outcome}
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            Terminal Event: <span className="font-semibold text-[#F8FAFC]">{journey.terminal_event}</span>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-[#151D2E]/80 border border-[#1E293B] rounded-lg p-2">
            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mb-0.5">
              <Route size={10} className="text-[#00E5FF]" /> Distance
            </div>
            <div className="font-bold text-[#F8FAFC]">
              {Math.round(journey.distance_travelled_meters).toLocaleString()} m
            </div>
          </div>

          <div className="bg-[#151D2E]/80 border border-[#1E293B] rounded-lg p-2">
            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mb-0.5">
              <Clock size={10} className="text-[#10B981]" /> Duration
            </div>
            <div className="font-bold text-[#F8FAFC]">
              {durationFormatted}
            </div>
          </div>

          <div className="bg-[#151D2E]/80 border border-[#1E293B] rounded-lg p-2">
            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mb-0.5">
              <Activity size={10} className="text-[#F59E0B]" /> Waypoints
            </div>
            <div className="font-bold text-[#F8FAFC]">
              {journey.positions_count} pts
            </div>
          </div>

          <div className="bg-[#151D2E]/80 border border-[#1E293B] rounded-lg p-2">
            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mb-0.5">
              <Compass size={10} className="text-[#C084FC]" /> Map
            </div>
            <div className="font-bold text-[#F8FAFC] truncate">
              {journey.map_id}
            </div>
          </div>
        </div>

        {/* Timestamps & Session */}
        <div className="bg-[#151D2E]/40 border border-[#1E293B] rounded-lg p-2.5 space-y-1.5 text-[11px]">
          <div className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1">Session Data</div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Match:</span>
            <span className="text-[#F8FAFC] truncate max-w-[150px]" title={journey.match_id}>
              {journey.match_id}
            </span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Date:</span>
            <span className="text-[#F8FAFC]">{journey.date}</span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">Start TS:</span>
            <span className="text-[#F8FAFC]">{journey.start_ts}</span>
          </div>
          <div className="flex justify-between text-[#94A3B8]">
            <span className="text-[#64748B]">End TS:</span>
            <span className="text-[#F8FAFC]">{journey.end_ts}</span>
          </div>
        </div>

        {/* Event Breakdown */}
        {journey.event_counts && Object.keys(journey.event_counts).length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1.5">Recorded Events</div>
            <div className="space-y-1">
              {Object.entries(journey.event_counts).map(([evName, count]) => {
                const style = EVENT_STYLES[evName] ?? { label: evName, color: '#94A3B8' };
                return (
                  <div key={evName} className="flex items-center justify-between px-2 py-1 rounded bg-[#151D2E]/40 border border-[#1E293B] text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: style.color }} />
                      <span className="text-[#94A3B8]">{style.label}</span>
                    </span>
                    <span className="font-bold text-[#F8FAFC]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deselect Button */}
        <button
          onClick={onClose}
          className="w-full py-1.5 rounded-lg border border-[#1E293B] hover:border-[#334155] bg-[#151D2E] hover:bg-[#1E293B] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          Deselect Journey
        </button>
      </div>
    </div>
  );
};
