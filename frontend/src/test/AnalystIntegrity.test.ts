import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { insightEngine } from '../features/analyst/services/insightEngine';
import { SecureServerLlmAdapter, DeterministicInsightExplainer } from '../features/analyst/services/llmAdapter';
import { dataService } from '../services/dataService';
import { DiscreteEvent, MapId } from '../types/telemetry';

describe('Phase 8.1 â€” Analyst Integrity & Grounding Audit', () => {
  // Load real processed files from disk for definitive ground-truth verification
  const eventsFilePath = path.resolve(__dirname, '../../../data/processed/events/events.json');
  const rawEventsData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf-8'));
  const allEvents: DiscreteEvent[] = rawEventsData.events;

  const heatmapsByMap: Record<MapId, any> = {
    AmbroseValley: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data/processed/maps/AmbroseValley/heatmaps.json'), 'utf-8')),
    GrandRift: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data/processed/maps/GrandRift/heatmaps.json'), 'utf-8')),
    Lockdown: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data/processed/maps/Lockdown/heatmaps.json'), 'utf-8')),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Reconciled Storm Death Distribution', () => {
    it('verifies exact KilledByStorm counts in events.json: Ambrose=17, GrandRift=5, Lockdown=17, Total=39', () => {
      const stormEvents = allEvents.filter((e) => e.event === 'KilledByStorm');
      expect(stormEvents).toHaveLength(39);

      const counts: Record<string, number> = {};
      for (const e of stormEvents) {
        counts[e.map_id] = (counts[e.map_id] || 0) + 1;
      }

      expect(counts['AmbroseValley']).toBe(17);
      expect(counts['GrandRift']).toBe(5);
      expect(counts['Lockdown']).toBe(17);
      expect(Object.keys(counts)).toHaveLength(3);
    });

    it('verifies KilledByStorm heatmap layer points exactly match discrete event counts per map', () => {
      expect(heatmapsByMap.AmbroseValley.layers.killed_by_storm.total_points).toBe(17);
      expect(heatmapsByMap.GrandRift.layers.killed_by_storm.total_points).toBe(5);
      expect(heatmapsByMap.Lockdown.layers.killed_by_storm.total_points).toBe(17);

      const totalHeatmapStorm =
        heatmapsByMap.AmbroseValley.layers.killed_by_storm.total_points +
        heatmapsByMap.GrandRift.layers.killed_by_storm.total_points +
        heatmapsByMap.Lockdown.layers.killed_by_storm.total_points;

      expect(totalHeatmapStorm).toBe(39);
    });

    it('verifies insightEngine.getStormDeathsSummary returns exact reconciled counts', async () => {
      vi.spyOn(dataService, 'getEvents').mockResolvedValue(allEvents);

      const result = await insightEngine.getStormDeathsSummary();

      expect(result.intent).toBe('storm_deaths_summary');
      const totalMetric = result.metrics.find((m) => m.label.includes('Total Storm Deaths'));
      const ambroseMetric = result.metrics.find((m) => m.label.includes('Ambrose Valley'));
      const grandRiftMetric = result.metrics.find((m) => m.label.includes('Grand Rift'));
      const lockdownMetric = result.metrics.find((m) => m.label.includes('Lockdown'));

      expect(totalMetric?.rawCount).toBe(39);
      expect(ambroseMetric?.rawCount).toBe(17);
      expect(grandRiftMetric?.rawCount).toBe(5);
      expect(lockdownMetric?.rawCount).toBe(17);

      expect(result.conclusion).toContain('exactly 39 KilledByStorm events');
      expect(result.conclusion).toContain('Ambrose Valley (17)');
      expect(result.conclusion).toContain('Grand Rift (5)');
      expect(result.conclusion).toContain('Lockdown (17)');
    });
  });

  describe('2. Comprehensive Combat and Telemetry Aggregation Consistency', () => {
    it('verifies exact category counts across all 14,750 discrete events', () => {
      expect(allEvents).toHaveLength(14750);

      const categoryCounts: Record<string, number> = {};
      for (const e of allEvents) {
        categoryCounts[e.event] = (categoryCounts[e.event] || 0) + 1;
      }

      expect(categoryCounts['BotKill']).toBe(2376);
      expect(categoryCounts['BotKilled']).toBe(697);
      expect(categoryCounts['Kill']).toBe(3);
      expect(categoryCounts['Killed']).toBe(3);
      expect(categoryCounts['KilledByStorm']).toBe(39);
      expect(categoryCounts['Loot']).toBe(11632);

      const sum = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
      expect(sum).toBe(14750);
    });

    it('verifies Analyst combat event distribution matches raw events and Combat Analysis page logic', async () => {
      vi.spyOn(dataService, 'getEvents').mockResolvedValue(allEvents);

      const resultAll = await insightEngine.getCombatEventDistribution('all');

      const botKillMetric = resultAll.metrics.find((m) => m.label === 'BotKill Events');
      const botKilledMetric = resultAll.metrics.find((m) => m.label === 'BotKilled Events');
      const killMetric = resultAll.metrics.find((m) => m.label === 'Kill Events');
      const killedMetric = resultAll.metrics.find((m) => m.label === 'Killed Events');
      const stormMetric = resultAll.metrics.find((m) => m.label.includes('Storm Death Events'));
      const lootMetric = resultAll.metrics.find((m) => m.label.includes('Loot Events'));

      expect(botKillMetric?.rawCount).toBe(2376);
      expect(botKilledMetric?.rawCount).toBe(697);
      expect(killMetric?.rawCount).toBe(3);
      expect(killedMetric?.rawCount).toBe(3);
      expect(stormMetric?.rawCount).toBe(39);
      expect(lootMetric?.rawCount).toBe(11632);

      // Verify per-map breakdown for Ambrose Valley
      const resultAV = await insightEngine.getCombatEventDistribution('AmbroseValley');
      expect(resultAV.metrics.find((m) => m.label === 'BotKill Events')?.rawCount).toBe(1772);
      expect(resultAV.metrics.find((m) => m.label === 'BotKilled Events')?.rawCount).toBe(485);
      expect(resultAV.metrics.find((m) => m.label === 'Kill Events')?.rawCount).toBe(2);
      expect(resultAV.metrics.find((m) => m.label === 'Killed Events')?.rawCount).toBe(2);
      expect(resultAV.metrics.find((m) => m.label.includes('Storm Death Events'))?.rawCount).toBe(17);
      expect(resultAV.metrics.find((m) => m.label.includes('Loot Events'))?.rawCount).toBe(8988);
    });

    it('validates relationship between heatmap layer totals and discrete event categories', () => {
      // Heatmap loot layer matches events.json Loot 1:1
      const totalHeatmapLoot =
        heatmapsByMap.AmbroseValley.layers.loot.total_points +
        heatmapsByMap.GrandRift.layers.loot.total_points +
        heatmapsByMap.Lockdown.layers.loot.total_points;
      expect(totalHeatmapLoot).toBe(11632);

      // Heatmap bot_kill layer combines BotKill (2376) + Kill (3) = 2379 points
      const totalHeatmapBotKill =
        heatmapsByMap.AmbroseValley.layers.bot_kill.total_points +
        heatmapsByMap.GrandRift.layers.bot_kill.total_points +
        heatmapsByMap.Lockdown.layers.bot_kill.total_points;
      expect(totalHeatmapBotKill).toBe(2379);
      expect(totalHeatmapBotKill).toBe(2376 + 3);

      // Heatmap bot_killed layer combines BotKilled (697) + Killed (3) = 700 points
      const totalHeatmapBotKilled =
        heatmapsByMap.AmbroseValley.layers.bot_killed.total_points +
        heatmapsByMap.GrandRift.layers.bot_killed.total_points +
        heatmapsByMap.Lockdown.layers.bot_killed.total_points;
      expect(totalHeatmapBotKilled).toBe(700);
      expect(totalHeatmapBotKilled).toBe(697 + 3);
    });
  });

  describe('3. Map ID Integrity & Defensive Robustness', () => {
    it('verifies zero missing, null, or unexpected map IDs in events.json', () => {
      const validMapIds = new Set(['AmbroseValley', 'GrandRift', 'Lockdown']);
      let invalidCount = 0;

      for (const e of allEvents) {
        if (!e.map_id || !validMapIds.has(e.map_id)) {
          invalidCount++;
        }
      }

      expect(invalidCount).toBe(0);
    });

    it('verifies zero duplicate event records in events.json', () => {
      const recordSet = new Set<string>();
      let duplicateRecords = 0;

      for (const e of allEvents) {
        const key = JSON.stringify(e);
        if (recordSet.has(key)) {
          duplicateRecords++;
        }
        recordSet.add(key);
      }

      expect(duplicateRecords).toBe(0);
    });

    it('safely handles synthetic unmapped storm events without crashing or dropping counts', async () => {
      const syntheticEvents: DiscreteEvent[] = [
        ...allEvents,
        {
          event: 'KilledByStorm',
          match_id: 'm-unknown-1',
          user_id: 'entity-unknown',
          entity_type: 'human',
          map_id: 'UnknownZone' as any,
          date: '2026-02-12',
          ts: 1770890000,
          iso: '2026-02-12T10:00:00.000Z',
          x: 0,
          y: 0,
          z: 0,
          u: 0.5,
          v: 0.5,
        },
      ];

      vi.spyOn(dataService, 'getEvents').mockResolvedValue(syntheticEvents);

      const result = await insightEngine.getStormDeathsSummary();
      const totalMetric = result.metrics.find((m) => m.label.includes('Total Storm Deaths'));
      const unmappedMetric = result.metrics.find((m) => m.label.includes('Unmapped Map ID'));

      expect(totalMetric?.rawCount).toBe(40);
      expect(unmappedMetric?.rawCount).toBe(1);
    });
  });

  describe('4. Grounding Protection & LLM Adapter Fallback', () => {
    it('ensures DeterministicInsightExplainer preserves conclusion and reports no external API availability', async () => {
      const explainer = new DeterministicInsightExplainer();
      expect(explainer.isExternalAvailable()).toBe(false);

      const mockResult: any = {
        intent: 'storm_deaths_summary',
        conclusion: 'Deterministic conclusion with 39 storm deaths.',
        metrics: [{ label: 'Storm Deaths', value: '39', rawCount: 39 }],
      };

      const explanation = await explainer.generateExplanation(mockResult);
      expect(explanation).toBe(mockResult.conclusion);
    });

    it('ensures SecureServerLlmAdapter falls back gracefully if endpoint is unset or unreachable', async () => {
      const adapter = new SecureServerLlmAdapter();
      // In test environment, VITE_ANALYST_API_URL is undefined
      expect(adapter.isExternalAvailable()).toBe(false);

      const mockResult: any = {
        intent: 'storm_deaths_summary',
        conclusion: 'Deterministic baseline conclusion.',
        metrics: [{ label: 'Storm Deaths', value: '39', rawCount: 39 }],
      };

      const output = await adapter.generateExplanation(mockResult);
      expect(output).toBe('Deterministic baseline conclusion.');
    });

    it('ensures network failure in SecureServerLlmAdapter falls back gracefully without throwing', async () => {
      // Force external availability to true by stubbing private or mocking fetch
      const adapter = new SecureServerLlmAdapter();
      (adapter as any).endpointUrl = 'https://mock-analyst-proxy.example.com/api/v1/explain';
      expect(adapter.isExternalAvailable()).toBe(true);

      // Simulate network error
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection refused'));

      const mockResult: any = {
        intent: 'storm_deaths_summary',
        conclusion: 'Deterministic baseline conclusion under network failure.',
        metrics: [{ label: 'Storm Deaths', value: '39', rawCount: 39 }],
      };

      const output = await adapter.generateExplanation(mockResult);
      expect(output).toBe('Deterministic baseline conclusion under network failure.');
    });
  });
});
