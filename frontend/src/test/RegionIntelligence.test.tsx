import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegionIntelligencePage } from '../features/regions/RegionIntelligencePage';
import { dataService } from '../services/dataService';
import { MapHeatmaps, MapId } from '../types/telemetry';

vi.mock('../services/dataService', () => ({
  dataService: {
    getMapHeatmaps: vi.fn(),
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

describe('RegionIntelligencePage', () => {
  beforeEach(() => {
    vi.mocked(dataService.getMapHeatmaps).mockImplementation((mapId: MapId) =>
      Promise.resolve(createMockHeatmap(mapId))
    );
  });

  it('renders page title and default selected cell coordinates', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Page heading
      expect(screen.getByText(/Region Intelligence/i)).toBeInTheDocument();
      // Default selected cell indicator in grid footer
      expect(screen.getByText(/Selected: \[Row 25, Col 6\]/i)).toBeInTheDocument();
    });

    // Spatial bounds cards rendered in inspector
    expect(screen.getByText(/World Coordinate Bounds/i)).toBeInTheDocument();
    expect(screen.getByText(/Normalized UV Bounds/i)).toBeInTheDocument();
    // 6-layer breakdown header
    expect(screen.getByText(/Layer-Specific Activity in Sector/i)).toBeInTheDocument();
  });

  it('displays top hotspot rankings and share of total percentage', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Hotspot table header
      expect(screen.getByText(/Ranked Hotspots Analysis/i)).toBeInTheDocument();
    });

    // Row 25, Col 6 has 100 out of 150 total => 66.67% share
    // The component renders "Sector [25, 6]" in table
    expect(screen.getByText('Sector [25, 6]')).toBeInTheDocument();
    // Share percentage rounded to 2 decimals
    expect(screen.getAllByText(/66\.67%/).length).toBeGreaterThan(0);
  });

  it('renders cross-map territorial comparison section with all 3 maps', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Cross-map section heading
      expect(screen.getByText(/Cross-Map Comparative Territorial Metrics/i)).toBeInTheDocument();
    });

    // All 3 map labels appear in the cross-map comparison cards
    expect(screen.getAllByText('AmbroseValley').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GrandRift').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lockdown').length).toBeGreaterThan(0);
  });

  it('has focus button to open Map Explorer for selected sector', async () => {
    render(
      <MemoryRouter>
        <RegionIntelligencePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // "Focus in Map Explorer" buttons appear in both inspector header and grid footer
      const focusButtons = screen.getAllByText(/Focus in Map Explorer/i);
      expect(focusButtons.length).toBeGreaterThan(0);
    });
  });
});
