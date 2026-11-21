import { MapHeatmaps, HeatmapLayer } from '../../../types/telemetry';
import { normalizeIntensity } from './heatmapMath';

export type HeatmapLayerKey =
  | 'human_traffic'
  | 'bot_traffic'
  | 'loot'
  | 'bot_kill'
  | 'bot_killed'
  | 'killed_by_storm';

export interface HeatmapConfig {
  enabled: boolean;
  activeLayers: Record<HeatmapLayerKey, boolean>;
  opacity: number; // 0.1 to 1.0
  normalizationMode: 'relative' | 'absolute'; // relative = per-layer max, absolute = max across all layers
  renderStyle: 'smooth' | 'grid'; // smooth = thermal blur, grid = crisp 64x64 cell matrix
  colorMode: 'tactical_layer' | 'thermal_spectrum';
}

export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  enabled: false,
  activeLayers: {
    human_traffic: true,
    bot_traffic:   false,
    loot:          false,
    bot_kill:      false,
    bot_killed:    false,
    killed_by_storm: false,
  },
  opacity: 0.75,
  normalizationMode: 'relative',
  renderStyle: 'smooth',
  colorMode: 'tactical_layer',
};

export const LAYER_THEME_COLORS: Record<HeatmapLayerKey, { label: string; r: number; g: number; b: number; hex: string }> = {
  human_traffic:   { label: 'Human Traffic',     r: 0,   g: 229, b: 255, hex: '#00E5FF' },
  bot_traffic:     { label: 'Bot Traffic',       r: 168, g: 85,  b: 247, hex: '#A855F7' },
  loot:            { label: 'Loot Events',        r: 245, g: 158, b: 11,  hex: '#F59E0B' },
  bot_kill:        { label: 'BotKill Events',     r: 244, g: 63,  b: 94,  hex: '#F43F5E' },
  bot_killed:      { label: 'BotKilled Events',   r: 220, g: 38,  b: 38,  hex: '#DC2626' },
  killed_by_storm: { label: 'Storm Death Events', r: 99,  g: 102, b: 241, hex: '#6366F1' },
};

/**
 * Maps a normalized intensity value [0.0, 1.0] to a thermal spectrum RGBA color.
 * Navy -> Cyan -> Emerald -> Yellow -> Orange -> Red
 */
export function getThermalColor(intensity: number, alpha: number): [number, number, number, number] {
  if (intensity <= 0) return [0, 0, 0, 0];

  const t = Math.min(1.0, Math.max(0.0, intensity));
  let r = 0;
  let g = 0;
  let b = 0;

  if (t < 0.2) {
    // 0.0 - 0.2: Navy to Cyan
    const f = t / 0.2;
    r = Math.round(0 + f * 0);
    g = Math.round(50 + f * 179);
    b = Math.round(150 + f * 105);
  } else if (t < 0.4) {
    // 0.2 - 0.4: Cyan to Emerald Green
    const f = (t - 0.2) / 0.2;
    r = Math.round(0 + f * 16);
    g = Math.round(229 - f * 44);
    b = Math.round(255 - f * 126);
  } else if (t < 0.65) {
    // 0.4 - 0.65: Emerald Green to Yellow/Amber
    const f = (t - 0.4) / 0.25;
    r = Math.round(16 + f * 235);
    g = Math.round(185 + f * 35);
    b = Math.round(129 - f * 115);
  } else if (t < 0.85) {
    // 0.65 - 0.85: Yellow to Orange-Red
    const f = (t - 0.65) / 0.2;
    r = Math.round(251 - f * 7);
    g = Math.round(220 - f * 157);
    b = Math.round(14 - f * 14);
  } else {
    // 0.85 - 1.0: Orange-Red to Intense Crimson / White
    const f = (t - 0.85) / 0.15;
    r = Math.round(244 + f * 11);
    g = Math.round(63 + f * 80);
    b = Math.round(0 + f * 80);
  }

  // Alpha curve with minimum floor for faint activity
  const clampedAlpha = Math.round(Math.min(255, Math.max(0, (0.25 + t * 0.75) * alpha * 255)));
  return [r, g, b, clampedAlpha];
}

// Memory-efficient offscreen raster cache
const rasterCache = new Map<string, HTMLCanvasElement>();

/**
 * Builds or retrieves a cached offscreen HTMLCanvasElement containing the pre-rendered heatmap.
 */
