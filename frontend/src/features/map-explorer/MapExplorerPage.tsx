import React, { useEffect, useState } from 'react';

import {
  Map,
  Users,
  Bot,
  Layers,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  Crosshair,
  Route,
  Eye,
  EyeOff,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { clsx } from 'clsx';
import { dataService } from '../../services/dataService';
import { useAppStore } from '../../stores/appStore';
import type { MapId, Journey, MapMetadata, MatchSummary, MapHeatmaps } from '../../types/telemetry';
import { HeatmapControls } from './components/HeatmapControls';
import { SpatialCellDetailsPanel } from './components/SpatialCellDetailsPanel';
import { SpatialAnalyticsModal } from './components/SpatialAnalyticsModal';
import { HeatmapConfig, DEFAULT_HEATMAP_CONFIG, HeatmapLayerKey } from './utils/heatmapRenderer';
import { MapCanvas } from './components/MapCanvas';
import { JourneyDetailsPanel } from './components/JourneyDetailsPanel';
import { TimelineControls } from './components/TimelineControls';
import { useTimelinePlayback } from './hooks/useTimelinePlayback';
import { computeTimelineRange } from './utils/timelineMath';
import { EVENT_STYLES } from './utils/canvasRenderer';
import { useMemo } from 'react';

const MAPS: { id: MapId; label: string }[] = [
  { id: 'AmbroseValley', label: 'Ambrose Valley' },
  { id: 'GrandRift',     label: 'Grand Rift'     },
  { id: 'Lockdown',      label: 'Lockdown'        },
];

const LAYER_CONFIGS = [
  { key: 'human_trajectories' as const, label: 'Human Paths',        color: '#00E5FF' },
  { key: 'bot_trajectories'   as const, label: 'Bot Paths',          color: '#A855F7' },
  { key: 'loot'               as const, label: 'Loot Events',        color: EVENT_STYLES.Loot.color },
  { key: 'bot_kill'           as const, label: 'BotKill Events',     color: EVENT_STYLES.BotKill.color },
  { key: 'bot_killed'         as const, label: 'BotKilled Events',   color: EVENT_STYLES.BotKilled.color },
  { key: 'killed_by_storm'    as const, label: 'Storm Death Events', color: EVENT_STYLES.KilledByStorm.color },
  { key: 'kill'               as const, label: 'Kill Events',        color: EVENT_STYLES.Kill.color },
  { key: 'killed'             as const, label: 'Killed Events',      color: EVENT_STYLES.Killed.color },
];

export const MapExplorerPage: React.FC = () => {
  const {
    selectedMap, setSelectedMap,
    selectedDate, setSelectedDate,
    selectedMatchId, setSelectedMatchId,
    selectedJourneyId, setSelectedJourneyId,
    entityFilter, setEntityFilter,
    activeLayers, setActiveLayer, setAllLayers,
    resetFilters,
  } = useAppStore();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [metadata, setMetadata] = useState<MapMetadata | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [heatmaps, setHeatmaps] = useState<MapHeatmaps | null>(null);
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>(DEFAULT_HEATMAP_CONFIG);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');



  // If search param has select=first and journeys loaded, auto-select first journey
  useEffect(() => {
    const qSelect = searchParams.get('select');
    if (qSelect && journeys.length > 0 && !selectedJourneyId) {
      if (qSelect === 'first') {
        setSelectedJourneyId(journeys[0].journey_id);
      } else {
        const found = journeys.find((j) => j.journey_id.includes(qSelect) || j.user_id.includes(qSelect));
        if (found) setSelectedJourneyId(found.journey_id);
      }
    }

    const qHeatmap = searchParams.get('heatmap');
    if (qHeatmap === 'true' || qHeatmap === '1') {
      setHeatmapConfig((prev) => ({ ...prev, enabled: true }));
    }
    const qHLayer = searchParams.get('hlayer') as HeatmapLayerKey | null;
    if (qHLayer) {
      setHeatmapConfig((prev) => ({
        ...prev,
        enabled: true,
        activeLayers: {
          human_traffic:   qHLayer === 'human_traffic',
          bot_traffic:     qHLayer === 'bot_traffic',
          loot:            qHLayer === 'loot',
          bot_kill:        qHLayer === 'bot_kill',
          bot_killed:      qHLayer === 'bot_killed',
          killed_by_storm: qHLayer === 'killed_by_storm',
        },
      }));
    }
    const qCell = searchParams.get('cell');
    if (qCell) {
      const [r, cl] = qCell.split(',').map(Number);
      if (!isNaN(r) && !isNaN(cl)) {
        setSelectedCell({ row: r, col: cl });
      }
    }
    const qAnalytics = searchParams.get('analytics');
    if (qAnalytics === 'true' || qAnalytics === '1') {
      setShowAnalyticsModal(true);
    }
  }, [journeys, selectedJourneyId, setSelectedJourneyId]);
  const [error, setError] = useState<string | null>(null);

  const mapId = selectedMap ?? 'AmbroseValley';

  // Load map data on mapId change
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedMatchId(null);
    setSelectedJourneyId(null);

    Promise.all([
      dataService.getMapJourneys(mapId),
      dataService.getMapMetadata(mapId),
      dataService.getMatches(),
      dataService.getMapHeatmaps(mapId),
    ])
      .then(([j, m, allMatches, hm]) => {
        setJourneys(j);
        setMetadata(m);
        setMatches(allMatches.filter((mx) => mx.map_id === mapId));
        setHeatmaps(hm);
      })
      .catch((e) => setError(e.message ?? 'Load failed'))
      .finally(() => setLoading(false));
  }, [mapId, setSelectedMatchId, setSelectedJourneyId]);

  // Available dates
  const availableDates = [...new Set(matches.map((m) => m.date))].sort();

  // Filtered matches
  const filteredMatches = selectedDate
    ? matches.filter((m) => m.date === selectedDate)
    : matches;

  // Find active selected match object
  const selectedMatch = selectedMatchId
    ? matches.find((m) => m.match_id === selectedMatchId) ?? null
    : null;

  // Filtered journeys list based on entity and match filters
  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      if (entityFilter === 'human' && j.entity_type !== 'human') return false;
      if (entityFilter === 'bot' && j.entity_type !== 'bot') return false;
      if (selectedMatchId && j.match_id !== selectedMatchId) return false;
      return true;
    });
  }, [journeys, entityFilter, selectedMatchId]);

  // Compute active temporal boundaries
  const timelineRange = useMemo(() => {
    return computeTimelineRange(filteredJourneys, selectedMatch);
  }, [filteredJourneys, selectedMatch]);

  // Playback controller hook
  const playback = useTimelinePlayback(timelineRange, 1);

  // Sync timeline URL search parameters for headless validation & automated screenshots
  useEffect(() => {
    const qSeek = searchParams.get('seek');
    if (qSeek && timelineRange.durationSeconds > 0) {
      playback.seekProgress(parseFloat(qSeek));
    }
    const qSpeed = searchParams.get('speed');
    if (qSpeed) {
      playback.setSpeed(parseFloat(qSpeed));
    }
    const qPlay = searchParams.get('play');
    if (qPlay === 'true') {
      playback.play();
    }
  }, [timelineRange, searchParams]);

  // Collect discrete events for timeline track ticks
  const timelineEvents = useMemo(() => {
    const evs: any[] = [];
    for (const j of filteredJourneys) {
      for (const ev of j.events ?? []) {
        evs.push(ev);
      }
    }
    return evs.sort((a, b) => a.ts - b.ts);
  }, [filteredJourneys]);

  // Selected journey object
  const selectedJourney = selectedJourneyId
    ? journeys.find((j) => j.journey_id === selectedJourneyId) ?? null
    : null;

  const visibleJourneyCount = filteredJourneys.length;

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 'calc(100vh - 112px)' }}>
      {/* Sidebar Controls */}
      <aside className="w-64 flex-shrink-0 flex flex-col gap-3">
        {/* Map Selector */}
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Map size={11} /> Active Map</span>
            {metadata && (
              <span className="text-[9px] text-[#334155]">{metadata.total_journeys} total</span>
            )}
          </div>
          <div className="space-y-1">
            {MAPS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMap(m.id)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors flex items-center justify-between',
                  mapId === m.id
                    ? 'bg-[#151D2E] text-[#00E5FF] font-semibold border-l-2 border-[#00E5FF]'
                    : 'text-[#94A3B8] hover:bg-[#151D2E]/60 border-l-2 border-transparent'
                )}
              >
                <span>{m.label}</span>
                {mapId === m.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Filter */}
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center gap-1.5">
            <Users size={11} /> Entity Type
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['all', 'human', 'bot'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setEntityFilter(f)}
                className={clsx(
                  'py-1.5 rounded text-[10px] font-mono uppercase transition-colors text-center font-medium',
                  entityFilter === f
                    ? 'bg-[#151D2E] text-[#00E5FF] border border-[#00E5FF]/40'
                    : 'text-[#64748B] border border-[#1E293B] hover:text-[#94A3B8] hover:bg-[#151D2E]/40'
                )}
              >
                {f === 'all' ? 'All' : f === 'human' ? 'Human' : 'Bot'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Calendar size={11} /> Date</span>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[9px] text-[#00E5FF] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              className="w-full bg-[#151D2E] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs font-mono text-[#F8FAFC] appearance-none cursor-pointer focus:outline-none focus:border-[#00E5FF]/60"
              value={selectedDate ?? ''}
              onChange={(e) => {
                setSelectedDate(e.target.value || null);
                setSelectedMatchId(null);
                setSelectedJourneyId(null);
              }}
            >
              <option value="">All dates ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-[#64748B] pointer-events-none" />
          </div>
        </div>

        {/* Match Selector */}
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-3 flex-1 overflow-hidden flex flex-col min-h-[140px]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Crosshair size={11} /> Matches</span>
            <span className="text-[#334155]">{filteredMatches.length}</span>
          </div>

          <div className="overflow-y-auto space-y-0.5 flex-1 pr-0.5 custom-scrollbar">
            <button
              onClick={() => { setSelectedMatchId(null); setSelectedJourneyId(null); }}
              className={clsx(
                'w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors',
                !selectedMatchId
                  ? 'bg-[#151D2E] text-[#00E5FF] font-semibold'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#151D2E]/40'
              )}
            >
              All matches ({filteredMatches.length})
            </button>
            {filteredMatches.slice(0, 80).map((m) => (
              <button
                key={m.match_id}
                onClick={() => {
                  setSelectedMatchId(m.match_id);
                  setSelectedJourneyId(null);
                }}
                className={clsx(
                  'w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors truncate flex items-center justify-between',
                  selectedMatchId === m.match_id
                    ? 'bg-[#151D2E] text-[#00E5FF] font-semibold'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#151D2E]/40'
                )}
                title={m.match_id}
              >
                <span>
                  <span className="text-[#334155]">{m.date.slice(5)} </span>
                  {m.match_id.slice(0, 8)}...
                </span>
                <span className="text-[#1E293B] text-[9px]">{m.total_participants}p</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layers & Event Toggles */}
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers size={11} /> Layer Toggles</span>
            <div className="flex gap-1.5 text-[9px]">
              <button
                onClick={() => setAllLayers(true)}
                className="text-[#64748B] hover:text-[#00E5FF]"
                title="Enable all layers"
              >
                All On
              </button>
              <span className="text-[#1E293B]">|</span>
              <button
                onClick={() => setAllLayers(false)}
                className="text-[#64748B] hover:text-[#00E5FF]"
                title="Disable all layers"
              >
                All Off
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {LAYER_CONFIGS.map(({ key, label, color }) => {
              const on = activeLayers[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveLayer(key, !on)}
                  className={clsx(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-mono transition-colors',
                    on ? 'text-[#F8FAFC] hover:bg-[#151D2E]' : 'text-[#475569] hover:bg-[#151D2E]/40'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: on ? color : '#1E293B' }}
                    />
                    <span>{label}</span>
                  </span>
                  {on ? (
                    <Eye size={11} style={{ color }} />
                  ) : (
                    <EyeOff size={11} className="text-[#334155]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Filters Action */}
        <button
          onClick={resetFilters}
          className="w-full py-2 px-3 rounded-lg border border-[#1E293B] hover:border-[#334155] bg-[#0E131F] hover:bg-[#151D2E] text-xs font-mono text-[#94A3B8] hover:text-[#00E5FF] flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw size={12} />
          Reset All Filters
        </button>
      </aside>

      {/* Main Canvas Viewport */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 h-full relative">
        {/* Status Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] px-1 py-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#94A3B8]">
              <Route size={12} className="text-[#00E5FF]" />
              {loading ? (
                <span className="animate-pulse">Loading journeys...</span>
              ) : (
                <span>
                  <strong className="text-[#F8FAFC]">{visibleJourneyCount.toLocaleString()}</strong> journeys visible
                </span>
              )}
            </span>

            {selectedMatchId && (
              <span className="text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/20 flex items-center gap-1">
                <span>Match:</span>
                <span className="text-[#F8FAFC] font-semibold">{selectedMatchId.slice(0, 8)}...</span>
                <button
                  onClick={() => setSelectedMatchId(null)}
                  className="ml-1 hover:text-[#EF4444]"
                >
                  x
                </button>
              </span>
            )}

            {selectedJourneyId && (
              <span className="text-[#C084FC] bg-[#C084FC]/10 px-2 py-0.5 rounded border border-[#C084FC]/20 flex items-center gap-1">
                <span>Journey:</span>
                <span className="text-[#F8FAFC] font-semibold">{selectedJourneyId.slice(0, 8)}...</span>
                <button
                  onClick={() => setSelectedJourneyId(null)}
                  className="ml-1 hover:text-[#EF4444]"
                >
                  x
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={11} />
            <span className="capitalize">{entityFilter} Entities</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-xs font-mono text-[#F43F5E] p-3 border border-[#F43F5E]/20 rounded bg-[#F43F5E]/5">
            Failed to load map data: {error}
          </div>
        )}

        {/* Map Canvas with Overlays */}
        <div className="flex-1 relative rounded-lg overflow-hidden border border-[#1E293B]">
          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080B11]/80 backdrop-blur-sm">
              <div className="text-xs font-mono text-[#00E5FF] flex items-center gap-2 animate-pulse">
                <Route size={14} className="animate-spin" />
                <span>Loading map telemetry...</span>
              </div>
            </div>
          )}

          <MapCanvas
            mapId={mapId}
            journeys={journeys}
            activeLayers={activeLayers}
            entityFilter={entityFilter}
            selectedMatchId={selectedMatchId}
            selectedJourneyId={selectedJourneyId}
            playbackTimestamp={playback.currentTs}
            onSelectJourney={setSelectedJourneyId}
            heatmaps={heatmaps}
            heatmapConfig={heatmapConfig}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
          />

          {/* Slide-over Telemetry Details Panel */}
          {selectedJourney && (
            <JourneyDetailsPanel
              journey={selectedJourney}
              onClose={() => setSelectedJourneyId(null)}
            />
          )}

          {/* Slide-over Spatial Cell Details Panel */}
          {selectedCell && !selectedJourney && (
            <div className="absolute top-4 right-4 z-30 w-80 max-w-[calc(100%-2rem)] animate-in fade-in slide-in-from-right-4 duration-150">
              <SpatialCellDetailsPanel
                mapId={mapId}
                cell={selectedCell}
                heatmaps={heatmaps}
                onClose={() => setSelectedCell(null)}
              />
            </div>
          )}
        </div>

        {/* Timeline Playback Controls */}
        <TimelineControls
          range={timelineRange}
          currentTs={playback.currentTs}
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          isCompleted={playback.isCompleted}
          events={timelineEvents}
          onPlay={playback.play}
          onPause={playback.pause}
          onRestart={playback.restart}
          onSeek={playback.seek}
          onSeekProgress={playback.seekProgress}
          onSetSpeed={playback.setSpeed}
        />
      </div>
      {/* Spatial Analytics Modal */}
      {showAnalyticsModal && (
        <SpatialAnalyticsModal
          mapId={mapId}
          heatmaps={heatmaps}
          onClose={() => setShowAnalyticsModal(false)}
          onSelectCell={(cell) => setSelectedCell(cell)}
        />
      )}
    </div>
  );
};
