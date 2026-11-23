import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DiscreteEvent } from '../../../types/telemetry';
import {
  TimelineRange,
  formatDuration,
  formatTimestampUTC,
  timestampToProgress,
} from '../utils/timelineMath';
import { EVENT_STYLES } from '../utils/canvasRenderer';

interface TimelineControlsProps {
  range: TimelineRange;
  currentTs: number;
  isPlaying: boolean;
  speed: number;
  isCompleted: boolean;
  events?: DiscreteEvent[];
  isTimelineActive?: boolean;
  onShowFullOverview?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSeek: (ts: number) => void;
  onSeekProgress: (progress: number) => void;
  onSetSpeed: (speed: number) => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  range,
  currentTs,
  isPlaying,
  speed,
  isCompleted,
  events = [],
  isTimelineActive = false,
  onShowFullOverview,
  onPlay,
  onPause,
  onRestart,
  onSeek,
  onSeekProgress,
  onSetSpeed,
}) => {
  const { minTs, maxTs, durationSeconds } = range;
  const [hoveredEvent, setHoveredEvent] = useState<{ ev: DiscreteEvent; x: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const elapsedSeconds = Math.max(0, currentTs - minTs);
  const progressPercent = timestampToProgress(currentTs, minTs, maxTs);

  const speeds = [0.5, 1, 2, 4];

  // Scrubber drag / click handling
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || maxTs <= minTs) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeekProgress(ratio * 100);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const moveX = moveEvent.clientX - rect.left;
      const moveRatio = Math.max(0, Math.min(1, moveX / rect.width));
      onSeekProgress(moveRatio * 100);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="bg-[#090909]/95 backdrop-blur-md border border-[#292929] rounded-xl p-3 font-mono text-xs select-none shadow-xl">
      {/* Top row: controls, time displays, speed buttons */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        {/* Play / Pause & Restart & Mode indicator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={clsx(
              'p-2 rounded-lg font-bold flex items-center justify-center transition-colors',
              isPlaying
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 hover:bg-[#F59E0B]/30'
                : 'bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/40 hover:bg-[#00D9F5]/30'
            )}
            title={isPlaying ? 'Pause Playback' : 'Play Timeline'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          <button
            onClick={onRestart}
            className="p-2 rounded-lg text-[#94A3B8] border border-[#292929] hover:text-[#F8FAFC] hover:bg-[#111111] transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw size={13} />
          </button>

          {/* Time Readout */}
          <div className="flex items-center gap-2 pl-1 text-[11px]">
            <span className="text-[#F8FAFC] font-bold text-sm min-w-[42px]">
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#64748B] min-w-[42px]">
              {formatDuration(durationSeconds)}
            </span>
          </div>

          {/* Full Match / Timeline Mode Toggle Badge */}
          {onShowFullOverview && (
            <button
              onClick={onShowFullOverview}
              className={clsx(
                'ml-1 px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all border flex items-center gap-1.5',
                !isTimelineActive && !isPlaying
                  ? 'bg-[#00D9F5]/15 text-[#00D9F5] border-[#00D9F5]/40 shadow-[0_0_10px_rgba(0,217,245,0.15)]'
                  : 'bg-[#111111] text-[#94A3B8] border-[#292929] hover:text-[#F8FAFC] hover:border-[#334155]'
              )}
              title={
                !isTimelineActive && !isPlaying
                  ? 'Currently showing all trajectories & events. Click to replay from start.'
                  : 'Click to showcase all match trajectories & events at once.'
              }
            >
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  !isTimelineActive && !isPlaying ? 'bg-[#00D9F5] animate-pulse' : 'bg-[#64748B]'
                )}
              />
              {!isTimelineActive && !isPlaying ? 'Full Match Overview' : 'Show All Trajectories'}
            </button>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <span className="ml-1 px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} /> Replay Complete
            </span>
          )}
        </div>

        {/* Center / Right: UTC Timestamps and Speed Selector */}
        <div className="flex items-center gap-3">
          {/* UTC Timestamp */}
          <div className="text-[10px] text-[#64748B] hidden sm:flex items-center gap-1.5">
            <Clock size={11} className="text-[#00D9F5]" />
            <span>{formatTimestampUTC(currentTs)}</span>
          </div>

          {/* Progress Percent */}
          <div className="text-[10px] text-[#94A3B8] min-w-[36px] text-right">
            {Math.round(progressPercent)}%
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 bg-[#111111] border border-[#292929] rounded-lg p-0.5">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors',
                  speed === s
                    ? 'bg-[#00D9F5] text-[#050505]'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#292929]'
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber Track Bar with Event Ticks */}
      <div className="relative pt-1 pb-1">
        {/* Hover Tooltip for Event Ticks */}
        {hoveredEvent && (
          <div
            className="absolute -top-11 z-30 pointer-events-none bg-[#090909]/95 backdrop-blur-sm border border-[#292929] rounded px-2 py-1 text-[10px] font-mono shadow-xl text-[#F8FAFC] -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${hoveredEvent.x}%` }}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: EVENT_STYLES[hoveredEvent.ev.event]?.color ?? '#00E5FF' }}
              />
              <span>{hoveredEvent.ev.event}</span>
              <span className="text-[#64748B] font-normal">
                +{formatDuration(hoveredEvent.ev.ts - minTs)}
              </span>
            </div>
            {hoveredEvent.ev.user_id && (
              <div className="text-[9px] text-[#94A3B8] truncate max-w-[150px]">
                {hoveredEvent.ev.user_id}
              </div>
            )}
          </div>
        )}

        <div
          ref={trackRef}
          onMouseDown={handleTrackMouseDown}
          className="relative h-2 bg-[#111111] border border-[#292929] rounded-full cursor-pointer overflow-hidden group"
        >
          {/* Elapsed Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full bg-[#00E5FF] rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Event Ticks */}
          {durationSeconds > 0 &&
            events.slice(0, 150).map((ev, idx) => {
              const tickOffset = ev.ts - minTs;
              if (tickOffset < 0 || tickOffset > durationSeconds) return null;
              const leftPercent = (tickOffset / durationSeconds) * 100;
              const color = EVENT_STYLES[ev.event]?.color ?? '#F8FAFC';

              return (
                <div
                  key={`${ev.event}-${ev.ts}-${idx}`}
                  onMouseEnter={() => setHoveredEvent({ ev, x: leftPercent })}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(ev.ts);
                  }}
                  className="absolute top-0 bottom-0 w-1 cursor-pointer z-10 transition-transform hover:scale-y-125"
                  style={{
                    left: `${leftPercent}%`,
                    backgroundColor: color,
                    opacity: ev.ts <= currentTs ? 1.0 : 0.45,
                  }}
                  title={`${ev.event} (+${formatDuration(tickOffset)})`}
                />
              );
            })}
        </div>

        {/* Scrubber thumb handle indicator */}
        <div
          className="absolute top-1/2 w-3.5 h-3.5 bg-[#FFFFFF] border-2 border-[#00E5FF] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-md transition-all duration-75"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Bottom Range Markers */}
      <div className="flex justify-between items-center text-[9px] text-[#475569] mt-1">
        <span>00:00 (Start)</span>
        <span>{formatDuration(durationSeconds / 2)}</span>
        <span>{formatDuration(durationSeconds)} (End)</span>
      </div>
    </div>
  );
};
