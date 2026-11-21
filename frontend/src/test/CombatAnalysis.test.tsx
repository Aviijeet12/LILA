import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CombatAnalysisPage } from '../features/combat/CombatAnalysisPage';
import { dataService } from '../services/dataService';
import { DiscreteEvent } from '../types/telemetry';

vi.mock('../services/dataService', () => ({
  dataService: {
    getEvents: vi.fn(),
    getMinimapUrl: vi.fn().mockReturnValue('/test-minimap.webp'),
  },
}));

const mockEvents: DiscreteEvent[] = [
  {
    event: 'BotKill',
    match_id: 'm-av-1',
    user_id: 'human-hero-1',
    entity_type: 'human',
    map_id: 'AmbroseValley',
    date: '2026-02-10',
    ts: 1770717600,
    iso: '2026-02-10T10:00:00.000Z',
    x: 100.5,
    y: 1.0,
    z: -50.2,
    u: 0.55,
    v: 0.45,
  },
  {
    event: 'BotKilled',
    match_id: 'm-av-1',
    user_id: 'bot-target-2',
    entity_type: 'bot',
    map_id: 'AmbroseValley',
    date: '2026-02-10',
    ts: 1770717605,
    iso: '2026-02-10T10:00:05.000Z',
    x: 102.0,
    y: 1.0,
    z: -48.0,
    u: 0.56,
    v: 0.44,
  },
  {
    event: 'KilledByStorm',
    match_id: 'm-ld-2',
    user_id: 'human-straggler-3',
    entity_type: 'human',
    map_id: 'Lockdown',
    date: '2026-02-11',
    ts: 1770804000,
    iso: '2026-02-11T10:00:00.000Z',
    x: 20.0,
    y: 1.0,
    z: 30.0,
    u: 0.7,
    v: 0.3,
  },
  {
    event: 'Kill',
    match_id: 'm-av-1',
    user_id: 'human-pvp-4',
    entity_type: 'human',
    map_id: 'AmbroseValley',
    date: '2026-02-10',
    ts: 1770717620,
    iso: '2026-02-10T10:00:20.000Z',
    x: 110.0,
    y: 1.0,
    z: -40.0,
    u: 0.58,
    v: 0.42,
  },
  {
    event: 'Loot',
    match_id: 'm-av-1',
    user_id: 'human-hero-1',
    entity_type: 'human',
    map_id: 'AmbroseValley',
    date: '2026-02-10',
    ts: 1770717630,
    iso: '2026-02-10T10:00:30.000Z',
    x: 115.0,
    y: 1.0,
    z: -38.0,
    u: 0.59,
    v: 0.41,
  },
];

describe('CombatAnalysisPage', () => {
  beforeEach(() => {
    vi.mocked(dataService.getEvents).mockResolvedValue(mockEvents);
  });

  it('renders page header and semantic boundary disclosure section', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Combat Telemetry Analysis')).toBeInTheDocument();
      // Semantic disclosure notice at bottom
      expect(screen.getByText('Combat Telemetry Boundaries')).toBeInTheDocument();
    });

    // Semantic boundary list items — text is split across elements, use regex container match
    expect(screen.getByText(/BotKill vs BotKilled:/i)).toBeInTheDocument();
    expect(screen.getByText(/Storm Fatalities:/i)).toBeInTheDocument();
  });

  it('filters events by category using the select dropdown', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // By default, selectedMap is AmbroseValley and category is all_combat (shows BotKill, BotKilled, Kill)
      expect(screen.getByText('human-hero-1')).toBeInTheDocument();
      expect(screen.getByText('bot-target-2')).toBeInTheDocument();
      expect(screen.getByText('human-pvp-4')).toBeInTheDocument();
    });

    // Select category dropdown — actual option text is "All Combat Events (Excl. Loot)"
    const categorySelect = screen.getByDisplayValue(/All Combat Events/i);
    fireEvent.change(categorySelect, { target: { value: 'BotKill' } });

    expect(screen.getByText('human-hero-1')).toBeInTheDocument();
    expect(screen.queryByText('bot-target-2')).not.toBeInTheDocument();
    expect(screen.queryByText('human-pvp-4')).not.toBeInTheDocument();
  });

  it('shows selected event preview card and deep link on row click', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('human-hero-1')).toBeInTheDocument();
    });

    // Click on row with human-hero-1
    const row = screen.getByText('human-hero-1').closest('tr');
    if (row) fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Selected Event')).toBeInTheDocument();
      expect(screen.getByText('Open In Map Explorer Replay')).toBeInTheDocument();
    });

    // Coordinates appear in both table and preview card — both are valid
    const coordElements = screen.getAllByText(/100\.5/);
    expect(coordElements.length).toBeGreaterThan(0);
  });
});
