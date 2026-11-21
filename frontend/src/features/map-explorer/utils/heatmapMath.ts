import { MapId } from '../../../types/telemetry';
import { MAP_CONFIGS } from './spatialMath';

export interface UVBounds {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

export interface WorldBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export interface PixelBounds {
  px: number;
  py: number;
  cellWidth: number;
  cellHeight: number;
}

export interface HotspotCell {
  row: number;
  col: number;
  count: number;
  rank: number;
  worldBounds: WorldBounds;
  uvBounds: UVBounds;
}

export interface GridCoverageStats {
  activeCells: number;
  totalCells: number;
  coveragePercent: number;
  totalPoints: number;
  maxCellCount: number;
  meanActiveCount: number;
}

/**
 * Converts a grid cell (row, col) in a 64x64 matrix to normalized UV bounds [0.0, 1.0].
 * Row 0 is North (v=1.0), row 63 is South (v=0.0).
 * Col 0 is West (u=0.0), col 63 is East (u=1.0).
 */
export function gridCellToUVBounds(
  row: number,
  col: number,
  gridSize: number = 64
): UVBounds {
  const r = Math.min(gridSize - 1, Math.max(0, Math.floor(row)));
  const c = Math.min(gridSize - 1, Math.max(0, Math.floor(col)));

  const uMin = c / gridSize;
  const uMax = (c + 1) / gridSize;
  const vMin = 1.0 - (r + 1) / gridSize;
  const vMax = 1.0 - r / gridSize;

  return { uMin, uMax, vMin, vMax };
}

/**
 * Converts a grid cell (row, col) to in-game 3D world coordinates (x, z) bounding box in meters.
 */
export function gridCellToWorldBounds(
  row: number,
  col: number,
  mapId: MapId,
  gridSize: number = 64
): WorldBounds {
  const cfg = MAP_CONFIGS[mapId] ?? MAP_CONFIGS.AmbroseValley;
  const { uMin, uMax, vMin, vMax } = gridCellToUVBounds(row, col, gridSize);

  return {
    xMin: Number((cfg.originX + uMin * cfg.scale).toFixed(2)),
    xMax: Number((cfg.originX + uMax * cfg.scale).toFixed(2)),
    zMin: Number((cfg.originZ + vMin * cfg.scale).toFixed(2)),
    zMax: Number((cfg.originZ + vMax * cfg.scale).toFixed(2)),
  };
}

/**
 * Converts map pixel coordinates (px, py) to the corresponding grid cell (row, col).
 * Output clamped to [0, gridSize - 1].
 */
export function mapPixelToGridCell(
  px: number,
  py: number,
  width: number,
  height: number,
  gridSize: number = 64
): { row: number; col: number } {
  if (width <= 0 || height <= 0) return { row: 0, col: 0 };
  const col = Math.min(gridSize - 1, Math.max(0, Math.floor((px / width) * gridSize)));
  const row = Math.min(gridSize - 1, Math.max(0, Math.floor((py / height) * gridSize)));
  return { row, col };
}

/**
 * Converts a grid cell to pixel bounding box for drawing on the minimap Canvas.
 */
export function gridCellToPixelBounds(
  row: number,
  col: number,
  width: number,
  height: number,
  gridSize: number = 64
): PixelBounds {
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;
  return {
    px: col * cellWidth,
    py: row * cellHeight,
    cellWidth,
    cellHeight,
  };
}

/**
 * Normalizes a raw cell count against the maximum count.
 * Returns value in [0.0, 1.0].
 */
export function normalizeIntensity(
  count: number,
  maxCount: number,
  mode: 'linear' | 'sqrt' = 'linear'
): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = Math.min(1.0, count / maxCount);
  return mode === 'sqrt' ? Math.sqrt(ratio) : ratio;
}

/**
 * Extracts top N highest-activity cells from a 2D grid matrix.
 */
export function extractTopHotspots(
  grid: number[][],
  mapId: MapId,
  topN: number = 10,
  gridSize: number = 64
): HotspotCell[] {
  const cells: { row: number; col: number; count: number }[] = [];

  for (let r = 0; r < grid.length && r < gridSize; r++) {
    const rowData = grid[r];
    for (let c = 0; c < rowData.length && c < gridSize; c++) {
      const count = rowData[c];
      if (count > 0) {
        cells.push({ row: r, col: c, count });
      }
    }
  }

  cells.sort((a, b) => b.count - a.count);
  const top = cells.slice(0, topN);

  return top.map((item, idx) => ({
    row: item.row,
    col: item.col,
    count: item.count,
    rank: idx + 1,
    worldBounds: gridCellToWorldBounds(item.row, item.col, mapId, gridSize),
    uvBounds: gridCellToUVBounds(item.row, item.col, gridSize),
  }));
}

/**
 * Calculates spatial density and coverage statistics across a 2D grid.
 */
export function calculateCoverage(
  grid: number[][],
  gridSize: number = 64
): GridCoverageStats {
  const totalCells = gridSize * gridSize;
  let activeCells = 0;
  let totalPoints = 0;
  let maxCellCount = 0;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const val = grid[r][c];
      if (val > 0) {
        activeCells++;
        totalPoints += val;
        if (val > maxCellCount) maxCellCount = val;
      }
    }
  }

  const coveragePercent = totalCells > 0 ? (activeCells / totalCells) * 100 : 0;
  const meanActiveCount = activeCells > 0 ? totalPoints / activeCells : 0;

  return {
    activeCells,
    totalCells,
    coveragePercent: Number(coveragePercent.toFixed(2)),
    totalPoints,
    maxCellCount,
    meanActiveCount: Number(meanActiveCount.toFixed(1)),
  };
}
