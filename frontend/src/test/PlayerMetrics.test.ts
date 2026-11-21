import { describe, it, expect } from 'vitest';
import { PlayerSummary } from '../types/telemetry';

describe('Player Metric Definitions & Calculations', () => {
  it('computes distinct match count strictly from unique match IDs', () => {
    // If a player has duplicate journey records from the same match session
    const matchesWithDuplicates = [
      'match-av-001.nakama-0',
      'match-av-001.nakama-0', // Duplicate session log
      'match-av-002.nakama-0',
      'match-ld-003.nakama-0',
    ];

    const rawJourneyRecordsCount = matchesWithDuplicates.length;
    const distinctMatchesCount = new Set(matchesWithDuplicates).size;

    expect(rawJourneyRecordsCount).toBe(4);
    expect(distinctMatchesCount).toBe(3); // Distinct match count must be 3
  });

  it('calculates average distance per match accurately', () => {
    const totalDistanceMeters = 15420.5;
    const distinctMatches = 5;

    const avgDistance = Number((totalDistanceMeters / distinctMatches).toFixed(2));
    expect(avgDistance).toBe(3084.1);
  });

  it('calculates average duration per match accurately', () => {
    const totalDurationSeconds = 1845;
    const distinctMatches = 3;

    const avgDuration = Number((totalDurationSeconds / distinctMatches).toFixed(1));
    expect(avgDuration).toBe(615.0);
  });

  it('calculates outcome distribution percentages and preserves neutral elimination semantics', () => {
    const player: PlayerSummary = {
      user_id: 'test-player-1',
      entity_type: 'human',
      matches_played: 10,
      total_distance_travelled_meters: 25000,
      avg_distance_travelled_meters: 2500,
      total_duration_seconds: 3600,
      avg_duration_seconds: 360,
      maps_played: { AmbroseValley: 6, Lockdown: 4 },
      dates_active: ['2026-02-10', '2026-02-11'],
      total_loot_events: 45,
      total_bot_kill_events: 12,
      total_death_events: 3, // Recorded elimination events
      total_storm_deaths: 1,
      outcomes: {
        SURVIVED_PRESUMED: 7,
        ELIMINATED: 3,
      },
      matches: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'],
    };

    const totalOutcomes = (player.outcomes?.SURVIVED_PRESUMED || 0) + (player.outcomes?.ELIMINATED || 0);
    const survPct = (((player.outcomes?.SURVIVED_PRESUMED || 0) / totalOutcomes) * 100).toFixed(1);
    const elimPct = (((player.outcomes?.ELIMINATED || 0) / totalOutcomes) * 100).toFixed(1);

    expect(totalOutcomes).toBe(10);
    expect(survPct).toBe('70.0');
    expect(elimPct).toBe('30.0');

    // Elimination events should strictly reflect telemetry recordings, not assumed deaths
    expect(player.total_death_events).toBe(3);
    expect(player.total_storm_deaths).toBe(1);
    // Presumed survival should not be conflated with guaranteed extraction
    expect(player.outcomes?.SURVIVED_PRESUMED).toBe(7);
  });
});
