import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insightEngine } from '../features/analyst/services/insightEngine';
import { dataService } from '../services/dataService';

// Mock dataService
vi.mock('../services/dataService', () => ({
  dataService: {
    getMapHeatmaps: vi.fn(),
    getEvents: vi.fn(),
  },
}));

function createMockGrid(size: number = 64, fillVal: number = 0): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row = new Array(size).fill(fillVal);
    grid.push(row);
  }
  return grid;
}

describe('Deterministic InsightEngine Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates human traffic hotspots with exact counts and world bounding boxes', async () => {
    const mockGrid = createMockGrid(64, 0);
    mockGrid[25][6] = 450;
    mockGrid[10][10] = 200;
    mockGrid[30][30] = 50;

    vi.mocked(dataService.getMapHeatmaps).mockResolvedValueOnce({
      map_id: 'AmbroseValley',
      grid_size: 64,
      coordinate_system: 'UV',
      row_orientation: 'N to S',
      col_orientation: 'W to E',
      layers: {
        human_traffic: {
          name: 'Human Traffic',
          total_points: 700,
          max_cell_count: 450,
          active_cells_count: 3,
          grid: mockGrid,
        },
      } as any,
    });

    const result = await insightEngine.getHumanTrafficHotspots('AmbroseValley', 3);

    expect(result.intent).toBe('human_traffic_hotspots');
    expect(result.mapId).toBe('AmbroseValley');
    expect(result.hotspots).toHaveLength(3);

    const top = result.hotspots![0];
    expect(top.rank).toBe(1);
    expect(top.row).toBe(25);
    expect(top.col).toBe(6);
    expect(top.count).toBe(450);
    expect(top.percentOfTotal).toBeCloseTo((450 / 700) * 100, 1);
    expect(top.worldBounds).toBeDefined();
    expect(top.uvBounds).toBeDefined();

    // Verify metrics
    const totalMetric = result.metrics.find((m) => m.label === 'Total Human Pings');
    expect(totalMetric?.rawCount).toBe(700);

    const activeMetric = result.metrics.find((m) => m.label === 'Active Sectors');
    expect(activeMetric?.rawCount).toBe(3);
    expect(activeMetric?.denominator).toContain('4,096');
  });

  it('compares map coverage across all 3 theaters using uniform 4,096 denominator', async () => {
    vi.mocked(dataService.getMapHeatmaps).mockImplementation(async (mapId: string) => {
      const active = mapId === 'AmbroseValley' ? 1556 : mapId === 'GrandRift' ? 981 : 1008;
      const points = mapId === 'AmbroseValley' ? 35429 : 5000;
      return {
        map_id: mapId as any,
        grid_size: 64,
        coordinate_system: 'UV',
        row_orientation: 'N to S',
        col_orientation: 'W to E',
        layers: {
          human_traffic: {
            name: 'Human Traffic',
            total_points: points,
            max_cell_count: 500,
            active_cells_count: active,
            grid: createMockGrid(64, 0),
          },
        } as any,
      };
    });

    const result = await insightEngine.getMapCoverageComparison();

    expect(result.intent).toBe('map_coverage_comparison');
    expect(result.conclusion).toContain('Ambrose Valley has the widest recorded human movement footprint');

    const ambroseMetric = result.metrics.find((m) => m.label.includes('Ambrose Valley Human Coverage'));
    expect(ambroseMetric?.value).toContain('37.99%');
    expect(ambroseMetric?.denominator).toBe('4,096 sectors');
  });

  it('tallies exact combat event counts and isolates storm death and loot records', async () => {
    vi.mocked(dataService.getEvents).mockResolvedValueOnce([
      { event: 'BotKill', ts: 100, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'BotKill', ts: 101, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'BotKilled', ts: 102, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'Kill', ts: 103, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'Killed', ts: 104, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'KilledByStorm', ts: 105, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'Loot', ts: 106, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
    ]);

    const result = await insightEngine.getCombatEventDistribution('AmbroseValley');

    expect(result.intent).toBe('combat_event_distribution');

    const botKill = result.metrics.find((m) => m.label.includes('BotKill Events'));
    expect(botKill?.rawCount).toBe(2);

    const botKilled = result.metrics.find((m) => m.label.includes('BotKilled Events'));
    expect(botKilled?.rawCount).toBe(1);

    const storm = result.metrics.find((m) => m.label.includes('Storm Death Events'));
    expect(storm?.rawCount).toBe(1);

    const loot = result.metrics.find((m) => m.label.includes('Loot Events'));
    expect(loot?.rawCount).toBe(1);
  });

  it('evaluates environmental storm death counts across maps', async () => {
    vi.mocked(dataService.getEvents).mockResolvedValueOnce([
      { event: 'KilledByStorm', ts: 100, x: 0, y: 0, z: 0, u: 0, v: 0, map_id: 'AmbroseValley' },
      { event: 'KilledByStorm', ts: 101, x: 0, y: 0, z: 0, u: 0, v: 0, map_id: 'AmbroseValley' },
      { event: 'KilledByStorm', ts: 102, x: 0, y: 0, z: 0, u: 0, v: 0, map_id: 'GrandRift' },
      { event: 'KilledByStorm', ts: 103, x: 0, y: 0, z: 0, u: 0, v: 0, map_id: 'Lockdown' },
    ]);

    const result = await insightEngine.getStormDeathsSummary();

    expect(result.intent).toBe('storm_deaths_summary');
    const totalMetric = result.metrics.find((m) => m.label.includes('Total Storm Deaths'));
    expect(totalMetric?.rawCount).toBe(4);

    const ambroseMetric = result.metrics.find((m) => m.label.includes('Ambrose Valley'));
    expect(ambroseMetric?.rawCount).toBe(2);
  });

  it('inspects individual sector [R25, C6] across all layers with world coordinates', async () => {
    const mockGrid = createMockGrid(64, 0);
    mockGrid[25][6] = 120;

    vi.mocked(dataService.getMapHeatmaps).mockResolvedValueOnce({
      map_id: 'AmbroseValley',
      grid_size: 64,
      coordinate_system: 'UV',
      row_orientation: 'N to S',
      col_orientation: 'W to E',
      layers: {
        human_traffic: { name: 'Human Traffic', total_points: 1000, max_cell_count: 120, active_cells_count: 1, grid: mockGrid },
        bot_traffic: { name: 'Bot Traffic', total_points: 500, max_cell_count: 0, active_cells_count: 0, grid: createMockGrid(64, 0) },
        loot: { name: 'Loot', total_points: 200, max_cell_count: 0, active_cells_count: 0, grid: createMockGrid(64, 0) },
        bot_kill: { name: 'BotKill', total_points: 50, max_cell_count: 0, active_cells_count: 0, grid: createMockGrid(64, 0) },
        bot_killed: { name: 'BotKilled', total_points: 30, max_cell_count: 0, active_cells_count: 0, grid: createMockGrid(64, 0) },
        killed_by_storm: { name: 'Storm', total_points: 5, max_cell_count: 0, active_cells_count: 0, grid: createMockGrid(64, 0) },
      } as any,
    });

    const result = await insightEngine.inspectSector('AmbroseValley', 25, 6);

    expect(result.intent).toBe('sector_comparison');
    expect(result.hotspots).toHaveLength(1);
    expect(result.hotspots![0].row).toBe(25);
    expect(result.hotspots![0].col).toBe(6);
    expect(result.hotspots![0].worldBounds).toBeDefined();
    expect(result.hotspots![0].uvBounds).toBeDefined();
  });

  it('rejects unsupported speculative queries with standard limitations and suggestions', () => {
    const result = insightEngine.getUnsupportedAnalysis('Who has the highest K/D ratio?');

    expect(result.intent).toBe('unsupported');
    expect(result.title).toContain('Beyond Supported Telemetry Scope');
    expect(result.limitations).toBeDefined();
    expect(result.followUpQuestions.length).toBeGreaterThan(0);
  });
});
