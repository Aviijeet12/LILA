import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegionIntelligencePage } from '../features/regions/RegionIntelligencePage';
import { dataService } from '../services/dataService';
import { MapHeatmaps, MapId, DiscreteEvent } from '../types/telemetry';

vi.mock('../services/dataService', () => ({
  dataService: {
    getMapHeatmaps: vi.fn(),
    getEvents: vi.fn(),
    getMinimapUrl: vi.fn().mockReturnValue('/test-minimap.webp'),
  },
}));

function createEmptyGrid(): number[][] {
  return Array.from({ length: 64 }, () => Array(64).fill(0));
}

function createMockHeatmap(mapId: MapId): MapHeatmaps {
  const gridTraffic = createEmptyGrid();
  const gridLoot = createEmptyGrid();
  const gridBotTraffic = createEmptyGrid();
  const gridBotKill = createEmptyGrid();
  const gridBotKilled = createEmptyGrid();
  const gridStorm = createEmptyGrid();

  // Populate hotspot cells
  gridTraffic[25][6] = 100;
  gridTraffic[10][10] = 50;
  gridLoot[25][6] = 20;

  return {
    map_id: mapId,
    grid_size: 64,
    coordinate_system: 'Normalized UV [0,1]',
    row_orientation: 'V axis top to bottom',
    col_orientation: 'U axis left to right',
    layers: {
      human_traffic: {
        name: 'Human Traffic',
        total_points: 150,
        max_cell_count: 100,
        active_cells_count: 2,
        grid: gridTraffic,
      },
      bot_traffic: {
        name: 'Bot Traffic',
        total_points: 40,
        max_cell_count: 30,
        active_cells_count: 2,
        grid: gridBotTraffic,
      },
      loot: {
        name: 'Loot',
        total_points: 20,
        max_cell_count: 20,
        active_cells_count: 1,
        grid: gridLoot,
      },
      bot_kill: {
        name: 'Bot Kills',
        total_points: 10,
        max_cell_count: 5,
        active_cells_count: 2,
        grid: gridBotKill,
      },
      bot_killed: {
        name: 'Bot Deaths',
        total_points: 8,
        max_cell_count: 4,
        active_cells_count: 2,
        grid: gridBotKilled,
      },
      killed_by_storm: {
        name: 'Storm Deaths',
        total_points: 2,
        max_cell_count: 1,
        active_cells_count: 2,
        grid: gridStorm,
      },
    },
  };
}

const mockEvents: DiscreteEvent[] = [
  {
    event: 'Loot',
    match_id: 'm1',
    user_id: 'player-alpha',
    entity_type: 'human',
    map_id: 'AmbroseValley',
    ts: 100,
    u: 0.1,
    v: 0.6,
    x: -280,
    z: -300,
  },
  {
    event: 'BotKill',
    match_id: 'm1',
    user_id: 'player-alpha',
    entity_type: 'human',
    map_id: 'AmbroseValley',
    ts: 120,
    u: 0.1,
    v: 0.6,
    x: -275,
    z: -295,
  },
];

describe('RegionIntelligencePage', () => {
  beforeEach(() => {
    vi.mocked(dataService.getMapHeatmaps).mockImplementation((mapId: MapId) =>
      Promise.resolve(createMockHeatmap(mapId))
    );
    vi.mocked(dataService.getEvents).mockResolvedValue(mockEvents);
  });

  it('renders page title, tactical heatmap canvas, and default selected cell telemetry', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Region Intelligence/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Row 25, Col 6/i).length).toBeGreaterThan(0);
    });

    // Spatial bounds cards rendered in inspector
    expect(screen.getByText(/World Coordinate Bounds/i)).toBeInTheDocument();
    expect(screen.getByText(/Normalized UV Bounds/i)).toBeInTheDocument();
    // 6-layer breakdown header
    expect(screen.getByText(/Layer-Specific Activity in Sector/i)).toBeInTheDocument();
    // Discrete events in sector section
    expect(screen.getByText(/Discrete Events in Sector/i)).toBeInTheDocument();
  });

  it('displays top hotspot rankings and allows direct selection without external redirect', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ranked Hotspots Analysis/i)).toBeInTheDocument();
    });

    // Row 25, Col 6 has 100 out of 150 total => 66.67% share
    expect(screen.getByText('Sector [25, 6]')).toBeInTheDocument();
    expect(screen.getAllByText(/66.67%/).length).toBeGreaterThan(0);

    // Row 10, Col 10 is the #2 hotspot
    expect(screen.getByText('Sector [10, 10]')).toBeInTheDocument();
    const row10 = screen.getByText('Sector [10, 10]').closest('tr');
    if (row10) fireEvent.click(row10);

    // Now selected cell updates to [10, 10]
    await waitFor(() => {
      expect(screen.getAllByText(/Row 10, Col 10/i).length).toBeGreaterThan(0);
    });
  });

  it('renders cross-map territorial comparison section with all 3 maps', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Cross-Map Comparative Territorial Metrics/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('AmbroseValley').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GrandRift').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lockdown').length).toBeGreaterThan(0);
  });

  it('strictly excludes Focus in Map Explorer buttons to maintain in-page region containment', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Region Intelligence/i)).toBeInTheDocument();
    });

    // Focus in Map Explorer should NOT exist anywhere on the page
    expect(screen.queryByText(/Focus in Map Explorer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Focus on Map/i)).not.toBeInTheDocument();
  });
});
