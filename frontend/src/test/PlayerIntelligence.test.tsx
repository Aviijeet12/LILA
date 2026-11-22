import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerIntelligencePage } from '../features/players/PlayerIntelligencePage';
import { dataService } from '../services/dataService';
import { PlayerSummary } from '../types/telemetry';

vi.mock('../services/dataService', () => ({
  dataService: {
    getPlayers: vi.fn(),
    getMapJourneys: vi.fn().mockResolvedValue([]),
    getMinimapUrl: vi.fn(() => '/data/processed/minimaps/AmbroseValley_Minimap.webp'),
  },
}));

const mockPlayers: PlayerSummary[] = [
  {
    user_id: 'alpha-human-001',
    entity_type: 'human',
    matches_played: 4,
    total_distance_travelled_meters: 12500,
    avg_distance_travelled_meters: 3125,
    total_duration_seconds: 840,
    avg_duration_seconds: 210,
    maps_played: { AmbroseValley: 3, Lockdown: 1 },
    dates_active: ['2026-02-10'],
    total_loot_events: 12,
    total_bot_kill_events: 5,
    total_death_events: 1,
    total_storm_deaths: 0,
    outcomes: {
      SURVIVED_PRESUMED: 3,
      ELIMINATED: 1,
    },
    matches: ['match-av-101'],
  },
  {
    user_id: 'omega-bot-999',
    entity_type: 'bot',
    matches_played: 2,
    total_distance_travelled_meters: 1400,
    avg_distance_travelled_meters: 700,
    total_duration_seconds: 180,
    avg_duration_seconds: 90,
    maps_played: { Lockdown: 2 },
    dates_active: ['2026-02-11'],
    total_loot_events: 0,
    total_bot_kill_events: 0,
    total_death_events: 2,
    total_storm_deaths: 0,
    outcomes: {
      SURVIVED_PRESUMED: 0,
      ELIMINATED: 2,
    },
    matches: ['match-ld-202'],
  },
];

describe('PlayerIntelligencePage', () => {
  beforeEach(() => {
    vi.mocked(dataService.getPlayers).mockResolvedValue(mockPlayers);
  });

  it('renders page title and player KPI summary', async () => {
    render(
      <MemoryRouter>
        <PlayerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
      expect(screen.getByText('omega-bot-999')).toBeInTheDocument();
    });

    // Summary KPI labels in header
    expect(screen.getByText('Total Entities:')).toBeInTheDocument();
    expect(screen.getByText('Humans:')).toBeInTheDocument();
    expect(screen.getByText('Bots:')).toBeInTheDocument();
  });

  it('filters entities by Human or Bot type', async () => {
    render(
      <MemoryRouter>
        <PlayerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
    });

    // Filter to Bots only — button accessible by role name
    const botFilterBtn = screen.getByRole('button', { name: /Bots/i });
    fireEvent.click(botFilterBtn);

    expect(screen.queryByText('alpha-human-001')).not.toBeInTheDocument();
    expect(screen.getByText('omega-bot-999')).toBeInTheDocument();

    // Filter to Humans only
    const humanFilterBtn = screen.getByRole('button', { name: /Humans/i });
    fireEvent.click(humanFilterBtn);

    expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
    expect(screen.queryByText('omega-bot-999')).not.toBeInTheDocument();
  });

  it('searches by user ID substring', async () => {
    render(
      <MemoryRouter>
        <PlayerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
    });

    // placeholder is "Search entity ID..."
    const searchInput = screen.getByPlaceholderText('Search entity ID...');
    fireEvent.change(searchInput, { target: { value: 'omega' } });

    expect(screen.queryByText('alpha-human-001')).not.toBeInTheDocument();
    expect(screen.getByText('omega-bot-999')).toBeInTheDocument();
  });

  it('opens profile modal showing match sessions when clicking Inspect', async () => {
    render(
      <MemoryRouter>
        <PlayerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
    });

    // Find and click the first "Inspect" button (for alpha-human-001)
    const inspectBtn = screen.getAllByRole('button', { name: 'Inspect' })[0];
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      // Modal renders player ID in heading
      expect(screen.getAllByText('alpha-human-001').length).toBeGreaterThan(1);
      // Match sessions section showing distinct match count
      expect(screen.getByText(/Distinct Match Participations/i)).toBeInTheDocument();
      // Replay button in sessions list
      expect(screen.getByText('View Replay')).toBeInTheDocument();
      // Neutral labels (present in both table and modal)
      expect(screen.getAllByText(/BotKill Events/i).length).toBeGreaterThan(1);
      expect(screen.getAllByText(/Loot Events/i).length).toBeGreaterThan(1);
      expect(screen.getByText(/Elimination Events:/i)).toBeInTheDocument();
    });
  });

  it('opens in-page Player Game View when View Replay is clicked', async () => {
    render(
      <MemoryRouter>
        <PlayerIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha-human-001')).toBeInTheDocument();
    });

    const inspectBtn = screen.getAllByRole('button', { name: 'Inspect' })[0];
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText('View Replay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Replay'));

    await waitFor(() => {
      expect(screen.getByText('Back to Players')).toBeInTheDocument();
      expect(screen.getByText('Game Event Feed')).toBeInTheDocument();
    });

    // Clicking Back to Players returns to Directory
    fireEvent.click(screen.getByText('Back to Players'));
    await waitFor(() => {
      expect(screen.getByText('Player Intelligence Directory')).toBeInTheDocument();
    });
  });
});
