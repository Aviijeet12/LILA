import { describe, it, expect } from 'vitest';
import {
  gridCellToUVBounds,
  gridCellToWorldBounds,
  mapPixelToGridCell,
  gridCellToPixelBounds,
  normalizeIntensity,
  extractTopHotspots,
  calculateCoverage,
} from '../features/map-explorer/utils/heatmapMath';

describe('heatmapMath', () => {
  describe('gridCellToUVBounds', () => {
    it('maps cell [0, 0] to North-West corner', () => {
      const uv = gridCellToUVBounds(0, 0, 64);
      expect(uv.uMin).toBe(0.0);
      expect(uv.uMax).toBeCloseTo(1 / 64, 4);
      // Row 0 is North (v=1.0)
      expect(uv.vMax).toBe(1.0);
      expect(uv.vMin).toBeCloseTo(1.0 - 1 / 64, 4);
    });

    it('maps cell [63, 63] to South-East corner', () => {
      const uv = gridCellToUVBounds(63, 63, 64);
      expect(uv.uMin).toBeCloseTo(63 / 64, 4);
      expect(uv.uMax).toBe(1.0);
      // Row 63 is South (v=0.0)
      expect(uv.vMin).toBe(0.0);
      expect(uv.vMax).toBeCloseTo(1 / 64, 4);
    });

    it('clamps negative or out-of-bounds rows and columns', () => {
      const uvLow = gridCellToUVBounds(-10, -5, 64);
      expect(uvLow.uMin).toBe(0.0);
      expect(uvLow.vMax).toBe(1.0);

      const uvHigh = gridCellToUVBounds(100, 200, 64);
      expect(uvHigh.uMax).toBe(1.0);
      expect(uvHigh.vMin).toBe(0.0);
    });
  });

  describe('gridCellToWorldBounds', () => {
    it('calculates Ambrose Valley world coordinates accurately', () => {
      // Ambrose Valley: Scale = 900, OriginX = -370, OriginZ = -473
      const bounds = gridCellToWorldBounds(0, 0, 'AmbroseValley', 64);
      expect(bounds.xMin).toBe(-370.0);
      expect(bounds.xMax).toBeCloseTo(-370.0 + (900.0 / 64), 1);
      // North corner is OriginZ + Scale = -473 + 900 = 427
      expect(bounds.zMax).toBe(427.0);
      expect(bounds.zMin).toBeCloseTo(427.0 - (900.0 / 64), 1);
    });

    it('calculates Grand Rift world coordinates with scale 581 and origin -290', () => {
      const bounds = gridCellToWorldBounds(63, 63, 'GrandRift', 64);
      // East corner is -290 + 581 = 291
      expect(bounds.xMax).toBe(291.0);
      // South corner is -290
      expect(bounds.zMin).toBe(-290.0);
    });

    it('calculates Lockdown world coordinates with scale 1000 and origin -500', () => {
      const bounds = gridCellToWorldBounds(32, 32, 'Lockdown', 64);
      // Center cell should be around (0, 0)
      expect(bounds.xMin).toBeCloseTo(0.0, 0);
      expect(bounds.zMax).toBeCloseTo(0.0, 0);
      expect(bounds.zMin).toBeCloseTo(-15.63, 1);
    });
  });

  describe('mapPixelToGridCell', () => {
    it('maps top-left pixel to cell [0, 0]', () => {
      const cell = mapPixelToGridCell(0, 0, 2048, 2048, 64);
      expect(cell.row).toBe(0);
      expect(cell.col).toBe(0);
    });

    it('maps center pixel to center cell [32, 32]', () => {
      const cell = mapPixelToGridCell(1024, 1024, 2048, 2048, 64);
      expect(cell.row).toBe(32);
      expect(cell.col).toBe(32);
    });

    it('handles Grand Rift non-square height 2046', () => {
      const cell = mapPixelToGridCell(2047, 2045, 2048, 2046, 64);
      expect(cell.row).toBe(63);
      expect(cell.col).toBe(63);
    });

    it('clamps out-of-bounds pixel coordinates', () => {
      const cellNeg = mapPixelToGridCell(-100, -50, 2048, 2048, 64);
      expect(cellNeg.row).toBe(0);
      expect(cellNeg.col).toBe(0);

      const cellHigh = mapPixelToGridCell(5000, 5000, 2048, 2048, 64);
      expect(cellHigh.row).toBe(63);
      expect(cellHigh.col).toBe(63);
    });
  });

  describe('gridCellToPixelBounds', () => {
    it('derives correct pixel dimensions on a 2048x2048 canvas', () => {
      const pxBounds = gridCellToPixelBounds(10, 5, 2048, 2048, 64);
      expect(pxBounds.cellWidth).toBe(32);
      expect(pxBounds.cellHeight).toBe(32);
      expect(pxBounds.px).toBe(5 * 32);
      expect(pxBounds.py).toBe(10 * 32);
    });
  });

  describe('normalizeIntensity', () => {
    it('handles zero or negative counts', () => {
      expect(normalizeIntensity(0, 100)).toBe(0);
      expect(normalizeIntensity(-5, 100)).toBe(0);
    });

    it('handles zero or negative max counts', () => {
      expect(normalizeIntensity(50, 0)).toBe(0);
      expect(normalizeIntensity(50, -10)).toBe(0);
    });

    it('scales linearly when mode is linear', () => {
      expect(normalizeIntensity(50, 100, 'linear')).toBe(0.5);
      expect(normalizeIntensity(100, 100, 'linear')).toBe(1.0);
    });

    it('scales square-root when mode is sqrt', () => {
      expect(normalizeIntensity(25, 100, 'sqrt')).toBe(0.5);
      expect(normalizeIntensity(100, 100, 'sqrt')).toBe(1.0);
    });

    it('clamps counts exceeding maxCount to 1.0', () => {
      expect(normalizeIntensity(150, 100)).toBe(1.0);
    });
  });

  describe('extractTopHotspots', () => {
    it('correctly ranks and filters top hotspot cells', () => {
      const grid = Array.from({ length: 64 }, () => Array(64).fill(0));
      grid[10][15] = 450;
      grid[20][30] = 200;
      grid[5][5]   = 100;
      grid[40][50] = 50;

      const hotspots = extractTopHotspots(grid, 'AmbroseValley', 3, 64);
      expect(hotspots).toHaveLength(3);
      expect(hotspots[0].count).toBe(450);
      expect(hotspots[0].row).toBe(10);
      expect(hotspots[0].col).toBe(15);
      expect(hotspots[0].rank).toBe(1);

      expect(hotspots[1].count).toBe(200);
      expect(hotspots[1].rank).toBe(2);

      expect(hotspots[2].count).toBe(100);
      expect(hotspots[2].rank).toBe(3);
    });

    it('handles empty grid gracefully', () => {
      const emptyGrid = Array.from({ length: 64 }, () => Array(64).fill(0));
      const hotspots = extractTopHotspots(emptyGrid, 'AmbroseValley', 5, 64);
      expect(hotspots).toHaveLength(0);
    });
  });

  describe('calculateCoverage', () => {
    it('calculates coverage percentage and density accurately', () => {
      const grid = Array.from({ length: 64 }, () => Array(64).fill(0));
      grid[0][0] = 10;
      grid[0][1] = 20;
      grid[1][0] = 30;
      grid[1][1] = 40;

      const stats = calculateCoverage(grid, 64);
      expect(stats.totalCells).toBe(4096);
      expect(stats.activeCells).toBe(4);
      expect(stats.totalPoints).toBe(100);
      expect(stats.maxCellCount).toBe(40);
      expect(stats.meanActiveCount).toBe(25.0);
      expect(stats.coveragePercent).toBeCloseTo((4 / 4096) * 100, 2);
    });
  });
});
