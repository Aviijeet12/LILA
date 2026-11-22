import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, HotspotSummary } from '../types/analyst';
import {
  getSectorZoneName,
  formatSectorBoundsText,
  parseHumanReadableConclusion,
} from '../utils/analystPresenter';
import {
  Bot,
  User,
  Compass,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  MapPin,
  TrendingUp,
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
      <div className="flex items-start justify-end gap-3 text-xs font-mono my-4 animate-message-enter">
        <div className="max-w-[80%] bg-[#1E293B]/80 backdrop-blur-md border border-white/10 rounded-2xl rounded-tr-sm px-5 py-3.5 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <p className="leading-relaxed whitespace-pre-wrap text-sm font-sans">{message.text}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/50 flex items-center justify-center text-[#00E5FF] flex-shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
          <User size={18} />
        </div>
      </div>
    );
  }

  // Analyst Response
  const result = message.result;

  if (!result) {
    return (
      <div className="flex items-start gap-3 text-xs font-mono my-4 animate-message-enter">
        <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Bot size={18} />
        </div>
        <div className="glass-panel rounded-2xl rounded-tl-sm p-5 text-slate-200">
          <p className="leading-relaxed">{message.text || 'No response data available.'}</p>
        </div>
      </div>
    );
  }

  const isUnsupported = result.intent === 'unsupported';
  const parsed = parseHumanReadableConclusion(result.conclusion);

  return (
    <div className="flex items-start gap-3.5 text-xs font-mono my-5 animate-message-enter">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
        <Bot size={18} />
      </div>

      <div className="flex-1 max-w-[96%] glass-panel rounded-2xl rounded-tl-sm p-6 space-y-5 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {/* Header: Title and Intent Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles size={15} className="text-cyan-400" />
              <span>{result.title}</span>
            </h3>
            {result.mapId && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] text-[#00E5FF] font-semibold tracking-wide">
                {result.mapId}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">
              {result.intent.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-900/40 px-2.5 py-1 rounded-md border border-white/5 font-sans">
            {result.dataScope}
          </span>
        </div>

        {/* Human-Readable Executive Summary */}
        <div
          className={`p-4 rounded-xl border leading-relaxed ${
            isUnsupported
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
              : 'bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-blue-950/30 border-cyan-500/30 text-slate-100 shadow-sm'
          }`}
        >
          {isUnsupported ? (
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 font-sans text-sm">
                <p className="font-semibold text-amber-300">Out of Scope Telemetry Query</p>
                <p className="text-amber-200/90 leading-relaxed text-xs">{result.conclusion}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 font-sans">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="font-medium text-slate-100 text-sm leading-snug tracking-tight">
                  {parsed.headline}
                </p>
              </div>

              {parsed.bulletPoints.length > 0 && (
                <div className="pl-7 space-y-1.5 pt-1 border-t border-cyan-500/20">
                  {parsed.bulletPoints.map((bp, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span className="leading-relaxed">{bp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Optional AI Narrative Commentary */}
        {result.llmCommentary && (
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/25 text-cyan-200 text-xs leading-relaxed space-y-1.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
              <Bot size={14} />
              <span>AI Analytical Synthesis</span>
            </div>
            <p className="font-sans leading-relaxed text-slate-200">{result.llmCommentary}</p>
          </div>
        )}

        {/* Supporting Telemetry Metrics Cards */}
        {result.metrics && result.metrics.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2.5 flex items-center gap-1.5 font-mono">
              <TrendingUp size={13} className="text-cyan-400" />
              <span>Key Grounded Metrics</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="glass-card p-3.5 rounded-xl flex flex-col justify-between group"
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">
                    {m.label}
                  </span>
                  <div className="text-lg font-bold text-slate-100 mt-1 font-mono flex items-baseline gap-1.5">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-cyan-200">
                      {m.value}
                    </span>
                    {m.unit && <span className="text-xs font-normal text-slate-400">{m.unit}</span>}
                  </div>
                  {m.denominator && (
                    <span className="text-[10px] text-slate-500 mt-1 font-sans">
                      Base: {m.denominator}
                    </span>
                  )}
                  {m.note && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-cyan-300 font-sans bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                      <span>{m.note}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotspot Sectors Table / Cards */}
        {result.hotspots && result.hotspots.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5 font-mono">
                <MapPin size={13} className="text-cyan-400" />
                <span>Top Ground-Truth Activity Sectors</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-sans">64×64 Uniform Grid</span>
            </div>
            <div className="space-y-2">
              {result.hotspots.map((h: HotspotSummary) => {
                const zoneName = getSectorZoneName(h.row, h.col);
                const boundsText = formatSectorBoundsText(h.worldBounds);
                return (
                  <div
                    key={h.rank}
                    className="glass-card p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                        #{h.rank}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 font-mono text-xs">
                            Sector [R{h.row}, C{h.col}]
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium font-sans">
                            {zoneName}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                            {h.count.toLocaleString()} samples ({h.percentOfTotal}%)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {boundsText}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {/* Visual Density Bar */}
                      <div className="hidden md:flex flex-col items-end gap-1 w-24">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(12, h.percentOfTotal * 3))}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">{h.percentOfTotal}% share</span>
                      </div>

                      {result.mapId && (
                        <button
                          onClick={() => navigate(`/map-explorer?map=${result.mapId}&heatmap=1&cell=${h.row},${h.col}`)}
                          className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 flex items-center gap-1.5 transition-all text-xs font-sans font-medium shadow-sm"
                        >
                          <Compass size={12} className="text-cyan-400" />
                          <span>Focus Map</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spatial Deep-Link Action Button */}
        {result.deepLink && (
          <div className="pt-2">
            <button
              onClick={() => navigate(result.deepLink!.url)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600/30 via-blue-600/20 to-cyan-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 border border-cyan-500/50 text-[#00E5FF] font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_20px_rgba(0,229,255,0.15)] group"
            >
              <Compass size={16} className="text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
              <span className="font-mono tracking-wide">{result.deepLink.label}</span>
              <ExternalLink size={13} className="ml-1 opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        )}

        {/* Collapsible Methodology Disclosure */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 py-1 font-mono transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Info size={12} className="text-cyan-400" />
              <span>Calculation Methodology & Formula</span>
            </span>
            {showMethodology ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showMethodology && (
            <div className="mt-2 p-3 bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/5 text-[11px] text-slate-300 font-sans leading-relaxed">
              {result.methodology}
            </div>
          )}
        </div>

        {/* Collapsible Limitations Disclosure */}
        <div>
          <button
            onClick={() => setShowLimitations(!showLimitations)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 py-1 font-mono transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-400" />
              <span>Telemetry Semantic Boundaries & Limitations ({result.limitations.length})</span>
            </span>
            {showLimitations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showLimitations && (
            <div className="mt-2 p-3 bg-amber-950/15 backdrop-blur-md rounded-lg border border-amber-500/20 text-[11px] text-amber-200/90 font-sans space-y-1.5 leading-relaxed">
              {result.limitations.map((lim, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{lim}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contextual Follow-Up Suggestions */}
        {result.followUpQuestions && result.followUpQuestions.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2 font-mono">
              Suggested Follow-Up Inquiries
            </span>
            <div className="flex flex-wrap gap-2">
              {result.followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectFollowUp(q)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/50 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs text-left transition-all font-sans"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
