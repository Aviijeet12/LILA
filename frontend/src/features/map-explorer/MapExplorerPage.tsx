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
  Search,
  Play,
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
import { computeTimelineRange, formatDuration } from './utils/timelineMath';
import { EVENT_STYLES } from './utils/canvasRenderer';
import { useMemo } from 'react';

const MAPS: { id: MapId; label: string }[] = [
  { id: 'AmbroseValley', label: 'Ambrose Valley' },
  { id: 'GrandRift',     label: 'Grand Rift'     },
  { id: 'Lockdown',      label: 'Lockdown'        },
];

const LAYER_CONFIGS = [
  { key: 'human_trajectories' as const, label: 'Human Paths',        color: '#00D9F5' },
  { key: 'bot_trajectories'   as const, label: 'Bot Paths',          color: '#F5A623' },
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
    setSelectedMatchAndDate,
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
  const initialUrlProcessedRef = React.useRef(false);

  const mapId = selectedMap ?? 'AmbroseValley';

  // Load map data on mapId change
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedJourneyId(null);

    if (!initialUrlProcessedRef.current) {
      initialUrlProcessedRef.current = true;
      const qMatch = searchParams.get('match');
      const qDate = searchParams.get('date');
      if (qMatch) {
        setSelectedMatchId(qMatch);
      }
      if (qDate) {
        setSelectedDate(qDate);
      }
    }

    Promise.all([
      dataService.getMapJourneys(mapId),
      dataService.getMapMetadata(mapId),
      dataService.getMatches(),
      dataService.getMapHeatmaps(mapId),
    ])
      .then(([j, m, allMatches, hm]) => {
        setJourneys(j);
        setMetadata(m);
        const mapMatches = allMatches.filter((mx) => mx.map_id === mapId);
        setMatches(mapMatches);
        setHeatmaps(hm);
      })
      .catch((e) => setError(e.message ?? 'Load failed'))
      .finally(() => setLoading(false));
  }, [mapId, setSelectedMatchId, setSelectedJourneyId, setSelectedDate]);

  // Available dates
  const availableDates = [...new Set(matches.map((m) => m.date))].sort();

  // Match search filter for sidebar
  const [matchSearch, setMatchSearch] = useState('');

  // Synchronized match selection
  const handleSelectMatch = (mId: string | null) => {
    setSelectedJourneyId(null);
    if (mId) {
      const targetMatch = matches.find((m) => m.match_id === mId);
      const matchDate = targetMatch?.date || selectedDate;
      setSelectedMatchAndDate(mId, matchDate);
    } else {
      setSelectedMatchId(null);
    }
  };

  // Synchronized date selection
  const handleSelectDate = (d: string | null) => {
    setSelectedDate(d);
    setSelectedJourneyId(null);
    if (selectedMatchId) {
      const curMatch = matches.find((m) => m.match_id === selectedMatchId);
      if (curMatch && d && curMatch.date !== d) {
        setSelectedMatchId(null);
      }
    }
  };

  // Filtered matches
  const filteredMatches = selectedDate
    ? matches.filter((m) => m.date === selectedDate)
    : matches;

  // Search filtered matches for sidebar
  const displayedMatches = useMemo(() => {
    if (!matchSearch.trim()) return filteredMatches;
    const q = matchSearch.toLowerCase();
    return filteredMatches.filter((m) => m.match_id.toLowerCase().includes(q));
  }, [filteredMatches, matchSearch]);

  // Find active selected match object
  const selectedMatch = selectedMatchId
    ? matches.find((m) => m.match_id === selectedMatchId) ?? null
    : null;

  // Filtered journeys list based on date, entity and match filters
  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      // When a specific match is selected, showcase all data for that particular match!
      if (selectedMatchId) {
        if (j.match_id !== selectedMatchId) return false;
        if (entityFilter === 'human' && j.entity_type !== 'human') return false;
        if (entityFilter === 'bot' && j.entity_type !== 'bot') return false;
        return true;
      }
      // When exploring by date, showcase all data for that particular date!
      if (selectedDate && j.date !== selectedDate) return false;
      if (entityFilter === 'human' && j.entity_type !== 'human') return false;
      if (entityFilter === 'bot' && j.entity_type !== 'bot') return false;
      return true;
    });
  }, [journeys, selectedDate, entityFilter, selectedMatchId]);

  // Track if user is actively playing or scrubbing the timeline.
  // Defaults to false so that every match/filter immediately showcases full data on the map!
  const [isTimelineActive, setIsTimelineActive] = useState(false);

  // When filters or match changes, reset timeline mode so full match data is visible immediately
  useEffect(() => {
    setIsTimelineActive(false);
    playback.pause();
  }, [selectedMatchId, selectedDate, entityFilter, mapId]);

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
      setIsTimelineActive(true);
      playback.seekProgress(parseFloat(qSeek));
    }
    const qSpeed = searchParams.get('speed');
    if (qSpeed) {
      playback.setSpeed(parseFloat(qSpeed));
    }
    const qPlay = searchParams.get('play');
    if (qPlay === 'true') {
      setIsTimelineActive(true);
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

  const handleMapChange = (newMapId: MapId) => {
    if (newMapId === mapId) return;
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setSelectedMap(newMapId);
    setMatchSearch('');
    setSelectedCell(null);
    setShowAnalyticsModal(false);
    setHeatmapConfig(DEFAULT_HEATMAP_CONFIG);
  };

  const visibleJourneyCount = filteredJourneys.length;

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full min-w-0">
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto max-h-full custom-scrollbar pr-1">
        {/* Map Selector */}
        <div className="bg-[#101925] border border-[#1E2B3E] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Map size={11} /> Active Map</span>
            {metadata && (
              <span className="text-[9px] text-[#64748B]">{metadata.total_journeys} total</span>
            )}
          </div>
          <div className="space-y-1">
            {MAPS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleMapChange(m.id)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors flex items-center justify-between',
                  mapId === m.id
                    ? 'bg-[#172435] text-[#00D9F5] font-semibold border-l-2 border-[#00D9F5]'
                    : 'text-[#94A3B8] hover:bg-[#172435]/60 border-l-2 border-transparent'
                )}
              >
                <span>{m.label}</span>
                {mapId === m.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D9F5]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Filter */}
        <div className="bg-[#101925] border border-[#1E2B3E] rounded-lg p-3">
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
                    ? 'bg-[#172435] text-[#00D9F5] border border-[#00D9F5]/40'
                    : 'text-[#64748B] border border-[#1E2B3E] hover:text-[#94A3B8] hover:bg-[#172435]/40'
                )}
              >
                {f === 'all' ? 'All' : f === 'human' ? 'Human' : 'Bot'}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-[#101925] border border-[#1E2B3E] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Calendar size={11} /> Date</span>
            {selectedDate && (
              <button
                onClick={() => handleSelectDate(null)}
                className="text-[9px] text-[#00D9F5] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              className="w-full bg-[#172435] border border-[#1E2B3E] rounded px-2.5 py-1.5 text-xs font-mono text-[#F8FAFC] appearance-none cursor-pointer focus:outline-none focus:border-[#00D9F5]/60"
              value={selectedDate ?? ''}
              onChange={(e) => handleSelectDate(e.target.value || null)}
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
        <div className="bg-[#101925] border border-[#1E2B3E] rounded-lg p-3 flex flex-col gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Crosshair size={11} /> Select Match</span>
            <span className="text-[#64748B]">{filteredMatches.length}</span>
          </div>

          {/* Matches Element Box (Native Dropdown Select) */}
          <div className="relative">
            <select
              aria-label="Select Match"
              className="w-full bg-[#172435] border border-[#1E2B3E] rounded px-2.5 py-1.5 text-xs font-mono text-[#F8FAFC] appearance-none cursor-pointer focus:outline-none focus:border-[#00D9F5]/60"
              value={selectedMatchId ?? ''}
              onChange={(e) => handleSelectMatch(e.target.value || null)}
            >
              <option value="">All Matches ({filteredMatches.length})</option>
              {filteredMatches.map((m) => (
                <option key={m.match_id} value={m.match_id}>
                  {m.date ? `${m.date.slice(5)} - ` : ''}{m.match_id.slice(0, 10)}... ({m.total_participants}p, {formatDuration(m.duration_seconds)})
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-[#64748B] pointer-events-none" />
          </div>

          {/* Quick Search & Scrollable Match Roster */}
          <div className="pt-1 border-t border-[#1E2B3E]/60 flex flex-col gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                placeholder="Filter match ID..."
                className="w-full bg-[#172435] border border-[#1E2B3E] rounded pl-6 pr-2 py-1 text-[10px] font-mono text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9F5]/60"
              />
              <Search size={10} className="absolute left-2 top-2 text-[#64748B] pointer-events-none" />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
              <button
                onClick={() => handleSelectMatch(null)}
                className={clsx(
                  'w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors',
                  !selectedMatchId
                    ? 'bg-[#172435] text-[#00D9F5] font-semibold'
                    : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#172435]/40'
                )}
              >
                All matches ({filteredMatches.length})
              </button>
              {displayedMatches.map((m) => (
                <button
                  key={m.match_id}
                  onClick={() => handleSelectMatch(m.match_id)}
                  className={clsx(
                    'w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors truncate flex items-center justify-between',
                    selectedMatchId === m.match_id
                      ? 'bg-[#172435] text-[#00D9F5] font-semibold'
                      : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#172435]/40'
                  )}
                  title={`${m.match_id} (${m.total_participants} participants, ${formatDuration(m.duration_seconds)})`}
                >
                  <span className="truncate">
                    <span className="text-[#64748B]">{m.date.slice(5)} </span>
                    {m.match_id.slice(0, 8)}...
                  </span>
                  <span className="text-[#64748B] text-[9px] flex-shrink-0 ml-1">{m.total_participants}p</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layers & Event Toggles */}
        <div className="bg-[#101925] border border-[#1E2B3E] rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Layers size={11} /> Layer Toggles</span>
            <div className="flex gap-1.5 text-[9px]">
              <button
                onClick={() => setAllLayers(true)}
                className="text-[#64748B] hover:text-[#00D9F5]"
                title="Enable all layers"
              >
                All On
              </button>
              <span className="text-[#1E2B3E]">|</span>
              <button
                onClick={() => setAllLayers(false)}
                className="text-[#64748B] hover:text-[#00D9F5]"
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
                    on ? 'text-[#F8FAFC] hover:bg-[#172435]' : 'text-[#475569] hover:bg-[#172435]/40'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: on ? color : '#1E2B3E' }}
                    />
                    <span>{label}</span>
                  </span>
                  {on ? (
                    <Eye size={11} style={{ color }} />
                  ) : (
                    <EyeOff size={11} className="text-[#64748B]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Filters Action */}
        <button
          onClick={resetFilters}
          className="w-full py-2 px-3 rounded-lg border border-[#1E2B3E] hover:border-[#334155] bg-[#101925] hover:bg-[#172435] text-xs font-mono text-[#94A3B8] hover:text-[#00D9F5] flex items-center justify-center gap-2 transition-colors"
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
              <Route size={12} className="text-[#00D9F5]" />
              {loading ? (
                <span className="animate-pulse">Loading journeys...</span>
              ) : (
                <span>
                  <strong className="text-[#F8FAFC]">{visibleJourneyCount.toLocaleString()}</strong> journeys visible
                </span>
              )}
            </span>

            {selectedMatchId && (
              <span className="text-[#00D9F5] bg-[#00D9F5]/10 px-2 py-0.5 rounded border border-[#00D9F5]/20 flex items-center gap-1">
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
              <span className="text-[#00D9F5] bg-[#00D9F5]/10 px-2 py-0.5 rounded border border-[#00D9F5]/20 flex items-center gap-1">
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

        {/* Match Intelligence Card (when a match is selected) */}
        {selectedMatch && (
          <div className="bg-[#101925]/95 backdrop-blur-md border border-[#00D9F5]/40 rounded-xl p-3 font-mono text-xs shadow-2xl animate-in fade-in duration-150 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#1E2B3E] pb-2 mb-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#00D9F5] animate-pulse flex-shrink-0" />
                <span className="text-[#64748B] text-[10px] uppercase tracking-wider flex-shrink-0">Active Match:</span>
                <span className="text-[#F8FAFC] font-bold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-lg" title={selectedMatch.match_id}>
                  {selectedMatch.match_id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00D9F5]/10 text-[#00D9F5] border border-[#00D9F5]/30 font-semibold flex-shrink-0">
                  {selectedMatch.map_id}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setIsTimelineActive(true);
                    playback.restart();
                    playback.play();
                  }}
                  className="px-2.5 py-1 rounded bg-[#00D9F5]/20 hover:bg-[#00D9F5]/30 text-[#00D9F5] border border-[#00D9F5]/40 text-[10px] flex items-center gap-1.5 transition-colors font-bold shadow-[0_0_8px_rgba(0,217,245,0.2)] flex-shrink-0"
                  title="Watch match replay progression from start to finish"
                >
                  <Play size={10} className="fill-current" />
                  <span>Play Replay</span>
                </button>
                <button
                  onClick={() => handleSelectMatch(null)}
                  className="px-2.5 py-1 rounded bg-[#172435] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E2B3E] hover:border-[#334155] text-[10px] flex items-center gap-1.5 transition-colors flex-shrink-0"
                  title={`Return to viewing all matches for ${selectedMatch.date}`}
                >
                  <RotateCcw size={11} />
                  <span className="hidden xl:inline">Show All Matches for {selectedMatch.date}</span>
                  <span className="xl:hidden">All Matches ({selectedMatch.date})</span>
                </button>
              </div>
            </div>

            {/* Match KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 mb-2 text-[11px]">
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Date</span>
                <span className="text-[#F8FAFC] font-semibold block truncate">{selectedMatch.date}</span>
              </div>
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Duration</span>
                <span className="text-[#F8FAFC] font-semibold block truncate">{formatDuration(selectedMatch.duration_seconds)}</span>
              </div>
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Participants</span>
                <span className="text-[#00D9F5] font-semibold block truncate" title={`${selectedMatch.total_participants} (${selectedMatch.human_count}H / ${selectedMatch.bot_count}B)`}>
                  {selectedMatch.total_participants} ({selectedMatch.human_count}H / {selectedMatch.bot_count}B)
                </span>
              </div>
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Total Distance</span>
                <span className="text-[#F8FAFC] font-semibold block truncate">
                  {(selectedMatch.total_distance_travelled_meters / 1000).toFixed(2)} km
                </span>
              </div>
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Loot Events</span>
                <span className="text-[#10B981] font-semibold block truncate">{selectedMatch.total_loot_events}</span>
              </div>
              <div className="bg-[#0A0E17] border border-[#1E2B3E] rounded p-1.5 min-w-0">
                <span className="text-[10px] text-[#64748B] block truncate">Casualties</span>
                <span className="text-[#EF4444] font-semibold block truncate" title={`${selectedMatch.total_deaths} (${selectedMatch.total_bot_kills} BotKills)`}>
                  {selectedMatch.total_deaths} ({selectedMatch.total_bot_kills} BotKills)
                </span>
              </div>
            </div>

            {/* Participant Roster Chips */}
            {selectedMatch.participants && selectedMatch.participants.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] max-h-20 overflow-y-auto custom-scrollbar">
                <span className="text-[#64748B] flex-shrink-0">Participants:</span>
                {selectedMatch.participants.map((p) => {
                  const matchJourney = filteredJourneys.find((j) => j.user_id === p.user_id);
                  const isSelected = matchJourney && matchJourney.journey_id === selectedJourneyId;
                  const isH = p.entity_type === 'human';
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => {
                        if (matchJourney) {
                          setSelectedJourneyId(isSelected ? null : matchJourney.journey_id);
                        }
                      }}
                      className={clsx(
                        'px-2 py-0.5 rounded border transition-colors flex items-center gap-1 flex-shrink-0',
                        isSelected
                          ? 'bg-[#00D9F5]/30 text-[#00D9F5] border-[#00D9F5] font-bold shadow-[0_0_8px_rgba(0,217,245,0.3)]'
                          : isH
                          ? 'bg-[#00D9F5]/10 text-[#00D9F5] border-[#00D9F5]/30 hover:bg-[#00D9F5]/20'
                          : 'bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30 hover:bg-[#F5A623]/20'
                      )}
                      title={`${p.user_id} (${p.outcome}, ${(p.distance_travelled_meters).toFixed(0)}m travelled, ${p.loot_count} loots, ${p.bot_kills} kills)`}
                    >
                      <span className="text-[#64748B]">{isH ? 'H' : 'B'}:</span>
                      <span className="font-semibold">{p.user_id.slice(0, 8)}...</span>
                      <span className={clsx('text-[9px] font-bold', p.outcome === 'SURVIVED_PRESUMED' ? 'text-[#10B981]' : 'text-[#EF4444]')}>
                        {p.outcome === 'SURVIVED_PRESUMED' ? 'SURVIVED' : 'ELIMINATED'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Date Operational Summary Banner (when viewing all matches for a date) */}
        {!selectedMatch && selectedDate && (
          <div className="bg-[#101925]/90 backdrop-blur-sm border border-[#1E2B3E] rounded-lg px-3 py-2 font-mono text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <Calendar size={13} className="text-[#00D9F5]" />
              <span className="text-[#64748B]">Operational Date:</span>
              <span className="text-[#F8FAFC] font-bold">{selectedDate}</span>
              <span className="text-[#1E2B3E]">|</span>
              <span className="text-[#94A3B8]">
                <strong className="text-[#F8FAFC]">{filteredMatches.length}</strong> matches
              </span>
              <span>•</span>
              <span className="text-[#94A3B8]">
                <strong className="text-[#00D9F5]">{visibleJourneyCount}</strong> journeys rendered
              </span>
              <span>•</span>
              <span className="text-[#94A3B8]">
                <strong className="text-[#10B981]">{timelineEvents.length}</strong> discrete events
              </span>
            </div>
            <button
              onClick={() => handleSelectDate(null)}
              className="text-[10px] text-[#00D9F5] hover:underline flex-shrink-0"
            >
              Clear Date Filter
            </button>
          </div>
        )}

        {/* Map Canvas with Overlays */}
        <div className="flex-1 min-h-[300px] min-w-0 relative rounded-lg overflow-hidden border border-[#1E2B3E] bg-[#080D14]">
          {loading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080D14]/80 backdrop-blur-sm">
              <div className="text-xs font-mono text-[#00D9F5] flex items-center gap-2 animate-pulse">
                <Route size={14} className="animate-spin" />
                <span>Loading map telemetry...</span>
              </div>
            </div>
          )}

          <MapCanvas
            mapId={mapId}
            journeys={filteredJourneys}
            activeLayers={activeLayers}
            entityFilter={entityFilter}
            selectedMatchId={selectedMatchId}
            selectedJourneyId={selectedJourneyId}
            playbackTimestamp={isTimelineActive || playback.isPlaying ? playback.currentTs : null}
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
          isTimelineActive={isTimelineActive}
          onShowFullOverview={() => {
            setIsTimelineActive(false);
            playback.pause();
          }}
          onPlay={() => {
            setIsTimelineActive(true);
            playback.play();
          }}
          onPause={() => {
            playback.pause();
          }}
          onRestart={() => {
            setIsTimelineActive(true);
            playback.restart();
          }}
          onSeek={(ts) => {
            setIsTimelineActive(true);
            playback.seek(ts);
          }}
          onSeekProgress={(progress) => {
            setIsTimelineActive(true);
            playback.seekProgress(progress);
          }}
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
