import { create } from 'zustand';
import { MapId, EntityType } from '../types/telemetry';

export interface ActiveLayers {
  human_trajectories: boolean;
  bot_trajectories:   boolean;
  loot:               boolean;
  bot_kill:           boolean;
  bot_killed:         boolean;
  killed_by_storm:    boolean;
  kill:               boolean;
  killed:             boolean;
}

export interface AppState {
  // Navigation / Filter State
  selectedMap:        MapId;
  selectedDate:       string | null;
  selectedMatchId:    string | null;
  selectedJourneyId:  string | null;
  entityFilter:       'all' | EntityType;
  selectedPlayerId:   string | null;

  // Map Explorer Layer State
  activeLayers: ActiveLayers;

  // Timeline & Playback State
  timelineTimestamp: number | null;
  isPlaying:         boolean;
  playbackSpeed:     number;

  // Actions
  setSelectedMap:        (mapId: MapId) => void;
  setSelectedDate:       (date: string | null) => void;
  setSelectedMatchId:    (matchId: string | null) => void;
  setSelectedMatchAndDate: (matchId: string | null, date: string | null) => void;
  setSelectedJourneyId:  (journeyId: string | null) => void;
  setEntityFilter:       (filter: 'all' | EntityType) => void;
  setSelectedPlayerId:   (playerId: string | null) => void;
  setActiveLayer:        (layer: keyof ActiveLayers, value: boolean) => void;
  toggleLayer:           (layer: keyof ActiveLayers) => void;
  setAllLayers:          (enabled: boolean) => void;
  setTimelineTimestamp:  (ts: number | null) => void;
  setIsPlaying:          (playing: boolean) => void;
  setPlaybackSpeed:      (speed: number) => void;
  resetFilters:          () => void;
}

const DEFAULT_LAYERS: ActiveLayers = {
  human_trajectories: true,
  bot_trajectories:   true,
  loot:               true,
  bot_kill:           true,
  bot_killed:         true,
  killed_by_storm:    true,
  kill:               true,
  killed:             true,
};

function getInitialMap(): MapId {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('map');
    if (p === 'GrandRift' || p === 'Lockdown' || p === 'AmbroseValley') return p;
  }
  return 'AmbroseValley';
}

function getInitialEntity(): 'all' | EntityType {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('entity');
    if (p === 'human' || p === 'bot') return p;
  }
  return 'all';
}

function getInitialLayers(): ActiveLayers {
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('layers');
    if (p === 'none') {
      return {
        human_trajectories: false,
        bot_trajectories: false,
        loot: false,
        bot_kill: false,
        bot_killed: false,
        killed_by_storm: false,
        kill: false,
        killed: false,
      };
    }
  }
  return { ...DEFAULT_LAYERS };
}

export const useAppStore = create<AppState>((set) => ({
  selectedMap:        getInitialMap(),
  selectedDate:       null,
  selectedMatchId:    null,
  selectedJourneyId:  null,
  entityFilter:       getInitialEntity(),
  selectedPlayerId:   null,

  activeLayers: getInitialLayers(),

  timelineTimestamp: null,
  isPlaying:         false,
  playbackSpeed:     1,

  setSelectedMap:        (selectedMap)       => set({
    selectedMap,
    selectedDate: null,
    selectedMatchId: null,
    selectedJourneyId: null,
    entityFilter: 'all',
    activeLayers: { ...DEFAULT_LAYERS },
    timelineTimestamp: null,
    isPlaying: false,
    selectedPlayerId: null,
  }),
  setSelectedDate:       (selectedDate)      => set({ selectedDate, selectedJourneyId: null }),
  setSelectedMatchId:    (selectedMatchId)   => set({ selectedMatchId, selectedJourneyId: null }),
  setSelectedMatchAndDate: (selectedMatchId, selectedDate) => set({ selectedMatchId, selectedDate, selectedJourneyId: null }),
  setSelectedJourneyId:  (selectedJourneyId) => set({ selectedJourneyId }),
  setEntityFilter:       (entityFilter)      => set({ entityFilter, selectedJourneyId: null }),
  setSelectedPlayerId:   (selectedPlayerId)  => set({ selectedPlayerId }),

  setActiveLayer: (layer, value) =>
    set((state) => ({ activeLayers: { ...state.activeLayers, [layer]: value } })),

  toggleLayer: (layer) =>
    set((state) => ({ activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] } })),

  setAllLayers: (enabled) =>
    set({
      activeLayers: {
        human_trajectories: enabled,
        bot_trajectories:   enabled,
        loot:               enabled,
        bot_kill:           enabled,
        bot_killed:         enabled,
        killed_by_storm:    enabled,
        kill:               enabled,
        killed:             enabled,
      },
    }),

  setTimelineTimestamp: (timelineTimestamp) => set({ timelineTimestamp }),
  setIsPlaying:         (isPlaying)         => set({ isPlaying }),
  setPlaybackSpeed:     (playbackSpeed)     => set({ playbackSpeed }),

  resetFilters: () =>
    set({
      selectedDate:       null,
      selectedMatchId:    null,
      selectedJourneyId:  null,
      entityFilter:       'all',
      selectedPlayerId:   null,
      activeLayers:       { ...DEFAULT_LAYERS },
      timelineTimestamp:  null,
      isPlaying:          false,
    }),
}));
