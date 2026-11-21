import { describe, it, expect } from 'vitest';
import {
  worldToMapPixel,
  mapPixelToWorld,
  screenToMapPixel,
  mapPixelToScreen,
  findNearbyEvent,
  findNearbyJourney,
  MAP_CONFIGS,
} from '../features/map-explorer/utils/spatialMath';
import {
  isEventLayerActive,
  EVENT_STYLES,
} from '../features/map-explorer/utils/canvasRenderer';
import { ActiveLayers } from '../stores/appStore';
import { DiscreteEvent, Journey } from '../types/telemetry';

describe('Spatial Math & Coordinate Projection', () => {
  const W = 2048;
  const H = 2048;

  describe('Ambrose Valley Coordinate Mapping', () => {
    it('projects world origin to bottom-left (u=0, v=0, py=H)', () => {
      const { px, py, u, v } = worldToMapPixel(-370, -473, 'AmbroseValley', W, H);
      expect(u).toBeCloseTo(0.0, 4);
      expect(v).toBeCloseTo(0.0, 4);
      expect(px).toBeCloseTo(0.0, 2);
      expect(py).toBeCloseTo(H, 2); // Inverted Y: v=0 -> py=H
    });

    it('projects opposite corner to top-right (u=1, v=1, py=0)', () => {
      const { px, py, u, v } = worldToMapPixel(530, 427, 'AmbroseValley', W, H);
      expect(u).toBeCloseTo(1.0, 4);
      expect(v).toBeCloseTo(1.0, 4);
      expect(px).toBeCloseTo(W, 2);
      expect(py).toBeCloseTo(0.0, 2); // Inverted Y: v=1 -> py=0
    });

    it('projects map center to exact midpoint (u=0.5, v=0.5)', () => {
      const { px, py, u, v } = worldToMapPixel(80, -23, 'AmbroseValley', W, H);
      expect(u).toBeCloseTo(0.5, 4);
      expect(v).toBeCloseTo(0.5, 4);
      expect(px).toBeCloseTo(W / 2, 2);
      expect(py).toBeCloseTo(H / 2, 2);
    });

    it('roundtrip preserves world coordinates accurately', () => {
      const testPoints = [
        { x: -100.5, z: 200.2 },
        { x: 300.0, z: -400.0 },
        { x: 0.0, z: 0.0 },
      ];
      for (const pt of testPoints) {
        const { px, py } = worldToMapPixel(pt.x, pt.z, 'AmbroseValley', W, H);
        const reconstructed = mapPixelToWorld(px, py, 'AmbroseValley', W, H);
        expect(reconstructed.x).toBeCloseTo(pt.x, 3);
        expect(reconstructed.z).toBeCloseTo(pt.z, 3);
      }
    });
  });

  describe('Grand Rift Non-Square Dimensions', () => {
    const GR_W = 2048;
    const GR_H = 2046;

    it('handles non-square dimensions independently', () => {
      const { px, py, u, v } = worldToMapPixel(-290, -290, 'GrandRift', GR_W, GR_H);
      expect(u).toBeCloseTo(0.0, 4);
      expect(v).toBeCloseTo(0.0, 4);
      expect(px).toBeCloseTo(0.0, 2);
      expect(py).toBeCloseTo(GR_H, 2);
    });

    it('roundtrip preserves non-square aspect ratio mapping', () => {
      const { px, py } = worldToMapPixel(100, -50, 'GrandRift', GR_W, GR_H);
      const rec = mapPixelToWorld(px, py, 'GrandRift', GR_W, GR_H);
      expect(rec.x).toBeCloseTo(100, 3);
      expect(rec.z).toBeCloseTo(-50, 3);
    });
  });

  describe('Screen to Map Zoom/Pan Transforms', () => {
    it('transforms screen coords at zoom=1 pan=(0,0)', () => {
      const { mapX, mapY } = screenToMapPixel(500, 400, 0, 0, 1);
      expect(mapX).toBe(500);
      expect(mapY).toBe(400);
    });

    it('transforms screen coords with pan and zoom', () => {
      const panX = 100;
      const panY = 50;
      const zoom = 2;
      const { mapX, mapY } = screenToMapPixel(300, 250, panX, panY, zoom);
      // (300 - 100) / 2 = 100
      // (250 - 50) / 2 = 100
      expect(mapX).toBe(100);
      expect(mapY).toBe(100);

      const screen = mapPixelToScreen(mapX, mapY, panX, panY, zoom);
      expect(screen.screenX).toBe(300);
      expect(screen.screenY).toBe(250);
    });
  });

  describe('Spatial Hit Testing', () => {
    const mockEvents: DiscreteEvent[] = [
      { event: 'Loot', ts: 1000, x: 0, y: 100, z: 0, u: 0.5, v: 0.5 },
      { event: 'BotKill', ts: 1020, x: 100, y: 100, z: 100, u: 0.8, v: 0.8 },
    ];

    it('finds nearby event within threshold', () => {
      // Event at u=0.5, v=0.5 -> mapX = 1024, mapY = 1024
      const found = findNearbyEvent(mockEvents, 1026, 1025, 2048, 2048, 10, 1);
      expect(found).not.toBeNull();
      expect(found?.event).toBe('Loot');
    });

    it('returns null when cursor is too far from any event', () => {
      const found = findNearbyEvent(mockEvents, 500, 500, 2048, 2048, 10, 1);
      expect(found).toBeNull();
    });
  });
});

describe('Layer Visibility & Visual Styles', () => {
  const defaultLayers: ActiveLayers = {
    human_trajectories: true,
    bot_trajectories: true,
    loot: true,
    bot_kill: true,
    bot_killed: true,
    killed_by_storm: true,
    kill: true,
    killed: true,
  };

  it('correctly reports layer active status', () => {
    expect(isEventLayerActive('Loot', defaultLayers)).toBe(true);
    expect(isEventLayerActive('BotKill', defaultLayers)).toBe(true);

    const mutedLayers: ActiveLayers = { ...defaultLayers, loot: false, killed_by_storm: false };
    expect(isEventLayerActive('Loot', mutedLayers)).toBe(false);
    expect(isEventLayerActive('KilledByStorm', mutedLayers)).toBe(false);
    expect(isEventLayerActive('BotKill', mutedLayers)).toBe(true);
  });

  it('defines distinct colors and shapes for all 6 discrete events', () => {
    const events = ['Loot', 'BotKill', 'BotKilled', 'KilledByStorm', 'Kill', 'Killed'];
    const colors = new Set();
    for (const ev of events) {
      expect(EVENT_STYLES[ev]).toBeDefined();
      expect(EVENT_STYLES[ev].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      colors.add(EVENT_STYLES[ev].color);
    }
    // All 6 colors must be unique
    expect(colors.size).toBe(6);
  });
});
