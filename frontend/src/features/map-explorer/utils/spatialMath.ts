import { MapId, DiscreteEvent, Journey, PositionSample } from '../../../types/telemetry';

export interface MapBoundsConfig {
  scale: number;
  originX: number;
  originZ: number;
}

export const MAP_CONFIGS: Record<MapId, MapBoundsConfig> = {
  AmbroseValley: { scale: 900.0, originX: -370.0, originZ: -473.0 },
  GrandRift:     { scale: 581.0, originX: -290.0, originZ: -290.0 },
  Lockdown:      { scale: 1000.0, originX: -500.0, originZ: -500.0 },
};

/**
 * Projects world coordinates (x, z) to image pixel coordinates.
 * Vertical axis is inverted: (1.0 - v) * height because world +Z is North (up),
 * but screen pixel Y increases downwards.
 */
export function worldToMapPixel(
  x: number,
  z: number,
  mapId: MapId,
  width: number,
  height: number
): { px: number; py: number; u: number; v: number } {
  const cfg = MAP_CONFIGS[mapId] ?? MAP_CONFIGS.AmbroseValley;
  const u = (x - cfg.originX) / cfg.scale;
  const v = (z - cfg.originZ) / cfg.scale;
  const px = u * width;
  const py = (1.0 - v) * height;
  return { px, py, u, v };
}

/**
 * Reconstructs world coordinates (x, z) from image pixel coordinates.
 */
export function mapPixelToWorld(
  px: number,
  py: number,
  mapId: MapId,
  width: number,
  height: number
): { x: number; z: number; u: number; v: number } {
  const cfg = MAP_CONFIGS[mapId] ?? MAP_CONFIGS.AmbroseValley;
  const u = px / width;
  const v = 1.0 - (py / height);
  const x = cfg.originX + u * cfg.scale;
  const z = cfg.originZ + v * cfg.scale;
  return { x, z, u, v };
}

/**
 * Converts screen/canvas client coordinates to map pixel coordinates based on pan & zoom.
 */
export function screenToMapPixel(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number
): { mapX: number; mapY: number } {
  return {
    mapX: (screenX - panX) / zoom,
    mapY: (screenY - panY) / zoom,
  };
}

/**
 * Converts map pixel coordinates to screen/canvas client coordinates based on pan & zoom.
 */
export function mapPixelToScreen(
  mapX: number,
  mapY: number,
  panX: number,
  panY: number,
  zoom: number
): { screenX: number; screenY: number } {
  return {
    screenX: mapX * zoom + panX,
    screenY: mapY * zoom + panY,
  };
}

/**
 * Distance squared between two 2D points.
 */
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

/**
 * Distance squared from point (px, py) to line segment (x1, y1) - (x2, y2).
 */
export function distToSegmentSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) return distSq(px, py, x1, y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return distSq(px, py, projX, projY);
}

/**
 * Find nearest discrete event within screen-space tolerance (e.g., 10px).
 */
export function findNearbyEvent(
  events: DiscreteEvent[],
  mapX: number,
  mapY: number,
  mapWidth: number,
  mapHeight: number,
  thresholdPixels: number,
  zoom: number
): DiscreteEvent | null {
  const mapThreshold = thresholdPixels / zoom;
  const threshSq = mapThreshold * mapThreshold;

  let closest: DiscreteEvent | null = null;
  let minD2 = threshSq;

  for (const ev of events) {
    if (ev.u == null || ev.v == null) continue;
    const ex = ev.u * mapWidth;
    const ey = (1.0 - ev.v) * mapHeight;
    const d2 = distSq(mapX, mapY, ex, ey);
    if (d2 < minD2) {
      minD2 = d2;
      closest = ev;
    }
  }

  return closest;
}

/**
 * Find nearest journey within screen-space tolerance.
 */
export function findNearbyJourney(
  journeys: Journey[],
  mapX: number,
  mapY: number,
  mapWidth: number,
  mapHeight: number,
  thresholdPixels: number,
  zoom: number
): { journey: Journey; nearestPoint: PositionSample } | null {
  const mapThreshold = thresholdPixels / zoom;
  const threshSq = mapThreshold * mapThreshold;

  let closestJourney: Journey | null = null;
  let closestPoint: PositionSample | null = null;
  let minD2 = threshSq;

  for (const j of journeys) {
    const pts = j.positions;
    if (!pts || pts.length === 0) continue;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = p.u * mapWidth;
      const py = (1.0 - p.v) * mapHeight;

      if (i > 0) {
        const prev = pts[i - 1];
        const prevX = prev.u * mapWidth;
        const prevY = (1.0 - prev.v) * mapHeight;
        const segD2 = distToSegmentSq(mapX, mapY, prevX, prevY, px, py);
        if (segD2 < minD2) {
          minD2 = segD2;
          closestJourney = j;
          closestPoint = p;
        }
      } else {
        const d2 = distSq(mapX, mapY, px, py);
        if (d2 < minD2) {
          minD2 = d2;
          closestJourney = j;
          closestPoint = p;
        }
      }
    }
  }

  if (closestJourney && closestPoint) {
    return { journey: closestJourney, nearestPoint: closestPoint };
  }
  return null;
}
