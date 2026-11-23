import { Journey, DiscreteEvent } from '../../../types/telemetry';
import { ActiveLayers } from '../../../stores/appStore';
import { getProgressivePositions, InterpolatedPoint } from './timelineMath';

export const EVENT_STYLES: Record<string, { label: string; color: string; shape: string }> = {
  Loot:          { label: 'Loot Events',        color: '#F59E0B', shape: 'diamond'  },
  BotKill:       { label: 'BotKill Events',     color: '#F43F5E', shape: 'triangle' },
  BotKilled:     { label: 'BotKilled Events',   color: '#DC2626', shape: 'cross'    },
  KilledByStorm: { label: 'Storm Death Events', color: '#6366F1', shape: 'ring'     },
  Kill:          { label: 'Kill Events',        color: '#F97316', shape: 'star'     },
  Killed:        { label: 'Killed Events',      color: '#BE185D', shape: 'square'   },
};

/**
 * Checks if a discrete event type is enabled in activeLayers.
 */
export function isEventLayerActive(eventName: string, layers: ActiveLayers): boolean {
  switch (eventName) {
    case 'Loot':          return layers.loot;
    case 'BotKill':       return layers.bot_kill;
    case 'BotKilled':     return layers.bot_killed;
    case 'KilledByStorm': return layers.killed_by_storm;
    case 'Kill':          return layers.kill;
    case 'Killed':        return layers.killed;
    default:              return true;
  }
}

/**
 * Draw rounded rectangle with cross-environment fallback.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Renders a distinct Human Operative Emote (Cyan Diamond / Visor Badge).
 */
export function renderHumanEmote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options?: { isSelected?: boolean; isHead?: boolean; zoom?: number }
): void {
  const isSelected = options?.isSelected ?? false;
  const isHead = options?.isHead ?? false;
  const zoom = options?.zoom ?? 1;

  ctx.save();

  // 1. Outer tactical radar ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? 'rgba(0, 217, 245, 0.35)' : 'rgba(0, 217, 245, 0.18)';
  ctx.fill();

  if (isSelected || isHead) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 2.1, 0, Math.PI * 2);
    ctx.strokeStyle = '#00D9F5';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.setLineDash([3 / zoom, 2 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Cyan Diamond Operative Badge (Rhombus shape)
  const d = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy - d);        // Top apex
  ctx.lineTo(cx + d, cy);        // Right apex
  ctx.lineTo(cx, cy + d);        // Bottom apex
  ctx.lineTo(cx - d, cy);        // Left apex
  ctx.closePath();

  ctx.fillStyle = '#090909';     // Dark neutral core
  ctx.fill();
  ctx.strokeStyle = '#00D9F5';   // Glowing Cyan perimeter
  ctx.lineWidth = Math.max(1.5, 2.0 / zoom);
  ctx.stroke();

  // 3. Humanoid Operative Helmet & Visor inside badge
  const headR = d * 0.28;
  const headY = cy - d * 0.22;

  // Helmet circle
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#00D9F5';
  ctx.fill();

  // Dark visor slit across operative helmet
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.85, headY);
  ctx.lineTo(cx + headR * 0.85, headY);
  ctx.strokeStyle = '#090909';
  ctx.lineWidth = Math.max(1, 1.8 / zoom);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Operative tactical shoulders (trapezoid / chevron)
  ctx.beginPath();
  ctx.moveTo(cx - d * 0.52, cy + d * 0.48);
  ctx.lineTo(cx - d * 0.25, cy + d * 0.12);
  ctx.lineTo(cx + d * 0.25, cy + d * 0.12);
  ctx.lineTo(cx + d * 0.52, cy + d * 0.48);
  ctx.closePath();
  ctx.fillStyle = '#00D9F5';
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a distinct Bot Mech Emote (Amber Robot Box with Antenna & Sensor Eyes).
 */
