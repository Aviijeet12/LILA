import { Journey, PositionSample, MatchSummary, DiscreteEvent } from '../../../types/telemetry';

export interface TimelineRange {
  minTs: number;
  maxTs: number;
  durationSeconds: number;
}

export interface InterpolatedPoint {
  u: number;
  v: number;
  x: number;
  z: number;
  ts: number;
}

/**
 * Computes the temporal boundaries (minTs, maxTs, durationSeconds) for visible journeys or match.
 */
export function computeTimelineRange(
  journeys: Journey[],
  selectedMatch?: MatchSummary | null
): TimelineRange {
  if (selectedMatch && selectedMatch.start_ts && selectedMatch.end_ts) {
    const minTs = selectedMatch.start_ts;
    const maxTs = Math.max(minTs, selectedMatch.end_ts);
    const durationSeconds = Math.max(1, maxTs - minTs);
    return { minTs, maxTs, durationSeconds };
  }

  if (!journeys || journeys.length === 0) {
    return { minTs: 0, maxTs: 0, durationSeconds: 0 };
  }

  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const j of journeys) {
    if (typeof j.start_ts === 'number' && j.start_ts < minTs) minTs = j.start_ts;
    if (typeof j.end_ts === 'number' && j.end_ts > maxTs) maxTs = j.end_ts;
    // Also guard against unpopulated start_ts/end_ts by inspecting positions
    if (j.positions && j.positions.length > 0) {
      const firstTs = j.positions[0].ts;
      const lastTs = j.positions[j.positions.length - 1].ts;
      if (firstTs < minTs) minTs = firstTs;
      if (lastTs > maxTs) maxTs = lastTs;
    }
  }

  if (minTs === Infinity || maxTs === -Infinity) {
    return { minTs: 0, maxTs: 0, durationSeconds: 0 };
  }

  const durationSeconds = Math.max(1, maxTs - minTs);
  return { minTs, maxTs, durationSeconds };
}

/**
 * Converts a playback timestamp into a progress percentage [0, 100].
 */
export function timestampToProgress(ts: number, minTs: number, maxTs: number): number {
  if (maxTs <= minTs) return 100;
  const progress = ((ts - minTs) / (maxTs - minTs)) * 100;
  return Math.max(0, Math.min(100, progress));
}

/**
 * Converts a progress percentage [0, 100] into a playback timestamp.
 */
export function progressToTimestamp(progress: number, minTs: number, maxTs: number): number {
  if (maxTs <= minTs) return minTs;
  const ratio = Math.max(0, Math.min(100, progress)) / 100;
  return Math.round(minTs + ratio * (maxTs - minTs));
}

/**
 * Formats a duration in seconds into 'mm:ss'.
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats a Unix epoch timestamp (seconds) into UTC time string 'HH:MM:SS'.
 */
export function formatTimestampUTC(ts: number): string {
  if (!ts || isNaN(ts)) return '--:--:--';
  const d = new Date(ts * 1000);
  return d.toISOString().slice(11, 19) + ' UTC';
}

/**
 * Computes an interpolated position sample for a journey at currentTs.
 */
export function interpolatePosition(
  positions: PositionSample[],
  currentTs: number
): InterpolatedPoint | null {
  if (!positions || positions.length === 0) return null;

  if (positions.length === 1 || currentTs <= positions[0].ts) {
    const p = positions[0];
    return { u: p.u, v: p.v, x: p.x, z: p.z, ts: p.ts };
  }

  const last = positions[positions.length - 1];
  if (currentTs >= last.ts) {
    return { u: last.u, v: last.v, x: last.x, z: last.z, ts: last.ts };
  }

  // Binary search or linear search for adjacent samples
  for (let i = 0; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    if (p1.ts <= currentTs && currentTs <= p2.ts) {
      if (p2.ts === p1.ts) {
        return { u: p1.u, v: p1.v, x: p1.x, z: p1.z, ts: currentTs };
      }
      const t = (currentTs - p1.ts) / (p2.ts - p1.ts);
      return {
        u: p1.u + t * (p2.u - p1.u),
        v: p1.v + t * (p2.v - p1.v),
        x: p1.x + t * (p2.x - p1.x),
        z: p1.z + t * (p2.z - p1.z),
        ts: currentTs,
      };
    }
  }

  return { u: last.u, v: last.v, x: last.x, z: last.z, ts: last.ts };
}

/**
 * Filters position samples up to currentTs and appends the interpolated head position.
 */
export function getProgressivePositions(
  positions: PositionSample[],
  currentTs: number
): { points: { u: number; v: number }[]; headPoint: InterpolatedPoint | null } {
  if (!positions || positions.length === 0 || currentTs < positions[0].ts) {
    return { points: [], headPoint: null };
  }

  const points: { u: number; v: number }[] = [];
  for (const p of positions) {
    if (p.ts <= currentTs) {
      points.push({ u: p.u, v: p.v });
    } else {
      break;
    }
  }

  const head = interpolatePosition(positions, currentTs);
  if (head && points.length > 0) {
    // If the interpolated point is slightly ahead of the last recorded point, append it
    const lastPoint = points[points.length - 1];
    if (Math.abs(lastPoint.u - head.u) > 0.0001 || Math.abs(lastPoint.v - head.v) > 0.0001) {
      points.push({ u: head.u, v: head.v });
    }
  }

  return { points, headPoint: head };
}
