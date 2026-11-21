import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, HotspotSummary } from '../types/analyst';
import {
  Bot,
  User,
  Compass,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  CheckCircle,
  Hash,
} from 'lucide-react';

interface MessageItemProps {
  message: ChatMessage;
  onSelectFollowUp: (question: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onSelectFollowUp }) => {
  const navigate = useNavigate();
  const [showMethodology, setShowMethodology] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  // User Message
  if (message.sender === 'user') {
    return (
      <div className="flex items-start justify-end gap-3 text-xs font-mono my-3">
        <div className="max-w-[80%] bg-[#1E293B] border border-[#334155] rounded-2xl rounded-tr-sm px-4 py-3 text-slate-100 shadow-md">
          <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] flex-shrink-0">
          <User size={16} />
        </div>
      </div>
    );
  }

  // Analyst Response
  const result = message.result;

  if (!result) {
    return (
      <div className="flex items-start gap-3 text-xs font-mono my-3">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
          <Bot size={16} />
        </div>
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-2xl rounded-tl-sm p-4 text-slate-200">
          <p className="leading-relaxed">{message.text || 'No response data available.'}</p>
        </div>
      </div>
    );
  }

  const isUnsupported = result.intent === 'unsupported';

  return (
    <div className="flex items-start gap-3 text-xs font-mono my-4">
      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1">
        <Bot size={16} />
      </div>

      <div className="flex-1 max-w-[95%] bg-[#0E131F] border border-[#1E293B] rounded-2xl rounded-tl-sm p-5 space-y-4 shadow-lg">
        {/* Header: Title and Intent Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              {result.title}
            </h3>
            {result.mapId && (
              <span className="px-2 py-0.5 rounded bg-[#151D2E] border border-[#1E293B] text-[10px] text-[#00E5FF] font-semibold">
                {result.mapId}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold uppercase">
              {result.intent.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{result.dataScope}</span>
        </div>

        {/* Conclusion / Direct Executive Summary */}
        <div className={`p-3.5 rounded-xl border leading-relaxed text-sm ${
          isUnsupported
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-[#151D2E]/80 border-[#1E293B] text-slate-100'
        }`}>
          {isUnsupported ? (
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p>{result.conclusion}</p>
            </div>
          ) : (
            <p>{result.conclusion}</p>
          )}
        </div>

        {/* Optional AI Narrative Synthesis */}
        {result.llmCommentary && (
          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-200 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <Bot size={13} />
              <span>AI Analytical Commentary</span>
            </div>
            <p>{result.llmCommentary}</p>
          </div>
        )}

        {/* Supporting Metrics Cards */}
        {result.metrics && result.metrics.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold mb-2">
              Supporting Telemetry Metrics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {result.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-[#151D2E] border border-[#1E293B] p-3 rounded-lg flex flex-col justify-between"
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {m.label}
                  </span>
                  <div className="text-base font-bold text-slate-100 mt-1">
                    {m.value}
                    {m.unit && <span className="text-xs font-normal text-slate-400 ml-1">{m.unit}</span>}
                  </div>
                  {m.denominator && (
                    <span className="text-[10px] text-slate-500 mt-1">
                      Denominator: {m.denominator}
                    </span>
                  )}
                  {m.note && (
                    <span className="text-[10px] text-[#00E5FF] mt-0.5 font-medium">
                      {m.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotspot Sectors Table / Cards */}
        {result.hotspots && result.hotspots.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold mb-2 flex items-center justify-between">
              <span>Top Ground-Truth Sectors (64×64 Grid)</span>
              <span className="text-slate-500 lowercase font-normal">coordinates in meters</span>
            </h4>
            <div className="space-y-1.5">
              {result.hotspots.map((h: HotspotSummary) => (
                <div
                  key={h.rank}
                  className="bg-[#151D2E]/60 border border-[#1E293B] px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1E293B] text-slate-300 font-bold text-[10px] flex items-center justify-center">
                      #{h.rank}
                    </span>
                    <span className="font-bold text-slate-200">
                      Sector [R{h.row}, C{h.col}]
                    </span>
                    <span className="text-[10px] text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded">
                      {h.count.toLocaleString()} pings ({h.percentOfTotal}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>
                      World: [X: {h.worldBounds.xMin}, {h.worldBounds.xMax}] × [Z: {h.worldBounds.zMin}, {h.worldBounds.zMax}]
                    </span>
                    <span>
                      UV: [{h.uvBounds.uMin.toFixed(2)}, {h.uvBounds.uMax.toFixed(2)}] × [{h.uvBounds.vMin.toFixed(2)}, {h.uvBounds.vMax.toFixed(2)}]
                    </span>
                    {result.mapId && (
                      <button
                        onClick={() => navigate(`/map-explorer?map=${result.mapId}&heatmap=1&cell=${h.row},${h.col}`)}
                        className="px-2 py-1 rounded bg-[#1E293B] hover:bg-[#00E5FF]/20 text-slate-300 hover:text-[#00E5FF] flex items-center gap-1 transition-colors"
                      >
                        <Compass size={11} />
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spatial Deep-Link Action Button */}
        {result.deepLink && (
          <div className="pt-2">
            <button
              onClick={() => navigate(result.deepLink!.url)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/40 text-[#00E5FF] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Compass size={14} />
              <span>{result.deepLink.label}</span>
              <ExternalLink size={12} className="ml-1" />
            </button>
          </div>
        )}

        {/* Collapsible Methodology Disclosure */}
        <div className="pt-1 border-t border-[#1E293B]">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="flex items-center justify-between w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Info size={13} className="text-[#00E5FF]" />
              <span className="font-semibold">Calculation Methodology & Formulas</span>
            </div>
            {showMethodology ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showMethodology && (
            <div className="p-3 bg-[#151D2E]/60 rounded-lg text-slate-300 text-[11px] leading-relaxed border border-[#1E293B] mt-1">
              <p>{result.methodology}</p>
            </div>
          )}
        </div>

        {/* Collapsible Data Scope & Limitations */}
        <div>
          <button
            onClick={() => setShowLimitations(!showLimitations)}
            className="flex items-center justify-between w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="font-semibold">Telemetry Semantic Boundaries & Dataset Limitations</span>
            </div>
            {showLimitations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showLimitations && (
            <ul className="p-3 bg-[#151D2E]/60 rounded-lg text-slate-300 text-[11px] leading-relaxed border border-[#1E293B] mt-1 space-y-1 list-disc list-inside">
              {result.limitations.map((lim, idx) => (
                <li key={idx} className="text-slate-400">
                  <span className="text-slate-300">{lim}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Follow-up Suggestions Chips */}
        {result.followUpQuestions && result.followUpQuestions.length > 0 && (
          <div className="pt-2 border-t border-[#1E293B]">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold block mb-2">
              Recommended Follow-Up Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {result.followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectFollowUp(q)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#151D2E] border border-[#1E293B] text-slate-300 hover:text-[#00E5FF] hover:border-[#00E5FF]/40 text-[11px] text-left transition-colors flex items-center gap-1.5"
                >
                  <Hash size={11} className="text-[#00E5FF]" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