export function getOrCreateHeatmapRaster(
  heatmaps: MapHeatmaps | null,
  config: HeatmapConfig
): HTMLCanvasElement | null {
  if (!heatmaps || !config.enabled) return null;

  const activeKeys = (Object.keys(config.activeLayers) as HeatmapLayerKey[]).filter(
    (k) => config.activeLayers[k] && heatmaps.layers[k]
  );
  if (activeKeys.length === 0) return null;

  // Build unique cache key
  const cacheKey = [
    heatmaps.map_id,
    activeKeys.sort().join('+'),
    config.opacity.toFixed(2),
    config.normalizationMode,
    config.colorMode,
  ].join('|');

  if (rasterCache.has(cacheKey)) {
    return rasterCache.get(cacheKey)!;
  }

  const gridSize = heatmaps.grid_size || 64;
  const offscreen = document.createElement('canvas');
  offscreen.width = gridSize;
  offscreen.height = gridSize;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(gridSize, gridSize);
  const data = imgData.data;

  // Determine global max if using absolute normalization
  let absoluteMax = 1;
  if (config.normalizationMode === 'absolute') {
    for (const key of activeKeys) {
      const layer = heatmaps.layers[key];
      if (layer && layer.max_cell_count > absoluteMax) {
        absoluteMax = layer.max_cell_count;
      }
    }
  }

  // Is single active layer
  const isSingle = activeKeys.length === 1;
  const singleTheme = isSingle ? LAYER_THEME_COLORS[activeKeys[0]] : null;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const pixelIdx = (r * gridSize + c) * 4;

      if (config.colorMode === 'thermal_spectrum' || !isSingle) {
        // Multi-layer or thermal spectrum mode: compute composite intensity
        let compositeIntensity = 0;

        for (const key of activeKeys) {
          const layer: HeatmapLayer | undefined = heatmaps.layers[key];
          if (!layer || !layer.grid[r]) continue;
          const count = layer.grid[r][c] || 0;
          if (count <= 0) continue;

          const maxVal = config.normalizationMode === 'absolute' ? absoluteMax : layer.max_cell_count;
          const intensity = normalizeIntensity(count, maxVal, 'sqrt');
          compositeIntensity += intensity;
        }

        compositeIntensity = Math.min(1.0, compositeIntensity);

        if (compositeIntensity > 0) {
          const [red, green, blue, alphaVal] = getThermalColor(compositeIntensity, config.opacity);
          data[pixelIdx]     = red;
          data[pixelIdx + 1] = green;
          data[pixelIdx + 2] = blue;
          data[pixelIdx + 3] = alphaVal;
        }
      } else if (singleTheme) {
        // Single active layer with tactical dedicated color ramp
        const layer = heatmaps.layers[activeKeys[0]];
        const count = layer?.grid[r]?.[c] || 0;

        if (count > 0) {
          const maxVal = config.normalizationMode === 'absolute' ? absoluteMax : layer.max_cell_count;
          const intensity = normalizeIntensity(count, maxVal, 'sqrt');
          const alphaVal = Math.round(Math.min(255, (0.3 + intensity * 0.7) * config.opacity * 255));

          data[pixelIdx]     = singleTheme.r;
          data[pixelIdx + 1] = singleTheme.g;
          data[pixelIdx + 2] = singleTheme.b;
          data[pixelIdx + 3] = alphaVal;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  rasterCache.set(cacheKey, offscreen);

  // Evict older entries if cache grows past 20 items
  if (rasterCache.size > 20) {
    const firstKey = rasterCache.keys().next().value;
    if (firstKey) rasterCache.delete(firstKey);
  }

  return offscreen;
}

/**
 * Draws the tactical highlight bounding box around a specific hovered or selected cell.
 */
export function drawCellHighlight(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  mapWidth: number,
  mapHeight: number,
  gridSize: number = 64,
  isSelected: boolean = false
): void {
  const cellW = mapWidth / gridSize;
  const cellH = mapHeight / gridSize;
  const x = col * cellW;
  const y = row * cellH;

  ctx.save();

  if (isSelected) {
    // Selected Cell: Glowing amber / golden box with prominent tactical corner brackets
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.fillRect(x, y, cellW, cellH);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, cellW, cellH);

    // Corner brackets
    const bLen = Math.min(cellW, cellH) * 0.3;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FBBF24';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + bLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + bLen, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + cellW - bLen, y);
    ctx.lineTo(x + cellW, y);
    ctx.lineTo(x + cellW, y + bLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + cellH - bLen);
    ctx.lineTo(x, y + cellH);
    ctx.lineTo(x + bLen, y + cellH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + cellW - bLen, y + cellH);
    ctx.lineTo(x + cellW, y + cellH);
    ctx.lineTo(x + cellW, y + cellH - bLen);
    ctx.stroke();
  } else {
    // Hovered Cell: Crisp cyan boundary outline
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.fillRect(x, y, cellW, cellH);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, cellW, cellH);
  }

  ctx.restore();
}
