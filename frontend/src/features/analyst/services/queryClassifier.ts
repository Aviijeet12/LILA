import { MapId } from '../../../types/telemetry';
import { AnalystIntent, AnalyticalFilter } from '../types/analyst';

export interface ClassifiedQuery {
  intent: AnalystIntent;
  filters: AnalyticalFilter;
  confidence: 'high' | 'medium' | 'low';
  rawQuery: string;
}

/**
 * Extracts map identifier from query text.
 */
export function extractMap(query: string, defaultMap?: MapId): MapId {
  const q = query.toLowerCase();
  if (q.includes('grand rift') || q.includes('grandrift') || q.includes('rift')) {
    return 'GrandRift';
  }
  if (q.includes('lockdown')) {
    return 'Lockdown';
  }
  if (q.includes('ambrose valley') || q.includes('ambrosevalley') || q.includes('ambrose')) {
    return 'AmbroseValley';
  }
  return defaultMap || 'AmbroseValley';
}

/**
 * Extracts sector coordinates (row, col) from query text.
 */
export function extractSector(query: string): { row: number; col: number } | null {
  // Matches "sector [25, 6]", "sector [r25, c6]", "row 25, col 6", "cell 25, 6"
  const bracketMatch = query.match(/(?:sector|cell)\s*\[\s*r?(\d+)\s*,\s*c?(\d+)\s*\]/i);
  if (bracketMatch) {
    return { row: parseInt(bracketMatch[1], 10), col: parseInt(bracketMatch[2], 10) };
  }

  const rowColMatch = query.match(/row\s*(\d+)[\s,]+col\s*(\d+)/i);
  if (rowColMatch) {
    return { row: parseInt(rowColMatch[1], 10), col: parseInt(rowColMatch[2], 10) };
  }

  const cellMatch = query.match(/(?:sector|cell)\s+(\d+)[\s,]+(\d+)/i);
  if (cellMatch) {
    return { row: parseInt(cellMatch[1], 10), col: parseInt(cellMatch[2], 10) };
  }

  return null;
}

/**
 * Extracts event category filter from query text.
 */
export function extractCategory(query: string): string | undefined {
  const q = query.toLowerCase();
  if (q.includes('botkilled')) return 'BotKilled';
  if (q.includes('botkill') || q.includes('bot kill')) return 'BotKill';
  if (q.includes('storm') || q.includes('killedbystorm')) return 'KilledByStorm';
  if (q.includes('loot')) return 'Loot';
  if (q.includes('kill')) return 'Kill';
  if (q.includes('killed')) return 'Killed';
  return undefined;
}

/**
 * Classifies a user query string into a supported intent and extracts parameters.
 */
export function classifyQuery(query: string, currentMap?: MapId): ClassifiedQuery {
  const trimmed = query.trim();
  const q = trimmed.toLowerCase();

  const sector = extractSector(trimmed);
  const targetMap = extractMap(trimmed, currentMap);
  const category = extractCategory(trimmed);

  // 1. Sector Inspection / Comparison
  if (sector) {
    return {
      intent: 'sector_comparison',
      filters: { mapId: targetMap, row: sector.row, col: sector.col },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 2. Unsupported Inquiries (weapon stats, KD ratio, player skill, cheating, causality)
  if (
    q.includes('k/d') ||
    q.includes('kd ratio') ||
    q.includes('who is the best') ||
    q.includes('best player') ||
    q.includes('weapon') ||
    q.includes('gun') ||
    q.includes('damage') ||
    q.includes('ammo') ||
    q.includes('health') ||
    q.includes('cheater') ||
    q.includes('camper') ||
    q.includes('intent') ||
    q.includes('strategy')
  ) {
    return {
      intent: 'unsupported',
      filters: {},
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 3. Map Coverage Comparison
  if (
    q.includes('widest') ||
    q.includes('footprint') ||
    q.includes('coverage comparison') ||
    (q.includes('compare') && (q.includes('map') || q.includes('theaters'))) ||
    q.includes('widest recorded human')
  ) {
    return {
      intent: 'map_coverage_comparison',
      filters: { mapId: 'all' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 4. Storm Deaths Summary
  if (
    q.includes('storm') &&
    (q.includes('death') || q.includes('how many') || q.includes('fatalities') || q.includes('killedbystorm'))
  ) {
    return {
      intent: 'storm_deaths_summary',
      filters: { category: 'KilledByStorm' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 5. Loot vs Human Traffic Overlap
  if (
    q.includes('loot') &&
    (q.includes('overlap') || q.includes('human traffic') || q.includes('co-locate') || q.includes('corridor'))
  ) {
    return {
      intent: 'loot_vs_human_traffic',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 6. Human vs Bot Traffic Comparison
  if (
    (q.includes('human') && q.includes('bot') && (q.includes('compare') || q.includes('differ') || q.includes('ratio') || q.includes('versus') || q.includes('vs'))) ||
    (q.includes('high human') && q.includes('low bot'))
  ) {
    return {
      intent: 'human_vs_bot_traffic',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 7. Multi-Layer / Cross-Layer Activity
  if (
    q.includes('multiple telemetry layers') ||
    q.includes('multi-layer') ||
    q.includes('cross-layer') ||
    q.includes('different event categories') ||
    q.includes('multiple layers') ||
    q.includes('density hubs')
  ) {
    return {
      intent: 'cross_layer_activity',
      filters: { mapId: targetMap, topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 8. Bot Traffic Hotspots
  if (
    (q.includes('bot traffic') || q.includes('bot movement') || q.includes('bot waypoint') || q.includes('bot hotspots')) &&
    !q.includes('botkill')
  ) {
    return {
      intent: 'bot_traffic_hotspots',
      filters: { mapId: targetMap, entityType: 'bot', topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 9. Combat Distribution / BotKill Concentration
  if (
    q.includes('botkill') ||
    q.includes('botkilled') ||
    q.includes('combat') ||
    q.includes('elimination') ||
    (q.includes('concentrated') && (q.includes('kill') || q.includes('combat')))
  ) {
    return {
      intent: 'combat_event_distribution',
      filters: { mapId: targetMap, category: category || 'all_combat' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 10. Loot Hotspots
  if (q.includes('loot') || q.includes('pickups') || q.includes('resource caches')) {
    return {
      intent: 'loot_hotspots',
      filters: { mapId: targetMap, category: 'Loot', topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 11. Human Traffic Hotspots (Default Movement Intent)
  if (
    q.includes('movement') ||
    q.includes('traffic') ||
    q.includes('areas have the highest') ||
    q.includes('human') ||
    q.includes('hotspots')
  ) {
    return {
      intent: 'human_traffic_hotspots',
      filters: { mapId: targetMap, entityType: 'human', topN: 5 },
      confidence: 'medium',
      rawQuery: trimmed,
    };
  }

  // Unclassified Query -> Graceful fallback
  return {
    intent: 'unsupported',
    filters: {},
    confidence: 'low',
    rawQuery: trimmed,
  };
}
