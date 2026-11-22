import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerGamePage } from '../features/player-game/PlayerGamePage';
import { dataService } from '../services/dataService';
import { PlayerSummary, Journey } from '../types/telemetry';

vi.mock('../services/dataService', () => ({
  dataService: {
    getPlayers: vi.fn(),
    getMapJourneys: vi.fn(),
    getMinimapUrl: vi.fn(() => '/data/processed/minimaps/AmbroseValley_Minimap.webp'),
  },
}));

const mockPlayers: PlayerSummary[] = [
  {
    user_id: 'player-test-001',
    entity_type: 'human',
    matches_played: 2,
    total_distance_travelled_meters: 5000,
    avg_distance_travelled_meters: 2500,
    total_duration_seconds: 600,
    avg_duration_seconds: 300,
    maps_played: { AmbroseValley: 2 },
    dates_active: ['2026-02-10'],
    total_loot_events: 10,
    total_bot_kill_events: 3,
    total_death_events: 0,
    total_storm_deaths: 0,
    outcomes: {
      SURVIVED_PRESUMED: 2,
      ELIMINATED: 0,
    },
    matches: ['match-test-101', 'match-test-102'],
  },
];

const mockJourneys: Journey[] = [
  {
    journey_id: 'journey-001',
    user_id: 'player-test-001',
    match_id: 'match-test-101',
    map_id: 'AmbroseValley',
    date: '2026-02-10',
    entity_type: 'human',
    start_ts: 1770750000,
    end_ts: 1770750300,
    duration_seconds: 300,
    distance_travelled_meters: 1250.0,
    starting_position: { x: -100, y: 100, z: -200, u: 0.3, v: 0.3 },
    ending_position: { x: 50, y: 100, z: 150, u: 0.6, v: 0.7 },
    terminal_event: 'Position',
    outcome: 'SURVIVED_PRESUMED',
    event_counts: { Position: 40, Loot: 4, BotKill: 1 },
    positions_count: 40,
    discrete_events_count: 5,
    positions: [
      { ts: 1770750000, x: -100, y: 100, z: -200, u: 0.3, v: 0.3 },
      { ts: 1770750150, x: -20, y: 100, z: -50, u: 0.45, v: 0.5 },
      { ts: 1770750300, x: 50, y: 100, z: 150, u: 0.6, v: 0.7 },
    ],
    events: [
      { event: 'Loot', ts: 1770750050, x: -80, y: 100, z: -150, u: 0.35, v: 0.35 },
      { event: 'BotKill', ts: 1770750200, x: 10, y: 100, z: 80, u: 0.52, v: 0.62 },
    ],
  },
];

describe('PlayerGamePage Dedicated Screen', () => {
  beforeEach(() => {
    vi.mocked(dataService.getPlayers).mockResolvedValue(mockPlayers);
    vi.mocked(dataService.getMapJourneys).mockResolvedValue(mockJourneys);
  });

  it('renders command header with player selector, match selector, and back button', async () => {
    render(
      <MemoryRouter initialEntries={['/player-game?player=player-test-001&match=match-test-101']}>
        <PlayerGamePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Back to Players')).toBeInTheDocument();
      expect(screen.getByText('Inspected Player')).toBeInTheDocument();
      expect(screen.getByText('Selected Match')).toBeInTheDocument();
      expect(screen.getByText('Theater Map')).toBeInTheDocument();
    });
  });

  it('displays player game dossier metrics accurately', async () => {
    render(
      <MemoryRouter initialEntries={['/player-game?player=player-test-001&match=match-test-101']}>
        <PlayerGamePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SURVIVED_PRESUMED/i)).toBeInTheDocument();
      expect(screen.getByText('1250 meters')).toBeInTheDocument();
      expect(screen.getByText('40 samples (~1 Hz)')).toBeInTheDocument();
    });
  });

  it('renders chronological event feed and playback controls', async () => {
    render(
      <MemoryRouter initialEntries={['/player-game?player=player-test-001&match=match-test-101']}>
        <PlayerGamePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Game Event Feed')).toBeInTheDocument();
      expect(screen.getByTitle('Play Timeline')).toBeInTheDocument();
      expect(screen.getByTitle('Restart from beginning')).toBeInTheDocument();
      expect(screen.getByText('FIT')).toBeInTheDocument();
    });
  });
});
