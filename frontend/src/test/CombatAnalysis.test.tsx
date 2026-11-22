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
      expect(screen.getByText('Combat Telemetry Boundaries')).toBeInTheDocument();
    });

    expect(screen.getByText(/BotKill vs BotKilled:/i)).toBeInTheDocument();
    expect(screen.getByText(/Storm Fatalities:/i)).toBeInTheDocument();
  });

  it('filters events by individual maps without All Maps option', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Default map is AmbroseValley
      expect(screen.getByText('human-hero-1')).toBeInTheDocument();
      // Lockdown event is not shown
      expect(screen.queryByText('human-straggler-3')).not.toBeInTheDocument();
    });

    // "All Maps" option should not exist
    expect(screen.queryByText('All Maps')).not.toBeInTheDocument();

    // Switch to Lockdown
    const lockdownBtn = screen.getByRole('button', { name: /Lockdown/i });
    fireEvent.click(lockdownBtn);

    await waitFor(() => {
      // Now Lockdown event should appear (when category permits or switch category)
      // Category is all_combat by default, KilledByStorm is combat
      expect(screen.getByText('human-straggler-3')).toBeInTheDocument();
      expect(screen.queryByText('human-hero-1')).not.toBeInTheDocument();
    });
  });

  it('filters events by category using the select dropdown', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('human-hero-1')).toBeInTheDocument();
      expect(screen.getByText('bot-target-2')).toBeInTheDocument();
      expect(screen.getByText('human-pvp-4')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue(/All Combat Events/i);
    fireEvent.change(categorySelect, { target: { value: 'BotKill' } });

    expect(screen.getByText('human-hero-1')).toBeInTheDocument();
    expect(screen.queryByText('bot-target-2')).not.toBeInTheDocument();
    expect(screen.queryByText('human-pvp-4')).not.toBeInTheDocument();
  });

  it('does not contain an Action column in the table', async () => {
    render(
      <MemoryRouter>
        <CombatAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('human-hero-1')).toBeInTheDocument();
    });

    // Table header should not contain "Action"
    expect(screen.queryByRole('columnheader', { name: /Action/i })).not.toBeInTheDocument();
    // Replay button in table should not exist
    expect(screen.queryByRole('button', { name: /^Replay$/i })).not.toBeInTheDocument();
  });

  it('shows selected event dossier card on row click with coordinates', async () => {
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
      // Selected badge in row or card
      expect(screen.getAllByText(/Selected/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Entity Classification/i)).toBeInTheDocument();
    });

    // Coordinates appear in preview card
    const coordElements = screen.getAllByText(/100.5/);
    expect(coordElements.length).toBeGreaterThan(0);
  });
});
