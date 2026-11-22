import { describe, it, expect } from 'vitest';
import {
  classifyQuery,
  extractMap,
  extractSector,
  extractCategory,
} from '../features/analyst/services/queryClassifier';

describe('QueryClassifier Unit Tests', () => {
  describe('Parameter Extraction', () => {
    it('extracts map names correctly', () => {
      expect(extractMap('Show me Ambrose Valley movement')).toBe('AmbroseValley');
      expect(extractMap('Where is Grand Rift loot?')).toBe('GrandRift');
      expect(extractMap('Lockdown island storm deaths')).toBe('Lockdown');
      expect(extractMap('Random inquiry without map', 'GrandRift')).toBe('GrandRift');
    });

    it('extracts sector coordinates in various formats', () => {
      expect(extractSector('Inspect sector [25, 6]')).toEqual({ row: 25, col: 6 });
      expect(extractSector('Check sector [r14, c28]')).toEqual({ row: 14, col: 28 });
      expect(extractSector('What happened at row 40, col 12?')).toEqual({ row: 40, col: 12 });
      expect(extractSector('cell 10 5')).toEqual({ row: 10, col: 5 });
      expect(extractSector('General movement inquiry')).toBeNull();
    });

    it('extracts event categories correctly', () => {
      expect(extractCategory('Show BotKill hotspots')).toBe('BotKill');
      expect(extractCategory('Where are botkilled events?')).toBe('BotKilled');
      expect(extractCategory('How many storm deaths?')).toBe('KilledByStorm');
      expect(extractCategory('Loot cache analysis')).toBe('Loot');
      expect(extractCategory('Movement traffic analysis')).toBeUndefined();
    });
  });

  describe('Intent Classification', () => {
    it('classifies human movement hotspot queries', () => {
      const q = classifyQuery('Which areas have the highest human movement activity?');
      expect(q.intent).toBe('human_traffic_hotspots');
      expect(q.confidence).toBe('medium');
    });

    it('classifies human vs bot traffic comparison queries', () => {
      const q = classifyQuery('How does human traffic compare with bot traffic?');
      expect(q.intent).toBe('human_vs_bot_traffic');
      expect(q.confidence).toBe('high');
    });

    it('classifies map coverage comparison queries', () => {
      const q = classifyQuery('Which map has the widest recorded human movement footprint?');
      expect(q.intent).toBe('map_coverage_comparison');
      expect(q.filters.mapId).toBe('all');
    });

    it('classifies combat event distribution queries', () => {
      const q = classifyQuery('Where are BotKill events most concentrated?');
      expect(q.intent).toBe('combat_event_distribution');
    });

    it('classifies storm deaths queries', () => {
      const q = classifyQuery('How many storm-related death events were recorded on each map?');
      expect(q.intent).toBe('storm_deaths_summary');
      expect(q.filters.category).toBe('KilledByStorm');
    });

    it('classifies loot hotspot queries', () => {
      const q = classifyQuery('Which regions have the highest recorded Loot event counts?');
      expect(q.intent).toBe('loot_hotspots');
    });

    it('classifies loot vs human traffic overlap queries', () => {
      const q = classifyQuery('How does loot activity overlap with human traffic hotspots?');
      expect(q.intent).toBe('loot_vs_human_traffic');
    });

    it('classifies multi-layer activity queries', () => {
      const q = classifyQuery('Which sectors have the highest activity across multiple telemetry layers?');
      expect(q.intent).toBe('cross_layer_activity');
    });

    it('classifies direct sector inspection queries', () => {
      const q = classifyQuery('Tell me about sector [25, 6] on Grand Rift');
      expect(q.intent).toBe('sector_comparison');
      expect(q.filters.row).toBe(25);
      expect(q.filters.col).toBe(6);
      expect(q.filters.mapId).toBe('GrandRift');
    });

    it('rejection of unsupported speculative questions (K/D, weapons, cheaters, skill)', () => {
      expect(classifyQuery('Who has the best K/D ratio?').intent).toBe('unsupported');
      expect(classifyQuery('What is the best weapon tier in the game?').intent).toBe('unsupported');
      expect(classifyQuery('Which player is a camper?').intent).toBe('unsupported');
      expect(classifyQuery('Tell me about player strategy and intentions').intent).toBe('unsupported');
    });

    it('classifies dataset overview inquiries', () => {
      expect(classifyQuery('How many total matches are in the dataset?').intent).toBe('dataset_overview');
      expect(classifyQuery('Give me an overview of the dataset').intent).toBe('dataset_overview');
      expect(classifyQuery('How many players and bots?').intent).toBe('dataset_overview');
    });

    it('classifies analytical findings inquiries', () => {
      expect(classifyQuery('What are the core analytical insights from the dataset?').intent).toBe('analytical_insights');
      const f1 = classifyQuery('Why does Ambrose Valley have so much activity? (Finding 1)');
      expect(f1.intent).toBe('analytical_insights');
      expect(f1.filters.findingId).toBe(1);
    });

    it('classifies coordinate system and scale inquiries', () => {
      const q = classifyQuery('How does the affine coordinate mapping work for Ambrose Valley?');
      expect(q.intent).toBe('coordinate_system');
      expect(q.filters.mapId).toBe('AmbroseValley');
    });

    it('classifies temporal analysis inquiries', () => {
      const q = classifyQuery('What was the activity on Feb 10, 2026?');
      expect(q.intent).toBe('temporal_analysis');
      expect(q.filters.date).toBe('2026-02-10');
    });

    it('classifies player intelligence inquiries', () => {
      expect(classifyQuery('Who are the top active human players by distance?').intent).toBe('player_intelligence');
      const p = classifyQuery('Tell me about player 94d042cb-a0f2-45f3-bdca-42fab73cfef5');
      expect(p.intent).toBe('player_intelligence');
      expect(p.filters.userId).toBe('94d042cb-a0f2-45f3-bdca-42fab73cfef5');
    });

    it('classifies map intelligence inquiries', () => {
      const q = classifyQuery('Tell me about Ambrose Valley');
      expect(q.intent).toBe('map_intelligence');
      expect(q.filters.mapId).toBe('AmbroseValley');
    });
  });
});