export function renderBotEmote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options?: { isSelected?: boolean; isHead?: boolean; zoom?: number }
): void {
  const isSelected = options?.isSelected ?? false;
  const isHead = options?.isHead ?? false;
  const zoom = options?.zoom ?? 1;

  ctx.save();

  // 1. Outer mech radar pulse halo
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? 'rgba(255, 159, 28, 0.35)' : 'rgba(255, 159, 28, 0.18)';
  ctx.fill();

  if (isSelected || isHead) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 2.1, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF9F1C';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.setLineDash([3 / zoom, 2 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Robot Antenna with Glowing Sensor Ball
  const antTop = cy - size * 0.95;
  const antBase = cy - size * 0.42;

  ctx.beginPath();
  ctx.moveTo(cx, antBase);
  ctx.lineTo(cx, antTop);
  ctx.strokeStyle = '#FF9F1C';
  ctx.lineWidth = Math.max(1.2, 1.6 / zoom);
  ctx.stroke();

  // Antenna sensor beacon bulb
  ctx.beginPath();
  ctx.arc(cx, antTop, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#EF4444'; // Red sensor beacon
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(0.8, 1.0 / zoom);
  ctx.stroke();

  // 3. Robot Head Chassis (Rounded Square Box)
  const boxW = size * 1.05;
  const boxH = size * 0.85;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH / 2 + size * 0.08;
  const radius = size * 0.18;

  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fillStyle = '#191919';     // Dark neutral core
  ctx.fill();
  ctx.strokeStyle = '#FF9F1C';   // Vibrant Amber perimeter
  ctx.lineWidth = Math.max(1.5, 2.0 / zoom);
  ctx.stroke();

  // Mini side bolt ears
  ctx.fillStyle = '#FF9F1C';
  ctx.fillRect(boxX - size * 0.08, boxY + boxH * 0.3, size * 0.08, boxH * 0.4);
  ctx.fillRect(boxX + boxW, boxY + boxH * 0.3, size * 0.08, boxH * 0.4);

  // 4. Dual Sensor Eyes [ · · ]
  const eyeR = size * 0.15;
  const eyeY = cy - size * 0.05;
  const eyeOffsetX = size * 0.24;

  // Left Eye
  ctx.beginPath();
  ctx.arc(cx - eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = '#00D9F5'; // Glowing sensor lens
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(0.7, 1.0 / zoom);
  ctx.stroke();

  // Right Eye
  ctx.beginPath();
  ctx.arc(cx + eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = '#00D9F5'; // Glowing sensor lens
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(0.7, 1.0 / zoom);
  ctx.stroke();

  // 5. Speaker / Audio Grill (Mouth slit)
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.25, cy + size * 0.24);
  ctx.lineTo(cx + size * 0.25, cy + size * 0.24);
  ctx.strokeStyle = '#FF9F1C';
  ctx.lineWidth = Math.max(1, 1.5 / zoom);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a single trajectory path, either static or progressive up to playbackTs.
 * Features high-contrast dark casing understrokes and vibrant human/bot distinction.
 */
export function renderJourneyPath(
  ctx: CanvasRenderingContext2D,
  journey: Journey,
  mapWidth: number,
  mapHeight: number,
  isSelected: boolean,
  hasSelection: boolean,
  zoom: number,
  playbackTs?: number | null,
  drawSpawnEmote: boolean = false
): void {
  // If in temporal playback mode, enforce timeline boundaries
  if (playbackTs != null) {
    if (playbackTs < journey.start_ts) {
      return; // Journey has not started yet
    }
  }

  const isHuman = journey.entity_type === 'human';

  // Extract points: either full trajectory or progressive up to playbackTs
  let pts: { u: number; v: number }[] = [];
  let headPoint: InterpolatedPoint | null = null;

  if (playbackTs != null) {
    const prog = getProgressivePositions(journey.positions, playbackTs);
    pts = prog.points;
    headPoint = prog.headPoint;
    if (pts.length === 0 && !headPoint) return;
  } else {
    pts = journey.positions;
    if (!pts || pts.length < 2) return;
  }

  ctx.save();

  // Draw progressive or full path lines
  if (pts.length >= 2) {
    // 1. Dark casing under-stroke to guarantee crisp contrast against any minimap terrain
    ctx.save();
    ctx.beginPath();
    const first = pts[0];
    ctx.moveTo(first.u * mapWidth, (1.0 - first.v) * mapHeight);

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineTo(p.u * mapWidth, (1.0 - p.v) * mapHeight);
    }

    ctx.strokeStyle = 'rgba(5, 10, 18, 0.85)';
    ctx.lineWidth = isSelected ? Math.max(3.5, 6.0 / zoom) : Math.max(2.2, 3.6 / zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.stroke();

    // 2. Main colored trajectory stroke
    if (isSelected) {
      // Selected journey: prominent with glow
      ctx.shadowColor = isHuman ? 'rgba(0, 217, 245, 0.95)' : 'rgba(255, 159, 28, 0.95)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = isHuman ? '#00D9F5' : '#FF9F1C';
      ctx.lineWidth = Math.max(2.5, 4.2 / zoom);
      ctx.globalAlpha = 1.0;
      if (!isHuman) {
        ctx.setLineDash([9 / zoom, 4.5 / zoom]);
      } else {
        ctx.setLineDash([]);
      }
    } else if (hasSelection) {
      // Another journey is selected: subdued background style
      ctx.strokeStyle = isHuman ? '#00D9F5' : '#FF9F1C';
      ctx.lineWidth = Math.max(1.0, 1.6 / zoom);
      ctx.globalAlpha = 0.25;
      if (!isHuman) {
        ctx.setLineDash([6 / zoom, 4 / zoom]);
      } else {
        ctx.setLineDash([]);
      }
    } else {
      // Standard normal style: high contrast, vivid and sharp
      ctx.strokeStyle = isHuman ? '#00D9F5' : '#FF9F1C';
      ctx.lineWidth = Math.max(1.8, 2.6 / zoom);
      ctx.globalAlpha = 0.90;
      if (!isHuman) {
        ctx.setLineDash([8 / zoom, 4 / zoom]);
      } else {
        ctx.setLineDash([]);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  // 3. Render spawn emote on static overview when requested
  if (drawSpawnEmote && !isSelected && pts.length > 0 && playbackTs == null) {
    const start = pts[0];
    const sx = start.u * mapWidth;
    const sy = (1.0 - start.v) * mapHeight;
    const baseSize = Math.max(3.5, 6.0 / Math.pow(zoom, 0.3));
    if (isHuman) {
      renderHumanEmote(ctx, sx, sy, baseSize, { zoom });
    } else {
      renderBotEmote(ctx, sx, sy, baseSize, { zoom });
    }
  }

  // 4. If in playback mode, render current live player head emote
  if (playbackTs != null && headPoint) {
    renderPlayerHeadMarker(ctx, headPoint, isHuman, isSelected, mapWidth, mapHeight, zoom);
  }

  // 5. Render endpoint landmarks when selected
  if (isSelected) {
    const isEnded = playbackTs == null || playbackTs >= journey.end_ts;
    renderJourneyEndpoints(ctx, journey, mapWidth, mapHeight, zoom, isEnded);
  }

  ctx.restore();
}

/**
 * Renders the live player position marker at the head of a progressive journey using custom emotes.
 */
function renderPlayerHeadMarker(
  ctx: CanvasRenderingContext2D,
  head: InterpolatedPoint,
  isHuman: boolean,
  isSelected: boolean,
  mapWidth: number,
  mapHeight: number,
  zoom: number
): void {
  const hx = head.u * mapWidth;
  const hy = (1.0 - head.v) * mapHeight;

  const baseSize = isSelected ? 8.5 : 6.5;
  const size = Math.max(4.5, baseSize / Math.pow(zoom, 0.25));

  if (isHuman) {
    renderHumanEmote(ctx, hx, hy, size, { isSelected, isHead: true, zoom });
  } else {
    renderBotEmote(ctx, hx, hy, size, { isSelected, isHead: true, zoom });
  }
}

/**
 * Draw spawn (start) and terminal (end) points for a journey.
 */
function renderJourneyEndpoints(
  ctx: CanvasRenderingContext2D,
  journey: Journey,
  mapWidth: number,
  mapHeight: number,
  zoom: number,
  isEnded: boolean
): void {
  const pts = journey.positions;
  if (!pts || pts.length === 0) return;

  const isHuman = journey.entity_type === 'human';
  const size = Math.max(5.5, 9.0 / Math.pow(zoom, 0.25));

  // Spawn Point (First sample) - Draw the entity emote!
  const start = pts[0];
  const sx = start.u * mapWidth;
  const sy = (1.0 - start.v) * mapHeight;

  if (isHuman) {
    renderHumanEmote(ctx, sx, sy, size, { isSelected: true, zoom });
  } else {
    renderBotEmote(ctx, sx, sy, size, { isSelected: true, zoom });
  }

  // Terminal Point (Last sample) - only show if the journey has reached its end
  if (isEnded) {
    const end = pts[pts.length - 1];
    const ex = end.u * mapWidth;
    const ey = (1.0 - end.v) * mapHeight;
    const r = Math.max(3.5, 7 / Math.sqrt(zoom));

    ctx.save();
    ctx.beginPath();
    if (journey.outcome === 'ELIMINATED') {
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8 / zoom;
      ctx.rect(ex - r, ey - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8 / zoom;
      ctx.moveTo(ex, ey - r * 1.2);
      ctx.lineTo(ex + r * 1.1, ey);
      ctx.lineTo(ex, ey + r * 1.2);
      ctx.lineTo(ex - r * 1.1, ey);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Draw a single discrete gameplay event marker.
 */
export function renderEventMarker(
  ctx: CanvasRenderingContext2D,
  event: DiscreteEvent,
  mapWidth: number,
  mapHeight: number,
  zoom: number,
  isHovered: boolean,
  isRecent: boolean = false
): void {
  if (event.u == null || event.v == null) return;

  const style = EVENT_STYLES[event.event] ?? { color: '#94A3B8', shape: 'circle' };
  const px = event.u * mapWidth;
  const py = (1.0 - event.v) * mapHeight;

  const baseR = isHovered ? 7 : isRecent ? 5.5 : 4;
  const r = Math.max(2, baseR / Math.pow(zoom, 0.3));

  ctx.save();
  ctx.fillStyle = style.color;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = (isHovered ? 2 : 1) / zoom;
  ctx.globalAlpha = isHovered ? 1.0 : 0.85;

  if (isHovered) {
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 8;
  }

  // Draw expanding pulse ring if event recently occurred
  if (isRecent) {
    ctx.beginPath();
    ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();
  }

  ctx.beginPath();
  switch (style.shape) {
    case 'diamond':
      ctx.moveTo(px, py - r * 1.3);
      ctx.lineTo(px + r * 1.3, py);
      ctx.lineTo(px, py + r * 1.3);
      ctx.lineTo(px - r * 1.3, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'triangle':
      ctx.moveTo(px, py - r * 1.4);
      ctx.lineTo(px + r * 1.2, py + r * 1.1);
      ctx.lineTo(px - r * 1.2, py + r * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'cross':
      const arm = r * 1.2;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(2, 2.5 / zoom);
      ctx.moveTo(px - arm, py - arm);
      ctx.lineTo(px + arm, py + arm);
      ctx.moveTo(px + arm, py - arm);
      ctx.lineTo(px - arm, py + arm);
      ctx.stroke();
      break;

    case 'ring':
      ctx.arc(px, py, r * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(1.5, 2.5 / zoom);
      ctx.stroke();
      break;

    case 'star':
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const sx = px + Math.cos(outerAngle) * (r * 1.4);
        const sy = py + Math.sin(outerAngle) * (r * 1.4);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'square':
    default:
      ctx.rect(px - r, py - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.restore();
}
