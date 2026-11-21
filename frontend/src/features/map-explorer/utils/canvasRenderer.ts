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
 * Draw a single trajectory path, either static or progressive up to playbackTs.
 */
export function renderJourneyPath(
  ctx: CanvasRenderingContext2D,
  journey: Journey,
  mapWidth: number,
  mapHeight: number,
  isSelected: boolean,
  hasSelection: boolean,
  zoom: number,
  playbackTs?: number | null
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

  if (isSelected) {
    // Selected journey: prominent with glow
    ctx.shadowColor = isHuman ? 'rgba(0, 229, 255, 0.8)' : 'rgba(192, 132, 252, 0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = isHuman ? '#00E5FF' : '#C084FC';
    ctx.lineWidth = Math.max(2, 3.5 / zoom);
    ctx.globalAlpha = 1.0;
    if (!isHuman) {
      ctx.setLineDash([8 / zoom, 4 / zoom]);
    }
  } else if (hasSelection) {
    // Another journey is selected: subdued background style
    ctx.strokeStyle = isHuman ? '#00E5FF' : '#A855F7';
    ctx.lineWidth = Math.max(0.75, 1.0 / zoom);
    ctx.globalAlpha = 0.12;
    if (!isHuman) {
      ctx.setLineDash([4 / zoom, 4 / zoom]);
    }
  } else {
    // Standard normal style
    ctx.strokeStyle = isHuman ? '#00E5FF' : '#A855F7';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.globalAlpha = isHuman ? 0.35 : 0.45;
    if (!isHuman) {
      ctx.setLineDash([5 / zoom, 3 / zoom]);
    }
  }

  // Draw progressive or full path lines
  if (pts.length >= 2) {
    ctx.beginPath();
    const first = pts[0];
    ctx.moveTo(first.u * mapWidth, (1.0 - first.v) * mapHeight);

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineTo(p.u * mapWidth, (1.0 - p.v) * mapHeight);
    }
    ctx.stroke();
  }

  // If in playback mode, render current live player head marker
  if (playbackTs != null && headPoint) {
    renderPlayerHeadMarker(ctx, headPoint, isHuman, isSelected, mapWidth, mapHeight, zoom);
  }

  // Render endpoint landmarks
  if (isSelected) {
    const isEnded = playbackTs == null || playbackTs >= journey.end_ts;
    renderJourneyEndpoints(ctx, journey, mapWidth, mapHeight, zoom, isEnded);
  }

  ctx.restore();
}

/**
 * Renders the live player position marker at the head of a progressive journey.
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

  const baseR = isSelected ? 5.5 : 4.0;
  const r = Math.max(2.5, baseR / Math.pow(zoom, 0.25));

  ctx.save();

  // Outer pulse halo
  ctx.beginPath();
  ctx.arc(hx, hy, r * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = isHuman ? 'rgba(0, 229, 255, 0.25)' : 'rgba(192, 132, 252, 0.25)';
  ctx.fill();

  // Core dot
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fillStyle = isHuman ? '#00E5FF' : '#C084FC';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1, 1.5 / zoom);
  ctx.stroke();

  // Selected indicator ring
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(hx, hy, r * 2.4, 0, Math.PI * 2);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.setLineDash([3 / zoom, 2 / zoom]);
    ctx.stroke();
  }

  ctx.restore();
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

  const r = Math.max(3, 6 / Math.sqrt(zoom));

  // Spawn Point (First sample) - Emerald Green Ring
  const start = pts[0];
  const sx = start.u * mapWidth;
  const sy = (1.0 - start.v) * mapHeight;

  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#10B981';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5 / zoom;
  ctx.stroke();

  // Terminal Point (Last sample) - only show if the journey has reached its end
  if (isEnded) {
    const end = pts[pts.length - 1];
    const ex = end.u * mapWidth;
    const ey = (1.0 - end.v) * mapHeight;

    ctx.beginPath();
    if (journey.outcome === 'ELIMINATED') {
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / zoom;
      ctx.rect(ex - r, ey - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / zoom;
      ctx.moveTo(ex, ey - r);
      ctx.lineTo(ex + r, ey);
      ctx.lineTo(ex, ey + r);
      ctx.lineTo(ex - r, ey);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
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
