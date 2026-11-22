import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App, { PageLoadingFallback } from '../App';
import { dataService } from '../services/dataService';

vi.mock('../services/dataService', () => ({
  dataService: {
    getGlobalStats: vi.fn().mockResolvedValue({
      total_matches: 796,
      total_journeys: 1242,
      total_events: 87599,
      total_distance_km: 1024.5,
      date_range: 'Feb 10 – 14, 2026',
      maps: {},
      events_by_type: {},
    }),
    getOverviewStats: vi.fn().mockResolvedValue({
      total_matches: 796,
      total_journeys: 1242,
      total_events: 87599,
      total_distance_km: 1024.5,
      date_range: 'Feb 10 – 14, 2026',
      maps: {},
      events_by_type: {},
    }),
    getPlayers: vi.fn().mockResolvedValue([]),
    getEvents: vi.fn().mockResolvedValue([]),
    getMapHeatmaps: vi.fn().mockResolvedValue({
      map_id: 'AmbroseValley',
      grid_size: 64,
      coordinate_system: 'UV',
      row_orientation: 'N to S',
      col_orientation: 'W to E',
      layers: {
        human_traffic: { name: 'Human Traffic', total_points: 0, max_cell_count: 0, active_cells_count: 0, grid: [] },
      },
    }),
    getMinimapUrl: vi.fn().mockReturnValue('/test-minimap.webp'),
    getMapJourneys: vi.fn().mockResolvedValue([]),
  },
}));

describe('Frontend Code Splitting & Route Lazy Loading', () => {
  it('renders PageLoadingFallback correctly during chunk fetch', () => {
    render(<PageLoadingFallback />);
    expect(screen.getByText('Loading Module...')).toBeInTheDocument();
  });

  it('renders lazy-loaded root OverviewPage successfully', async () => {
    window.history.pushState({}, 'Overview', '/');
    render(<App />);

    await waitFor(() => {
      // Main navigation sidebar is immediately visible from MainLayout
      expect(screen.getByText('Player Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Combat Analysis')).toBeInTheDocument();
      expect(screen.getByText('Region Intelligence')).toBeInTheDocument();
    });
  }, 15000);

  it('preserves deep link URL query parameters when navigating directly to a lazy route', async () => {
    window.history.pushState({}, 'Combat', '/combat?map=GrandRift&category=BotKill');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Combat Telemetry Analysis')).toBeInTheDocument();
    }, { timeout: 8000 });

    // Verify URL parameters remain preserved
    expect(window.location.search).toContain('map=GrandRift');
    expect(window.location.search).toContain('category=BotKill');
  }, 15000);
});
