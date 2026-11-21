import { describe, it, expect } from 'vitest';
import {
  computeTimelineRange,
  timestampToProgress,
  progressToTimestamp,
  formatDuration,
  interpolatePosition,
  getProgressivePositions,
} from '../features/map-explorer/utils/timelineMath';
import { Journey, PositionSample, MatchSummary } from '../types/telemetry';

describe('Timeline Math Utilities', () => {
  const samplePositions: PositionSample[] = [
    { ts: 1000, x: -100, y: 10, z: -200, u: 0.1, v: 0.2 },
    { ts: 1010, x: -50,  y: 10, z: -150, u: 0.2, v: 0.4 },
    { ts: 1030, x: 0,    y: 10, z: -100, u: 0.4, v: 0.6 },
  ];

  const mockJourneys: Journey[] = [
    {
      journey_id: 'j1',
      user_id: 'u1',
      match_id: 'm1',
      map_id: 'AmbroseValley',
      date: '2026-02-10',
      entity_type: 'human',
      start_ts: 1000,
      end_ts: 1030,
      duration_seconds: 30,
      distance_travelled_meters: 150,
      starting_position: { x: -100, y: 10, z: -200, u: 0.1, v: 0.2 },
      ending_position: { x: 0, y: 10, z: -100, u: 0.4, v: 0.6 },
      terminal_event: 'BotPosition',
      outcome: 'SURVIVED_PRESUMED',
      event_counts: {},
      positions_count: 3,
      discrete_events_count: 0,
      positions: samplePositions,
      events: [],
    },
    {
      journey_id: 'j2',
      user_id: 'u2',
      match_id: 'm1',
      map_id: 'AmbroseValley',
      date: '2026-02-10',
      entity_type: 'bot',
      start_ts: 1005,
      end_ts: 1045,
      duration_seconds: 40,
      distance_travelled_meters: 200,
      starting_position: { x: 50, y: 10, z: 50, u: 0.5, v: 0.5 },
      ending_position: { x: 100, y: 10, z: 100, u: 0.6, v: 0.6 },
      terminal_event: 'BotKilled',
      outcome: 'ELIMINATED',
      event_counts: {},
      positions_count: 2,
      discrete_events_count: 0,
      positions: [
        { ts: 1005, x: 50, y: 10, z: 50, u: 0.5, v: 0.5 },
        { ts: 1045, x: 100, y: 10, z: 100, u: 0.6, v: 0.6 },
      ],
      events: [],
    },
  ];

  describe('computeTimelineRange', () => {
    it('returns zeroes for empty journey array', () => {
      const res = computeTimelineRange([]);
      expect(res).toEqual({ minTs: 0, maxTs: 0, durationSeconds: 0 });
    });

    it('derives bounds from multiple journeys with different start/end times', () => {
      const res = computeTimelineRange(mockJourneys);
      expect(res.minTs).toBe(1000);
      expect(res.maxTs).toBe(1045);
      expect(res.durationSeconds).toBe(45);
    });

    it('overrides journey boundaries when selectedMatch is provided', () => {
      const match: MatchSummary = {
        match_id: 'm1',
        map_id: 'AmbroseValley',
        date: '2026-02-10',
        start_ts: 900,
        end_ts: 1100,
        duration_seconds: 200,
        human_count: 1,
        bot_count: 1,
        total_participants: 2,
        total_events: 10,
        movement_samples: 5,
        discrete_events: 5,
        eliminated_count: 1,
        survived_presumed_count: 1,
        total_loot_events: 2,
        total_bot_kills: 1,
        total_deaths: 1,
        total_distance_travelled_meters: 350,
        participants: [],
      };
      const res = computeTimelineRange(mockJourneys, match);
      expect(res.minTs).toBe(900);
      expect(res.maxTs).toBe(1100);
      expect(res.durationSeconds).toBe(200);
    });

    it('handles single-timestamp journeys gracefully without zero division', () => {
      const singleJourney: Journey = {
        ...mockJourneys[0],
        start_ts: 1000,
        end_ts: 1000,
        positions: [{ ts: 1000, x: 0, y: 0, z: 0, u: 0.5, v: 0.5 }],
      };
      const res = computeTimelineRange([singleJourney]);
      expect(res.minTs).toBe(1000);
      expect(res.maxTs).toBe(1000);
      expect(res.durationSeconds).toBe(1); // Guarded to at least 1s
    });
  });

  describe('timestampToProgress & progressToTimestamp', () => {
    const minTs = 1000;
    const maxTs = 1100; // 100s duration

    it('converts timestamp to progress percentage accurately', () => {
      expect(timestampToProgress(1000, minTs, maxTs)).toBe(0);
      expect(timestampToProgress(1050, minTs, maxTs)).toBe(50);
      expect(timestampToProgress(1100, minTs, maxTs)).toBe(100);
    });

    it('clamps progress to [0, 100]', () => {
      expect(timestampToProgress(900, minTs, maxTs)).toBe(0);
      expect(timestampToProgress(1200, minTs, maxTs)).toBe(100);
    });

    it('converts progress to timestamp accurately', () => {
      expect(progressToTimestamp(0, minTs, maxTs)).toBe(1000);
      expect(progressToTimestamp(50, minTs, maxTs)).toBe(1050);
      expect(progressToTimestamp(100, minTs, maxTs)).toBe(1100);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into mm:ss string', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(45)).toBe('00:45');
      expect(formatDuration(754)).toBe('12:34');
      expect(formatDuration(3600)).toBe('60:00');
    });
  });

  describe('interpolatePosition', () => {
    it('returns null for empty positions', () => {
      expect(interpolatePosition([], 1000)).toBeNull();
    });

    it('returns first position if currentTs <= first sample', () => {
      const pt = interpolatePosition(samplePositions, 950);
      expect(pt?.u).toBe(0.1);
      expect(pt?.v).toBe(0.2);
    });

    it('returns last position if currentTs >= last sample', () => {
      const pt = interpolatePosition(samplePositions, 1050);
      expect(pt?.u).toBe(0.4);
      expect(pt?.v).toBe(0.6);
    });

    it('interpolates linearly between adjacent samples', () => {
      // samplePositions[0] is at ts=1000 (u=0.1, v=0.2, x=-100)
      // samplePositions[1] is at ts=1010 (u=0.2, v=0.4, x=-50)
      // At ts=1005 (halfway): u=0.15, v=0.3, x=-75
      const pt = interpolatePosition(samplePositions, 1005);
      expect(pt?.u).toBeCloseTo(0.15, 4);
      expect(pt?.v).toBeCloseTo(0.3, 4);
      expect(pt?.x).toBeCloseTo(-75, 1);
    });
  });

  describe('getProgressivePositions', () => {
    it('returns empty points when currentTs < start_ts', () => {
      const res = getProgressivePositions(samplePositions, 900);
      expect(res.points).toHaveLength(0);
      expect(res.headPoint).toBeNull();
    });

    it('returns points up to currentTs and includes interpolated headPoint', () => {
      // At ts=1005: 1 recorded point (ts=1000) + 1 interpolated headPoint
      const res = getProgressivePositions(samplePositions, 1005);
      expect(res.points.length).toBeGreaterThanOrEqual(1);
      expect(res.headPoint).not.toBeNull();
      expect(res.headPoint?.u).toBeCloseTo(0.15, 4);
    });

    it('returns all points when currentTs >= maxTs', () => {
      const res = getProgressivePositions(samplePositions, 1050);
      expect(res.points.length).toBe(3);
    });
  });
});
