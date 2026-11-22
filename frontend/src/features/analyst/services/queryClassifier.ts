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
 * Classifies a user query string into a supported intent and extracts parameters with high precision.
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
    q.includes('top player') ||
    q.includes('weapon') ||
    q.includes('gun') ||
    q.includes('damage') ||
    q.includes('ammo') ||
    q.includes('health') ||
    q.includes('cheater') ||
    q.includes('hacker') ||
    q.includes('camper') ||
    q.includes('why do players') ||
    q.includes('strategy')
  ) {
    return {
      intent: 'unsupported',
      filters: {},
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 3. Analytical Findings & Insights (INSIGHTS.md)
  if (
    q.includes('insight') ||
    q.includes('finding') ||
    q.includes('findings') ||
    q.includes('core findings') ||
    q.includes('key findings') ||
    q.includes('key insights') ||
    q.includes('analytical findings') ||
    q.includes('imbalance') ||
    (q.includes('why') && (q.includes('ambrose') || q.includes('valley')) && (q.includes('high') || q.includes('activity') || q.includes('share') || q.includes('more')))
  ) {
    let findingId: number | undefined;
    if (
      q.includes('finding 1') ||
      q.includes('finding #1') ||
      q.includes('first finding') ||
      (q.includes('ambrose') && (q.includes('imbalance') || q.includes('activity share') || q.includes('disproportionate')))
    ) {
      findingId = 1;
    } else if (
      q.includes('finding 2') ||
      q.includes('finding #2') ||
      q.includes('second finding') ||
      (q.includes('grand rift') && (q.includes('divergence') || q.includes('zero bot') || q.includes('human-only')))
    ) {
      findingId = 2;
    } else if (
      q.includes('finding 3') ||
      q.includes('finding #3') ||
      q.includes('third finding') ||
      (q.includes('loot') && (q.includes('concentration') || q.includes('corridor') || q.includes('cluster')))
    ) {
      findingId = 3;
    }

    return {
      intent: 'analytical_insights',
      filters: { findingId, mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 4. Global Dataset Overview & Health Summary
  if (
    q.includes('overview') ||
    q.includes('global stats') ||
    q.includes('dataset summary') ||
    q.includes('total matches') ||
    q.includes('how many matches') ||
    q.includes('total journeys') ||
    q.includes('how many journeys') ||
    q.includes('how many players') ||
    q.includes('how many humans') ||
    q.includes('how many bots') ||
    q.includes('total entities') ||
    q.includes('total distance') ||
    q.includes('total events') ||
    q.includes('how many events') ||
    q.includes('how many records') ||
    q.includes('dataset health') ||
    q.includes('tell me about the dataset') ||
    q.includes('about the data')
  ) {
    return {
      intent: 'dataset_overview',
      filters: {},
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 5. Coordinate System Calibration & Affine Mapping
  if (
    q.includes('coordinate') ||
    q.includes('affine') ||
    q.includes('transform') ||
    q.includes('mapping formula') ||
    q.includes('origin') ||
    q.includes('world to uv') ||
    q.includes('uv to world') ||
    (q.includes('scale') && (q.includes('map') || q.includes('ambrose') || q.includes('rift') || q.includes('lockdown') || q.includes('factor') || q.includes('dimensions')))
  ) {
    return {
      intent: 'coordinate_system',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 6. Temporal Analysis & Daily Volume
  if (
    q.includes('feb 10') ||
    q.includes('feb 11') ||
    q.includes('feb 12') ||
    q.includes('feb 13') ||
    q.includes('feb 14') ||
    q.includes('2026-02') ||
    q.includes('per day') ||
    q.includes('daily') ||
    q.includes('by date') ||
    q.includes('peak day') ||
    q.includes('duration of match') ||
    q.includes('match duration') ||
    q.includes('average match') ||
    q.includes('longest match') ||
    q.includes('how long do matches')
  ) {
    const dateMatch = trimmed.match(/2026-02-\d\d/i) || (trimmed.match(/feb\s*(\d+)/i) ? `2026-02-${trimmed.match(/feb\s*(\d+)/i)![1].padStart(2, '0')}` : undefined);
    return {
      intent: 'temporal_analysis',
      filters: { date: typeof dateMatch === 'string' ? dateMatch : dateMatch?.[0] },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 7. Player Intelligence & Behavioral Profiling
  const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) {
    return {
      intent: 'player_intelligence',
      filters: { userId: uuidMatch[0] },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }
  const botIdMatch = trimmed.match(/\b(?:bot|player)\s+(\d{3,5})\b/i);
  if (botIdMatch) {
    return {
      intent: 'player_intelligence',
      filters: { userId: botIdMatch[1] },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }
  if (
    (q.includes('player') && (q.includes('most active') || q.includes('distance') || q.includes('travelled') || q.includes('profile') || q.includes('dossier') || q.includes('directory') || q.includes('survival') || q.includes('survived'))) ||
    q.includes('most active player') ||
    q.includes('top players by distance') ||
    q.includes('player intelligence')
  ) {
    return {
      intent: 'player_intelligence',
      filters: { topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 8. Map Intelligence & Operational Dossiers
  if (
    (q.includes('tell me about') || q.includes('what is') || q.includes('dossier') || q.includes('stats for') || q.includes('overview of') || q.includes('information on')) &&
    (q.includes('ambrose') || q.includes('rift') || q.includes('lockdown'))
  ) {
    return {
      intent: 'map_intelligence',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 9. Map Coverage Comparison (Cross-Map Footprint)
  if (
    q.includes('widest') ||
    q.includes('footprint') ||
    q.includes('coverage comparison') ||
    (q.includes('compare') && (q.includes('map') || q.includes('theaters') || q.includes('all maps'))) ||
    q.includes('widest recorded') ||
    q.includes('which map has more') ||
    q.includes('largest map') ||
    q.includes('map comparison')
  ) {
    return {
      intent: 'map_coverage_comparison',
      filters: { mapId: 'all' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 10. Storm Deaths Summary
  if (
    q.includes('storm') ||
    q.includes('killedbystorm') ||
    q.includes('electric storm') ||
    q.includes('zone death') ||
    q.includes('circle death')
  ) {
    return {
      intent: 'storm_deaths_summary',
      filters: { category: 'KilledByStorm' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 11. Loot vs Human Traffic Overlap
  if (
    q.includes('loot') &&
    (q.includes('overlap') || q.includes('traffic') || q.includes('movement') || q.includes('co-locate') || q.includes('corridor') || q.includes('follow') || q.includes('correlation'))
  ) {
    return {
      intent: 'loot_vs_human_traffic',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 12. Human vs Bot Traffic Comparison
  if (
    (q.includes('human') && q.includes('bot') && (q.includes('compare') || q.includes('differ') || q.includes('ratio') || q.includes('versus') || q.includes('vs') || q.includes('divergence'))) ||
    (q.includes('high human') && q.includes('low bot')) ||
    (q.includes('where do humans go') && q.includes('bot'))
  ) {
    return {
      intent: 'human_vs_bot_traffic',
      filters: { mapId: targetMap },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 13. Multi-Layer / Cross-Layer Activity
  if (
    q.includes('multiple telemetry layers') ||
    q.includes('multi-layer') ||
    q.includes('cross-layer') ||
    q.includes('different event categories') ||
    q.includes('multiple layers') ||
    q.includes('density hubs') ||
    q.includes('tactical hubs') ||
    q.includes('hubs')
  ) {
    return {
      intent: 'cross_layer_activity',
      filters: { mapId: targetMap, topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 14. Bot Traffic Hotspots
  if (
    (q.includes('bot') && (q.includes('traffic') || q.includes('movement') || q.includes('waypoint') || q.includes('hotspot') || q.includes('path') || q.includes('route') || q.includes('go') || q.includes('spawn'))) &&
    !q.includes('botkill') &&
    !q.includes('botkilled')
  ) {
    return {
      intent: 'bot_traffic_hotspots',
      filters: { mapId: targetMap, entityType: 'bot', topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 15. Combat Distribution / BotKill Concentration
  if (
    q.includes('botkill') ||
    q.includes('botkilled') ||
    q.includes('combat') ||
    q.includes('elimination') ||
    q.includes('dying') ||
    q.includes('deaths') ||
    q.includes('fatalities') ||
    q.includes('casualt') ||
    q.includes('kill') ||
    q.includes('killed') ||
    q.includes('fights') ||
    (q.includes('concentrated') && (q.includes('kill') || q.includes('combat')))
  ) {
    return {
      intent: 'combat_event_distribution',
      filters: { mapId: targetMap, category: category || 'all_combat' },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 16. Loot Hotspots
  if (
    q.includes('loot') ||
    q.includes('pickups') ||
    q.includes('resource') ||
    q.includes('items') ||
    q.includes('caches') ||
    q.includes('chests')
  ) {
    return {
      intent: 'loot_hotspots',
      filters: { mapId: targetMap, category: 'Loot', topN: 5 },
      confidence: 'high',
      rawQuery: trimmed,
    };
  }

  // 17. Human Traffic Hotspots (Default Movement & General Activity Intent)
  if (
    q.includes('movement') ||
    q.includes('traffic') ||
    q.includes('areas have the highest') ||
    q.includes('human') ||
    q.includes('hotspots') ||
    q.includes('activity') ||
    q.includes('popular') ||
    q.includes('where do players') ||
    q.includes('where are players') ||
    q.includes('tell me about') ||
    q.includes('summary')
  ) {
    return {
      intent: 'human_traffic_hotspots',
      filters: { mapId: targetMap, entityType: 'human', topN: 5 },
      confidence: 'medium',
      rawQuery: trimmed,
    };
  }

  // Fallback for unclassified queries
  return {
    intent: 'unsupported',
    filters: {},
    confidence: 'low',
    rawQuery: trimmed,
  };
}
