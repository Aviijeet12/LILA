import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HeatmapControls } from '../features/map-explorer/components/HeatmapControls';
import { SpatialCellDetailsPanel } from '../features/map-explorer/components/SpatialCellDetailsPanel';
import { SpatialAnalyticsModal } from '../features/map-explorer/components/SpatialAnalyticsModal';
import {
  HeatmapConfig,
  DEFAULT_HEATMAP_CONFIG,
  getOrCreateHeatmapRaster,
} from '../features/map-explorer/utils/heatmapRenderer';
import { MapHeatmaps } from '../types/telemetry';

const mockHeatmaps: MapHeatmaps = {
  map_id: 'AmbroseValley',
  grid_size: 64,
  coordinate_system: 'UV_normalized (0.0 to 1.0)',
  row_orientation: 'row 0 is North (v=1.0), row N-1 is South (v=0.0)',
  col_orientation: 'col 0 is West (u=0.0), col N-1 is East (u=1.0)',
  layers: {
    human_traffic: {
      name: 'human_traffic',
      total_points: 35429,
      max_cell_count: 476,
      active_cells_count: 1556,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
    bot_traffic: {
      name: 'bot_traffic',
      total_points: 13152,
      max_cell_count: 190,
      active_cells_count: 1302,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
    loot: {
      name: 'loot',
      total_points: 8988,
      max_cell_count: 325,
      active_cells_count: 573,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
    bot_kill: {
      name: 'bot_kill',
      total_points: 1774,
      max_cell_count: 25,
      active_cells_count: 489,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
    bot_killed: {
      name: 'bot_killed',
      total_points: 487,
      max_cell_count: 15,
      active_cells_count: 246,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
    killed_by_storm: {
      name: 'killed_by_storm',
      total_points: 17,
      max_cell_count: 1,
      active_cells_count: 17,
      grid: Array.from({ length: 64 }, () => Array(64).fill(0)),
    },
  },
};

// Seed sample cell points
mockHeatmaps.layers.human_traffic.grid[10][15] = 450;
mockHeatmaps.layers.loot.grid[10][15] = 300;
mockHeatmaps.layers.bot_kill.grid[10][15] = 20;

describe('HeatmapControls', () => {
  it('renders master toggle and opens analytics', () => {
    const onChangeConfig = vi.fn();
    const onOpenAnalytics = vi.fn();

    render(
      <HeatmapControls
        heatmaps={mockHeatmaps}
        config={DEFAULT_HEATMAP_CONFIG}
        onChangeConfig={onChangeConfig}
        onOpenAnalytics={onOpenAnalytics}
      />
    );

    expect(screen.getByText('Spatial Heatmap')).toBeDefined();
    expect(screen.getByText('Disabled')).toBeDefined();

    // Toggle master enable
    fireEvent.click(screen.getByText('Disabled'));
    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );

    // Open analytics modal
    fireEvent.click(screen.getByText('Analytics'));
    expect(onOpenAnalytics).toHaveBeenCalled();
  });

  it('renders layer options, opacity slider, and legend when active', () => {
    const activeConfig: HeatmapConfig = {
      ...DEFAULT_HEATMAP_CONFIG,
      enabled: true,
    };
    const onChangeConfig = vi.fn();

    render(
      <HeatmapControls
        heatmaps={mockHeatmaps}
        config={activeConfig}
        onChangeConfig={onChangeConfig}
        onOpenAnalytics={vi.fn()}
      />
    );

    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Human Traffic')).toBeDefined();
    expect(screen.getByText('Bot Traffic')).toBeDefined();
    expect(screen.getByText('Loot Events')).toBeDefined();

    // Toggle layer
    fireEvent.click(screen.getByText('Bot Traffic'));
    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        activeLayers: expect.objectContaining({ bot_traffic: true }),
      })
    );

    // Change render style
    fireEvent.click(screen.getByText('Thermal'));
    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ renderStyle: 'grid' })
    );

    // Change scale mode
    fireEvent.click(screen.getByText('Relative'));
    expect(onChangeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ normalizationMode: 'absolute' })
    );
  });
});

describe('SpatialCellDetailsPanel', () => {
  it('renders sector metrics and coordinates for selected cell', () => {
    const onClose = vi.fn();

    render(
      <SpatialCellDetailsPanel
        mapId="AmbroseValley"
        cell={{ row: 10, col: 15 }}
        heatmaps={mockHeatmaps}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Cell \[Row 10, Col 15\]/)).toBeDefined();
    expect(screen.getByText('World Bounding Box (m)')).toBeDefined();
    expect(screen.getByText('Normalized UV Bounds')).toBeDefined();

    // Check layer count readouts
    expect(screen.getByText('450')).toBeDefined(); // human traffic
    expect(screen.getByText('300')).toBeDefined(); // loot

    // Close button
    fireEvent.click(screen.getByTitle('Close cell inspection'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SpatialAnalyticsModal', () => {
  it('renders summary cards, coverage stats, and hotspot table', () => {
    const onClose = vi.fn();
    const onSelectCell = vi.fn();

    render(
      <SpatialAnalyticsModal
        mapId="AmbroseValley"
        heatmaps={mockHeatmaps}
        onClose={onClose}
        onSelectCell={onSelectCell}
      />
    );

    expect(screen.getByText('Spatial Intelligence & Telemetry Analytics')).toBeDefined();
    expect(screen.getByText('Spatial Coverage')).toBeDefined();
    expect(screen.getByText('Active Sector Average')).toBeDefined();

    // Top hotspot table should contain row for cell 10, 15
    expect(screen.getByText('Sector [10, 15]')).toBeDefined();
    expect(screen.getByText('#1')).toBeDefined();

    // Clicking hotspot cell triggers selection and closes modal
    fireEvent.click(screen.getByText('Sector [10, 15]'));
    expect(onSelectCell).toHaveBeenCalledWith({ row: 10, col: 15 });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('getOrCreateHeatmapRaster', () => {
  it('returns null when heatmaps is null or disabled', () => {
    expect(getOrCreateHeatmapRaster(null, DEFAULT_HEATMAP_CONFIG)).toBeNull();

    const disabledConfig: HeatmapConfig = { ...DEFAULT_HEATMAP_CONFIG, enabled: false };
    expect(getOrCreateHeatmapRaster(mockHeatmaps, disabledConfig)).toBeNull();
  });
});
