import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapExplorerPage } from '../features/map-explorer/MapExplorerPage';
import { dataService } from '../services/dataService';
import { useAppStore } from '../stores/appStore';

vi.mock('../services/dataService', () => ({
  dataService: {
    getMapJourneys: vi.fn(),
    getMapMetadata: vi.fn(),
    getMatches: vi.fn(),
    getMapHeatmaps: vi.fn().mockResolvedValue({
      map_id: 'AmbroseValley',
      grid_size: 64,
      coordinate_system: 'UV_normalized (0.0 to 1.0)',
      row_orientation: 'row 0 is North (v=1.0), row N-1 is South (v=0.0)',
      col_orientation: 'col 0 is West (u=0.0), col N-1 is East (u=1.0)',
      layers: {
        human_traffic: { name: 'human_traffic', total_points: 100, max_cell_count: 10, active_cells_count: 5, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
        bot_traffic: { name: 'bot_traffic', total_points: 50, max_cell_count: 5, active_cells_count: 3, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
        loot: { name: 'loot', total_points: 20, max_cell_count: 3, active_cells_count: 2, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
        bot_kill: { name: 'bot_kill', total_points: 10, max_cell_count: 2, active_cells_count: 2, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
        bot_killed: { name: 'bot_killed', total_points: 5, max_cell_count: 1, active_cells_count: 1, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
        killed_by_storm: { name: 'killed_by_storm', total_points: 1, max_cell_count: 1, active_cells_count: 1, grid: Array.from({ length: 64 }, () => Array(64).fill(0)) },
      },
    }),
    getMinimapUrl: vi.fn(() => '/data/processed/minimaps/AmbroseValley_Minimap.webp'),
  },
}));

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as any;

const mockMetadata = {
  map_id: 'AmbroseValley' as const,
  total_matches: 566,
  total_journeys: 836,
  human_journeys: 700,
  bot_journeys: 136,
  unique_humans: 200,
  unique_bots: 60,
  total_distance_km: 800,
  avg_journey_duration_seconds: 300,
  median_journey_duration_seconds: 280,
  event_counts: {},
  outcomes: { ELIMINATED: 400, SURVIVED_PRESUMED: 436 },
  scale: 900,
  origin_x: -370,
  origin_z: -473,
  native_width: 4320,
  native_height: 4320,
  minimap_filename: 'AmbroseValley_Minimap.webp',
};

const mockJourneys = [
  {
    journey_id: 'journey-human-1',
    user_id: 'user-uuid-1',
    match_id: 'match-1',
    map_id: 'AmbroseValley' as const,
    date: '2026-02-10',
    entity_type: 'human' as const,
    start_ts: 1770754537,
    end_ts: 1770755000,
    duration_seconds: 463,
    distance_travelled_meters: 850.5,
    starting_position: { x: -100, y: 100, z: -200, u: 0.3, v: 0.3 },
    ending_position: { x: 0, y: 100, z: 0, u: 0.41, v: 0.52 },
    terminal_event: 'BotKilled',
    outcome: 'ELIMINATED' as const,
    event_counts: { Position: 40, Loot: 5, BotKill: 2 },
    positions_count: 40,
    discrete_events_count: 7,
    positions: [
      { ts: 1770754537, x: -100, y: 100, z: -200, u: 0.3, v: 0.3 },
      { ts: 1770755000, x: 0, y: 100, z: 0, u: 0.41, v: 0.52 },
    ],
    events: [
      { event: 'Loot', ts: 1770754600, x: -80, y: 100, z: -150, u: 0.32, v: 0.35 },
    ],
  },
  {
    journey_id: 'journey-bot-2',
    user_id: '1402',
    match_id: 'match-1',
    map_id: 'AmbroseValley' as const,
    date: '2026-02-10',
    entity_type: 'bot' as const,
    start_ts: 1770754537,
    end_ts: 1770754900,
    duration_seconds: 363,
    distance_travelled_meters: 420.0,
    starting_position: { x: 50, y: 100, z: 50, u: 0.46, v: 0.58 },
    ending_position: { x: 80, y: 100, z: 80, u: 0.5, v: 0.61 },
    terminal_event: 'BotPosition',
    outcome: 'SURVIVED_PRESUMED' as const,
    event_counts: { BotPosition: 30 },
    positions_count: 30,
    discrete_events_count: 0,
    positions: [
      { ts: 1770754537, x: 50, y: 100, z: 50, u: 0.46, v: 0.58 },
    ],
    events: [],
  },
];

const mockMatches = [
  {
    match_id: 'match-1',
    map_id: 'AmbroseValley' as const,
    date: '2026-02-10',
    start_ts: 1770754537,
    end_ts: 1770755000,
    duration_seconds: 463,
    human_count: 1,
    bot_count: 1,
    total_participants: 2,
    total_events: 77,
    movement_samples: 70,
    discrete_events: 7,
    eliminated_count: 1,
    survived_presumed_count: 1,
    total_loot_events: 5,
    total_bot_kills: 2,
    total_deaths: 1,
    total_distance_travelled_meters: 1270.5,
    participants: [],
  },
];

describe('MapExplorerPage Integration', () => {
  beforeEach(() => {
    vi.mocked(dataService.getMapJourneys).mockResolvedValue(mockJourneys as any);
    vi.mocked(dataService.getMapMetadata).mockResolvedValue(mockMetadata as any);
    vi.mocked(dataService.getMatches).mockResolvedValue(mockMatches as any);
    useAppStore.getState().resetFilters();
  });

  it('renders all three map selector options', async () => {
    render(<MapExplorerPage />);
    expect(screen.getByText('Ambrose Valley')).toBeInTheDocument();
    expect(screen.getByText('Grand Rift')).toBeInTheDocument();
    expect(screen.getByText('Lockdown')).toBeInTheDocument();
  });

  it('renders entity filter buttons (All, Human, Bot)', () => {
    render(<MapExplorerPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.getByText('Bot')).toBeInTheDocument();
  });

  it('renders all 8 layer toggles including 6 discrete events', () => {
    render(<MapExplorerPage />);
    expect(screen.getByText('Human Paths')).toBeInTheDocument();
    expect(screen.getByText('Bot Paths')).toBeInTheDocument();
    expect(screen.getAllByText(/Loot Events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BotKill Events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BotKilled Events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Storm Death Events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kill Events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Killed Events/i).length).toBeGreaterThan(0);
  });

  it('filters journeys when entity filter is switched', async () => {
    render(<MapExplorerPage />);
    await screen.findByText('journeys visible');
    expect(screen.getByText('journeys visible').parentElement?.textContent).toContain('2 journeys visible');

    fireEvent.click(screen.getByText('Human'));
    expect(screen.getByText('journeys visible').parentElement?.textContent).toContain('1 journeys visible');
  });

  it('renders details panel when a journey is selected', async () => {
    render(<MapExplorerPage />);
    await screen.findByText('journeys visible');

    // Select human journey in store
    useAppStore.setState({ selectedJourneyId: 'journey-human-1' });

    await waitFor(() => {
      expect(screen.getByText('Human Player')).toBeInTheDocument();
      expect(screen.getByText('user-uuid-1')).toBeInTheDocument();
      expect(screen.getByText('ELIMINATED')).toBeInTheDocument();
      expect(screen.getByText('BotKilled')).toBeInTheDocument();
      expect(screen.getByText('851 m')).toBeInTheDocument();
    });
  });

  it('resets filters when Reset All Filters is clicked', async () => {
    render(<MapExplorerPage />);
    fireEvent.click(screen.getByText('Bot'));
    expect(useAppStore.getState().entityFilter).toBe('bot');

    fireEvent.click(screen.getByText('Reset All Filters'));
    expect(useAppStore.getState().entityFilter).toBe('all');
  });

  it('selects a match via the matches select dropdown and displays Play Replay', async () => {
    render(<MapExplorerPage />);
    await screen.findByText('journeys visible');

    const selectEl = screen.getByLabelText('Select Match');
    expect(selectEl).toBeInTheDocument();

    // Select match-1
    fireEvent.change(selectEl, { target: { value: 'match-1' } });

    // Verify store has match-1 selected
    expect(useAppStore.getState().selectedMatchId).toBe('match-1');

    // Verify Active Match card and Play Replay button are displayed
    await waitFor(() => {
      expect(screen.getByText('Active Match:')).toBeInTheDocument();
      expect(screen.getByText('Play Replay')).toBeInTheDocument();
    });
  });

  it('resets all filters to default when switching from one map to another', async () => {
    render(<MapExplorerPage />);
    await screen.findByText('journeys visible');

    // Artificially configure specific filters
    useAppStore.setState({
      selectedDate: '2026-02-10',
      selectedMatchId: 'match-1',
      selectedJourneyId: 'journey-human-1',
      entityFilter: 'bot',
      isPlaying: true,
      activeLayers: {
        human_trajectories: false,
        bot_trajectories: false,
        loot: false,
        bot_kill: false,
        bot_killed: false,
        killed_by_storm: false,
        kill: false,
        killed: false,
      },
    });

    // Click on another map (Grand Rift)
    fireEvent.click(screen.getByText('Grand Rift'));

    // Assert that the map switched and all filters were reset to default values
    const state = useAppStore.getState();
    expect(state.selectedMap).toBe('GrandRift');
    expect(state.selectedDate).toBeNull();
    expect(state.selectedMatchId).toBeNull();
    expect(state.selectedJourneyId).toBeNull();
    expect(state.entityFilter).toBe('all');
    expect(state.isPlaying).toBe(false);
    expect(state.activeLayers.human_trajectories).toBe(true);
    expect(state.activeLayers.bot_trajectories).toBe(true);
  });
});
