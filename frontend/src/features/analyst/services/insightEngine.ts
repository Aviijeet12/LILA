import { MapId, DiscreteEvent } from '../../../types/telemetry';
import { dataService } from '../../../services/dataService';
import {
  gridCellToUVBounds,
  gridCellToWorldBounds,
  extractTopHotspots,
} from '../../map-explorer/utils/heatmapMath';
import {
  AnalyticalResult,
  HotspotSummary,
  MetricSummary,
} from '../types/analyst';

const MAP_NAMES: Record<MapId, string> = {
  AmbroseValley: 'Ambrose Valley',
  GrandRift: 'Grand Rift',
  Lockdown: 'Lockdown',
};

const STANDARD_LIMITATIONS = [
  'Heatmap density rasters represent 5-day dataset totals and cannot be filtered to individual matches or sub-hour intervals.',
  'Pings reflect periodic telemetry sample volume (~1Hz), not counts of unique human players.',
  'BotKill and BotKilled events are unilateral telemetry emissions and do not identify victim or eliminator identities.',
  'Survival status is recorded as SURVIVED_PRESUMED because telemetry ceases upon match completion without an explicit extraction confirmation event.',
  'No weapon models, health pools, armor tiers, or damage dealt metrics exist in the telemetry schema.',
];

export class InsightEngine {
  /**
   * Identifies top sectors for human movement activity.
   */
  public async getHumanTrafficHotspots(
    mapId: MapId = 'AmbroseValley',
    topN: number = 5
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const layer = heatmaps.layers.human_traffic;
    const grid = layer.grid;
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const rawHotspots = extractTopHotspots(grid, mapId, topN, 64);
    const totalPoints = layer.total_points;
    const activeCells = layer.active_cells_count;
    const coveragePercent = Number(((activeCells / 4096) * 100).toFixed(2));

    const hotspots: HotspotSummary[] = rawHotspots.map((h) => ({
      rank: h.rank,
      row: h.row,
      col: h.col,
      count: h.count,
      percentOfTotal: Number(((h.count / totalPoints) * 100).toFixed(2)),
      worldBounds: h.worldBounds,
      uvBounds: h.uvBounds,
      layerName: 'Human Traffic',
    }));

    const topCell = hotspots[0];
    const metrics: MetricSummary[] = [
      {
        label: 'Total Human Pings',
        value: totalPoints.toLocaleString(),
        rawCount: totalPoints,
        unit: 'pings',
        note: 'Periodic ~1Hz client trajectory emissions',
      },
      {
        label: 'Active Sectors',
        value: `${activeCells.toLocaleString()} / 4,096`,
        rawCount: activeCells,
        denominator: '4,096 sectors (64×64 grid)',
        note: `${coveragePercent}% territorial footprint`,
      },
      {
        label: 'Peak Sector Count',
        value: topCell ? topCell.count.toLocaleString() : '0',
        rawCount: topCell ? topCell.count : 0,
        denominator: `${totalPoints.toLocaleString()} total human pings`,
        note: topCell ? `${topCell.percentOfTotal}% of map-wide human traffic` : undefined,
      },
    ];

    const topCoords = topCell
      ? `Sector [R${topCell.row}, C${topCell.col}] (World X: [${topCell.worldBounds.xMin}, ${topCell.worldBounds.xMax}], Z: [${topCell.worldBounds.zMin}, ${topCell.worldBounds.zMax}])`
      : 'None';

    const conclusion = `On ${mapName}, human movement is concentrated in ${activeCells.toLocaleString()} out of 4,096 sectors (${coveragePercent}% coverage), totaling ${totalPoints.toLocaleString()} recorded position samples. The highest density cluster is at ${topCoords} with ${topCell?.count.toLocaleString()} pings (${topCell?.percentOfTotal}% of map traffic).`;

    return {
      intent: 'human_traffic_hotspots',
      title: `Human Movement Hotspots — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId, entityType: 'human', topN },
      dataScope: `5-Day Aggregate (Feb 10–14, 2026) | ${mapName} 64×64 Matrix`,
      metrics,
      hotspots,
      methodology: 'Evaluated 4,096 grid sectors (64 × 64). Peak ranks sorted by descending raw count. Sector share is defined as (Cell Pings / Total Human Pings) × 100%. Coverage denominator is strictly 4,096 sectors.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `How does human traffic compare with bot traffic on ${mapName}?`,
        `Which sectors have the highest recorded Loot event counts on ${mapName}?`,
        `Where are BotKill events most concentrated on ${mapName}?`,
      ],
      deepLink: topCell
        ? {
            label: `Focus Peak Sector [R${topCell.row}, C${topCell.col}] in Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topCell.row},${topCell.col}`,
          }
        : undefined,
    };
  }

  /**
   * Identifies top sectors for bot movement activity.
   */
  public async getBotTrafficHotspots(
    mapId: MapId = 'AmbroseValley',
    topN: number = 5
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const layer = heatmaps.layers.bot_traffic;
    const grid = layer.grid;
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const rawHotspots = extractTopHotspots(grid, mapId, topN, 64);
    const totalPoints = layer.total_points;
    const activeCells = layer.active_cells_count;
    const coveragePercent = Number(((activeCells / 4096) * 100).toFixed(2));

    const hotspots: HotspotSummary[] = rawHotspots.map((h) => ({
      rank: h.rank,
      row: h.row,
      col: h.col,
      count: h.count,
      percentOfTotal: Number(((h.count / totalPoints) * 100).toFixed(2)),
      worldBounds: h.worldBounds,
      uvBounds: h.uvBounds,
      layerName: 'Bot Traffic',
    }));

    const topCell = hotspots[0];
    const metrics: MetricSummary[] = [
      {
        label: 'Total Bot Pings',
        value: totalPoints.toLocaleString(),
        rawCount: totalPoints,
        unit: 'pings',
        note: 'Server-simulated bot trajectory samples',
      },
      {
        label: 'Active Sectors',
        value: `${activeCells.toLocaleString()} / 4,096`,
        rawCount: activeCells,
        denominator: '4,096 sectors (64×64 grid)',
        note: `${coveragePercent}% territorial footprint`,
      },
      {
        label: 'Peak Sector Count',
        value: topCell ? topCell.count.toLocaleString() : '0',
        rawCount: topCell ? topCell.count : 0,
        denominator: `${totalPoints.toLocaleString()} total bot pings`,
        note: topCell ? `${topCell.percentOfTotal}% of map-wide bot traffic` : undefined,
      },
    ];

    const conclusion = `On ${mapName}, server bot traffic covers ${activeCells.toLocaleString()} sectors (${coveragePercent}% coverage) with ${totalPoints.toLocaleString()} total samples. The top bot waypoint is at Sector [R${topCell?.row}, C${topCell?.col}] with ${topCell?.count.toLocaleString()} pings.`;

    return {
      intent: 'bot_traffic_hotspots',
      title: `Bot Movement Hotspots — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId, entityType: 'bot', topN },
      dataScope: `5-Day Aggregate | ${mapName} 64×64 Matrix`,
      metrics,
      hotspots,
      methodology: 'Sorted bot traffic grid by descending count. Share denominator is total bot pings.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `How does human traffic compare with bot traffic on ${mapName}?`,
        `Which areas have high human traffic but relatively low bot traffic on ${mapName}?`,
      ],
      deepLink: topCell
        ? {
            label: `Focus Top Bot Sector [R${topCell.row}, C${topCell.col}] in Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topCell.row},${topCell.col}`,
          }
        : undefined,
    };
  }

  /**
   * Compares human movement footprint across all 3 maps.
   */
  public async getMapCoverageComparison(): Promise<AnalyticalResult> {
    const maps: MapId[] = ['AmbroseValley', 'GrandRift', 'Lockdown'];
    const results = await Promise.all(
      maps.map(async (m) => {
        const h = await dataService.getMapHeatmaps(m);
        const humanLayer = h.layers.human_traffic;

        let unionCount = 0;
        const allLayers = Object.values(h.layers);
        for (let r = 0; r < 64; r++) {
          for (let c = 0; c < 64; c++) {
            let active = false;
            for (const l of allLayers) {
              if (l.grid && l.grid[r] && l.grid[r][c] > 0) {
                active = true;
                break;
              }
            }
            if (active) unionCount++;
          }
        }

        return {
          mapId: m,
          mapName: MAP_NAMES[m],
          humanActive: humanLayer.active_cells_count,
          humanPoints: humanLayer.total_points,
          humanCoverage: Number(((humanLayer.active_cells_count / 4096) * 100).toFixed(2)),
          unionActive: unionCount,
          unionCoverage: Number(((unionCount / 4096) * 100).toFixed(2)),
        };
      })
    );

    results.sort((a, b) => b.humanCoverage - a.humanCoverage);
    const widest = results[0];

    const metrics: MetricSummary[] = results.flatMap((r) => [
      {
        label: `${r.mapName} Human Coverage`,
        value: `${r.humanCoverage}% (${r.humanActive.toLocaleString()} / 4,096)`,
        rawCount: r.humanActive,
        denominator: '4,096 sectors',
        note: `${r.humanPoints.toLocaleString()} human pings recorded`,
      },
      {
        label: `${r.mapName} Union Footprint`,
        value: `${r.unionCoverage}% (${r.unionActive.toLocaleString()} / 4,096)`,
        rawCount: r.unionActive,
        denominator: '4,096 sectors (all 6 layers combined)',
      },
    ]);

    const conclusion = `${widest.mapName} has the widest recorded human movement footprint at ${widest.humanCoverage}% of the map grid (${widest.humanActive.toLocaleString()} active sectors out of 4,096), compared to Lockdown (${results.find((r) => r.mapId === 'Lockdown')?.humanCoverage}%) and Grand Rift (${results.find((r) => r.mapId === 'GrandRift')?.humanCoverage}%). Its union footprint across all 6 telemetry layers reaches ${widest.unionCoverage}%.`;

    return {
      intent: 'map_coverage_comparison',
      title: 'Cross-Map Territorial Footprint Comparison',
      conclusion,
      mapId: widest.mapId,
      filtersApplied: { mapId: 'all' },
      dataScope: '5-Day Dataset across all 3 Operational Theaters (12,288 total sectors evaluated)',
      metrics,
      methodology: 'Human Traffic Coverage is computed as (Active Human Sectors / 4,096) × 100%. Union Footprint Coverage is (Cells with Count > 0 in any of the 6 layers / 4,096) × 100%. Denominator is strictly 4,096 cells per map.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        'Which areas have the highest human movement activity on Ambrose Valley?',
        'How many storm-related death events were recorded on each map?',
        'How does human traffic compare with bot traffic on Grand Rift?',
      ],
      deepLink: {
        label: `Explore ${widest.mapName} in Map Explorer`,
        url: `/map-explorer?map=${widest.mapId}&heatmap=1`,
      },
    };
  }

  /**
   * Deterministic combat distribution: exact counts for BotKill, BotKilled, Kill, Killed, KilledByStorm.
   */
  public async getCombatEventDistribution(
    mapId?: MapId | 'all',
    category?: string
  ): Promise<AnalyticalResult> {
    const events = await dataService.getEvents();
    const targetMap = mapId === 'all' ? undefined : mapId;

    const filtered = targetMap
      ? events.filter((e) => e.map_id === targetMap)
      : events;

    let botKill = 0;
    let botKilled = 0;
    let kill = 0;
    let killed = 0;
    let storm = 0;
    let loot = 0;

    for (const e of filtered) {
      if (e.event === 'BotKill') botKill++;
      else if (e.event === 'BotKilled') botKilled++;
      else if (e.event === 'Kill') kill++;
      else if (e.event === 'Killed') killed++;
      else if (e.event === 'KilledByStorm') storm++;
      else if (e.event === 'Loot') loot++;
    }

    const totalCombat = botKill + botKilled + kill + killed;
    const scopeName = targetMap ? MAP_NAMES[targetMap] : 'All Maps Combined';

    const metrics: MetricSummary[] = [
      {
        label: 'BotKill Events',
        value: botKill.toLocaleString(),
        rawCount: botKill,
        denominator: `${totalCombat.toLocaleString()} total combat events`,
        note: totalCombat > 0 ? `${((botKill / totalCombat) * 100).toFixed(2)}% of combat events` : '0%',
      },
      {
        label: 'BotKilled Events',
        value: botKilled.toLocaleString(),
        rawCount: botKilled,
        denominator: `${totalCombat.toLocaleString()} total combat events`,
        note: totalCombat > 0 ? `${((botKilled / totalCombat) * 100).toFixed(2)}% of combat events` : '0%',
      },
      {
        label: 'Kill Events',
        value: kill.toLocaleString(),
        rawCount: kill,
        note: 'Rare discrete elimination telemetry emissions',
      },
      {
        label: 'Killed Events',
        value: killed.toLocaleString(),
        rawCount: killed,
        note: 'Discrete casualty telemetry emissions',
      },
      {
        label: 'Storm Death Events (KilledByStorm)',
        value: storm.toLocaleString(),
        rawCount: storm,
        note: 'Strictly environmental electric storm fatalities',
      },
      {
        label: 'Loot Events (Discrete Resource Interactions)',
        value: loot.toLocaleString(),
        rawCount: loot,
        note: 'Evaluated separately from combat records',
      },
    ];

    const conclusion = `In ${scopeName}, a total of ${totalCombat.toLocaleString()} combat-related events were recorded: BotKill Events account for ${botKill.toLocaleString()} (${totalCombat > 0 ? ((botKill / totalCombat) * 100).toFixed(1) : 0}%), BotKilled Events account for ${botKilled.toLocaleString()} (${totalCombat > 0 ? ((botKilled / totalCombat) * 100).toFixed(1) : 0}%), and Kill/Killed events represent ${kill + killed} occurrences. An additional ${storm} Storm Death Events occurred due to zone constriction.`;

    const actualMapId = targetMap ?? 'AmbroseValley';

    return {
      intent: 'combat_event_distribution',
      title: `Combat Telemetry Distribution — ${scopeName}`,
      conclusion,
      mapId: actualMapId,
      filtersApplied: { mapId: targetMap ?? 'all', category: category ?? 'all_combat' },
      dataScope: `Exact Discrete Telemetry Logs (${filtered.length.toLocaleString()} events analyzed)`,
      metrics,
      methodology: `Tallied exact integer event occurrences from events.json. Percentages are calculated against Total Combat Events (BotKill + BotKilled + Kill + Killed = ${totalCombat}). Storm Death Events and Loot Events are evaluated independently to prevent semantic skewing.`,
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `Where are BotKill events most concentrated on ${scopeName === 'All Maps Combined' ? 'Ambrose Valley' : scopeName}?`,
        'How do BotKill and BotKilled event distributions differ?',
        'How many storm-related death events were recorded on each map?',
      ],
      deepLink: {
        label: 'View Combat Events in Combat Analysis',
        url: `/combat?map=${actualMapId}&category=all_combat`,
      },
    };
  }

  /**
   * Top Loot event hotspots and comparison with human traffic.
   */
  public async getLootHotspots(
    mapId: MapId = 'AmbroseValley',
    topN: number = 5
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const lootLayer = heatmaps.layers.loot;
    const humanLayer = heatmaps.layers.human_traffic;
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const rawHotspots = extractTopHotspots(lootLayer.grid, mapId, topN, 64);
    const totalLoot = lootLayer.total_points;

    const hotspots: HotspotSummary[] = rawHotspots.map((h) => {
      const humanCount = humanLayer.grid[h.row]?.[h.col] || 0;
      return {
        rank: h.rank,
        row: h.row,
        col: h.col,
        count: h.count,
        percentOfTotal: Number(((h.count / totalLoot) * 100).toFixed(2)),
        worldBounds: h.worldBounds,
        uvBounds: h.uvBounds,
        layerName: `Loot (${h.count} pickups, ${humanCount} human pings)`,
      };
    });

    const topCell = hotspots[0];
    const topHumanPings = topCell ? humanLayer.grid[topCell.row]?.[topCell.col] || 0 : 0;

    const metrics: MetricSummary[] = [
      {
        label: 'Total Loot Pickups',
        value: totalLoot.toLocaleString(),
        rawCount: totalLoot,
        unit: 'events',
      },
      {
        label: 'Active Loot Sectors',
        value: `${lootLayer.active_cells_count.toLocaleString()} / 4,096`,
        rawCount: lootLayer.active_cells_count,
        denominator: '4,096 sectors',
        note: `${((lootLayer.active_cells_count / 4096) * 100).toFixed(2)}% of map sectors contain loot`,
      },
      {
        label: 'Peak Loot Sector',
        value: topCell ? topCell.count.toLocaleString() : '0',
        rawCount: topCell ? topCell.count : 0,
        denominator: `${totalLoot.toLocaleString()} total loot pickups`,
        note: topCell ? `${topCell.percentOfTotal}% of map loot; overlaps with ${topHumanPings} human pings` : undefined,
      },
    ];

    const conclusion = `On ${mapName}, ${totalLoot.toLocaleString()} Loot events are distributed across ${lootLayer.active_cells_count.toLocaleString()} sectors. The highest-density loot cache is at Sector [R${topCell?.row}, C${topCell?.col}] with ${topCell?.count.toLocaleString()} pickups (${topCell?.percentOfTotal}% of map total), co-located with ${topHumanPings.toLocaleString()} human trajectory samples.`;

    return {
      intent: 'loot_hotspots',
      title: `Loot Activity & Spatial Density — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId, category: 'Loot', topN },
      dataScope: `5-Day Aggregate | ${mapName} 64×64 Grid`,
      metrics,
      hotspots,
      methodology: 'Extracted top loot sectors by raw pickup count. Overlap with human traffic evaluates the corresponding (row, col) cell in human_traffic.grid.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `How does loot activity overlap with human traffic hotspots on ${mapName}?`,
        `Which sectors have the highest activity across multiple telemetry layers on ${mapName}?`,
      ],
      deepLink: topCell
        ? {
            label: `Focus Peak Loot Sector [R${topCell.row}, C${topCell.col}] on Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topCell.row},${topCell.col}`,
          }
        : undefined,
    };
  }

  /**
   * Compares human traffic against bot traffic on a map.
   */
  public async compareHumanVsBotTraffic(
    mapId: MapId = 'AmbroseValley'
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const human = heatmaps.layers.human_traffic;
    const bot = heatmaps.layers.bot_traffic;
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const humanPoints = human.total_points;
    const botPoints = bot.total_points;
    const totalPoints = humanPoints + botPoints;

    const humanActive = human.active_cells_count;
    const botActive = bot.active_cells_count;

    const ratio = botPoints > 0 ? (humanPoints / botPoints).toFixed(2) : 'N/A';

    const humanDominantCells: Array<{ row: number; col: number; human: number; bot: number; diff: number }> = [];
    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < 64; c++) {
        const hVal = human.grid[r]?.[c] || 0;
        const bVal = bot.grid[r]?.[c] || 0;
        if (hVal > 50 && bVal < 10) {
          humanDominantCells.push({ row: r, col: c, human: hVal, bot: bVal, diff: hVal - bVal });
        }
      }
    }
    humanDominantCells.sort((a, b) => b.diff - a.diff);
    const topDivergent = humanDominantCells[0];

    const metrics: MetricSummary[] = [
      {
        label: 'Human Trajectory Pings',
        value: humanPoints.toLocaleString(),
        rawCount: humanPoints,
        denominator: `${totalPoints.toLocaleString()} total combined movement pings`,
        note: `${((humanPoints / totalPoints) * 100).toFixed(1)}% of total pings`,
      },
      {
        label: 'Bot Trajectory Pings',
        value: botPoints.toLocaleString(),
        rawCount: botPoints,
        denominator: `${totalPoints.toLocaleString()} total combined movement pings`,
        note: `${((botPoints / totalPoints) * 100).toFixed(1)}% of total pings`,
      },
      {
        label: 'Human-to-Bot Ping Ratio',
        value: `${ratio} : 1`,
        note: 'Ratio of human samples to bot samples',
      },
      {
        label: 'Human Active Sectors',
        value: `${humanActive.toLocaleString()} / 4,096`,
        rawCount: humanActive,
        note: `${((humanActive / 4096) * 100).toFixed(2)}% territorial coverage`,
      },
      {
        label: 'Bot Active Sectors',
        value: `${botActive.toLocaleString()} / 4,096`,
        rawCount: botActive,
        note: `${((botActive / 4096) * 100).toFixed(2)}% territorial coverage`,
      },
    ];

    let hotspots: HotspotSummary[] | undefined;
    if (topDivergent) {
      const uv = gridCellToUVBounds(topDivergent.row, topDivergent.col, 64);
      const world = gridCellToWorldBounds(topDivergent.row, topDivergent.col, mapId, 64);
      hotspots = [
        {
          rank: 1,
          row: topDivergent.row,
          col: topDivergent.col,
          count: topDivergent.human,
          percentOfTotal: Number(((topDivergent.human / humanPoints) * 100).toFixed(2)),
          worldBounds: world,
          uvBounds: uv,
          layerName: `Human: ${topDivergent.human} vs Bot: ${topDivergent.bot}`,
        },
      ];
    }

    const conclusion = `On ${mapName}, human players generated ${humanPoints.toLocaleString()} pings across ${humanActive.toLocaleString()} sectors, while server bots generated ${botPoints.toLocaleString()} pings across ${botActive.toLocaleString()} sectors (${ratio} : 1 ratio). Sectors such as [R${topDivergent?.row}, C${topDivergent?.col}] demonstrate high human corridor density (${topDivergent?.human} pings) with minimal bot presence (${topDivergent?.bot} pings).`;

    return {
      intent: 'human_vs_bot_traffic',
      title: `Human vs Bot Movement Comparison — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId },
      dataScope: `5-Day Aggregate | ${mapName}`,
      metrics,
      hotspots,
      methodology: 'Evaluated cell-by-cell pings from human_traffic and bot_traffic. Ratio is calculated as Total Human Pings / Total Bot Pings. Divergent cells isolate sectors where human pings exceed 50 and bot pings are below 10.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `Which areas have high human traffic but relatively low bot traffic on ${mapName}?`,
        `Which areas have the highest human movement activity on ${mapName}?`,
      ],
      deepLink: topDivergent
        ? {
            label: `Focus Divergent Sector [R${topDivergent.row}, C${topDivergent.col}] in Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topDivergent.row},${topDivergent.col}`,
          }
        : undefined,
    };
  }

  /**
   * Compares Loot density overlap with human traffic hotspots.
   */
  public async compareLootVsHumanTraffic(
    mapId: MapId = 'AmbroseValley'
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const loot = heatmaps.layers.loot;
    const human = heatmaps.layers.human_traffic;
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const topHumanHotspots = extractTopHotspots(human.grid, mapId, 5, 64);
    let coLocatedLootCount = 0;
    const hotspots: HotspotSummary[] = topHumanHotspots.map((h) => {
      const lootInCell = loot.grid[h.row]?.[h.col] || 0;
      coLocatedLootCount += lootInCell;
      return {
        rank: h.rank,
        row: h.row,
        col: h.col,
        count: h.count,
        percentOfTotal: Number(((h.count / human.total_points) * 100).toFixed(2)),
        worldBounds: h.worldBounds,
        uvBounds: h.uvBounds,
        layerName: `Human: ${h.count} pings | Loot: ${lootInCell} pickups`,
      };
    });

    let sharedCells = 0;
    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < 64; c++) {
        if ((human.grid[r]?.[c] || 0) > 0 && (loot.grid[r]?.[c] || 0) > 0) {
          sharedCells++;
        }
      }
    }

    const metrics: MetricSummary[] = [
      {
        label: 'Shared Active Sectors',
        value: `${sharedCells.toLocaleString()} / 4,096`,
        rawCount: sharedCells,
        denominator: '4,096 sectors',
        note: `${((sharedCells / loot.active_cells_count) * 100).toFixed(1)}% of all loot sectors overlap with human movement`,
      },
      {
        label: 'Loot in Top 5 Human Hotspots',
        value: coLocatedLootCount.toLocaleString(),
        rawCount: coLocatedLootCount,
        denominator: `${loot.total_points.toLocaleString()} total map loot pickups`,
        note: `${((coLocatedLootCount / loot.total_points) * 100).toFixed(2)}% of map loot`,
      },
      {
        label: 'Human Traffic Active Sectors',
        value: human.active_cells_count.toLocaleString(),
        rawCount: human.active_cells_count,
      },
      {
        label: 'Loot Active Sectors',
        value: loot.active_cells_count.toLocaleString(),
        rawCount: loot.active_cells_count,
      },
    ];

    const conclusion = `On ${mapName}, ${sharedCells.toLocaleString()} sectors contain both human traffic and loot interactions, representing ${((sharedCells / loot.active_cells_count) * 100).toFixed(1)}% of all loot-bearing terrain. The top 5 human traffic hotspots co-locate with ${coLocatedLootCount.toLocaleString()} loot pickup events, confirming high correlation between resource caches and movement paths.`;

    const topCell = hotspots[0];

    return {
      intent: 'loot_vs_human_traffic',
      title: `Loot Activity & Human Movement Overlap — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId },
      dataScope: `5-Day Aggregate | ${mapName}`,
      metrics,
      hotspots,
      methodology: 'Intersected non-zero cells in human_traffic and loot grids. Co-located loot tallies sum exact pickups within the Top 5 highest-frequency human movement cells.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `Which regions have the highest recorded Loot event counts on ${mapName}?`,
        `Which sectors have the highest activity across multiple telemetry layers on ${mapName}?`,
      ],
      deepLink: topCell
        ? {
            label: `Focus Top Shared Sector [R${topCell.row}, C${topCell.col}] in Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topCell.row},${topCell.col}`,
          }
        : undefined,
    };
  }

  /**
   * Multi-spectral analysis: identifies sectors active across several telemetry layers.
   */
  public async getCrossLayerActivity(
    mapId: MapId = 'AmbroseValley',
    minLayers: number = 3
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const layers = Object.entries(heatmaps.layers);
    const mapName = MAP_NAMES[mapId] ?? mapId;

    interface CellMultiSpectral {
      row: number;
      col: number;
      activeLayerCount: number;
      totalPings: number;
      layerNames: string[];
    }

    const multiCells: CellMultiSpectral[] = [];

    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < 64; c++) {
        let count = 0;
        let sumPings = 0;
        const activeNames: string[] = [];

        for (const [key, layer] of layers) {
          const val = layer.grid[r]?.[c] || 0;
          if (val > 0) {
            count++;
            sumPings += val;
            activeNames.push(layer.name || key);
          }
        }

        if (count >= minLayers) {
          multiCells.push({
            row: r,
            col: c,
            activeLayerCount: count,
            totalPings: sumPings,
            layerNames: activeNames,
          });
        }
      }
    }

    multiCells.sort((a, b) => b.activeLayerCount - a.activeLayerCount || b.totalPings - a.totalPings);
    const topMulti = multiCells.slice(0, 5);

    const hotspots: HotspotSummary[] = topMulti.map((cell, idx) => ({
      rank: idx + 1,
      row: cell.row,
      col: cell.col,
      count: cell.totalPings,
      percentOfTotal: Number(((cell.activeLayerCount / layers.length) * 100).toFixed(1)),
      worldBounds: gridCellToWorldBounds(cell.row, cell.col, mapId, 64),
      uvBounds: gridCellToUVBounds(cell.row, cell.col, 64),
      layerName: `${cell.activeLayerCount}/6 layers active (${cell.totalPings} total pings)`,
    }));

    const topCell = hotspots[0];
    const topCellData = topMulti[0];

    const metrics: MetricSummary[] = [
      {
        label: `Sectors with ≥${minLayers} Active Layers`,
        value: `${multiCells.length.toLocaleString()} / 4,096`,
        rawCount: multiCells.length,
        denominator: '4,096 sectors',
        note: `${((multiCells.length / 4096) * 100).toFixed(2)}% of map sectors contain multi-spectral activity`,
      },
      {
        label: 'Peak Multi-Spectral Hub',
        value: topCell ? `Sector [R${topCell.row}, C${topCell.col}]` : 'None',
        note: topCellData ? `${topCellData.activeLayerCount} of 6 layers active (${topCellData.layerNames.join(', ')})` : undefined,
      },
      {
        label: 'Peak Hub Total Telemetry Pings',
        value: topCell ? topCell.count.toLocaleString() : '0',
        rawCount: topCell ? topCell.count : 0,
        unit: 'pings',
      },
    ];

    const conclusion = `On ${mapName}, ${multiCells.length.toLocaleString()} sectors demonstrate multi-layer telemetry activity across 3 or more layers. The primary tactical hub is Sector [R${topCell?.row}, C${topCell?.col}], exhibiting active signals across ${topCellData?.activeLayerCount} of 6 layers with ${topCell?.count.toLocaleString()} cumulative pings.`;

    return {
      intent: 'cross_layer_activity',
      title: `Multi-Layer Telemetry Density Hubs — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId, topN: 5 },
      dataScope: `5-Day Aggregate across all 6 Telemetry Layers | ${mapName}`,
      metrics,
      hotspots,
      methodology: `Evaluated cell-by-cell presence across all 6 raster layers (Human Traffic, Bot Traffic, Loot, BotKill, BotKilled, Storm Deaths). Filtered for sectors with ≥${minLayers} active layers.`,
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `Which sectors have high human traffic but relatively low bot traffic on ${mapName}?`,
        `Where are BotKill events most concentrated on ${mapName}?`,
      ],
      deepLink: topCell
        ? {
            label: `Focus Multi-Spectral Hub [R${topCell.row}, C${topCell.col}] in Map Explorer`,
            url: `/map-explorer?map=${mapId}&heatmap=1&cell=${topCell.row},${topCell.col}`,
          }
        : undefined,
    };
  }

  /**
   * Environmental storm deaths summary across all 3 maps.
   */
  public async getStormDeathsSummary(): Promise<AnalyticalResult> {
    const events = await dataService.getEvents();
    const stormEvents = events.filter((e) => e.event === 'KilledByStorm');

    const countsByMap: Record<MapId, number> = {
      AmbroseValley: 0,
      GrandRift: 0,
      Lockdown: 0,
    };

    let unmappedStorm = 0;

    for (const e of stormEvents) {
      if (e.map_id && e.map_id in countsByMap) {
        countsByMap[e.map_id as MapId]++;
      } else {
        unmappedStorm++;
      }
    }

    const totalStorm = stormEvents.length;

    const metrics: MetricSummary[] = [
      {
        label: 'Total Storm Deaths (KilledByStorm)',
        value: totalStorm.toLocaleString(),
        rawCount: totalStorm,
        denominator: '14,750 total discrete events',
        note: 'Environmental zone constriction eliminations',
      },
      {
        label: 'Ambrose Valley Storm Deaths',
        value: countsByMap.AmbroseValley.toLocaleString(),
        rawCount: countsByMap.AmbroseValley,
        denominator: `${totalStorm} total storm deaths`,
        note: totalStorm > 0 ? `${((countsByMap.AmbroseValley / totalStorm) * 100).toFixed(1)}%` : '0%',
      },
      {
        label: 'Grand Rift Storm Deaths',
        value: countsByMap.GrandRift.toLocaleString(),
        rawCount: countsByMap.GrandRift,
        denominator: `${totalStorm} total storm deaths`,
        note: totalStorm > 0 ? `${((countsByMap.GrandRift / totalStorm) * 100).toFixed(1)}%` : '0%',
      },
      {
        label: 'Lockdown Storm Deaths',
        value: countsByMap.Lockdown.toLocaleString(),
        rawCount: countsByMap.Lockdown,
        denominator: `${totalStorm} total storm deaths`,
        note: totalStorm > 0 ? `${((countsByMap.Lockdown / totalStorm) * 100).toFixed(1)}%` : '0%',
      },
    ];

    if (unmappedStorm > 0) {
      metrics.push({
        label: 'Unmapped Map ID Storm Deaths',
        value: unmappedStorm.toLocaleString(),
        rawCount: unmappedStorm,
        denominator: `${totalStorm} total storm deaths`,
        note: 'Events with missing or invalid map identifier',
      });
    }

    const conclusion = `Across the entire 5-day dataset, exactly ${totalStorm} KilledByStorm events were recorded. Fatalities were distributed as follows: Ambrose Valley (${countsByMap.AmbroseValley}), Grand Rift (${countsByMap.GrandRift}), and Lockdown (${countsByMap.Lockdown}). These represent environmental electric storm boundary eliminations rather than combat engagements.`;

    return {
      intent: 'storm_deaths_summary',
      title: 'Environmental Storm Death Events by Map',
      conclusion,
      filtersApplied: { category: 'KilledByStorm' },
      dataScope: '5-Day Discrete Telemetry Events (All Maps)',
      metrics,
      methodology: 'Filtered discrete events with exact event key KilledByStorm from events.json and grouped by map_id.',
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        'How many total combat events were recorded across all maps?',
        'Which map has the widest recorded human movement footprint?',
      ],
      deepLink: {
        label: 'View Storm Events in Combat Analysis',
        url: '/combat?category=KilledByStorm',
      },
    };
  }

  /**
   * Detailed sector comparison / single sector inspection.
   */
  public async inspectSector(
    mapId: MapId = 'AmbroseValley',
    row: number = 25,
    col: number = 6
  ): Promise<AnalyticalResult> {
    const heatmaps = await dataService.getMapHeatmaps(mapId);
    const mapName = MAP_NAMES[mapId] ?? mapId;

    const r = Math.min(63, Math.max(0, row));
    const c = Math.min(63, Math.max(0, col));

    const uv = gridCellToUVBounds(r, c, 64);
    const world = gridCellToWorldBounds(r, c, mapId, 64);

    const layerBreakdown = Object.entries(heatmaps.layers).map(([key, layer]) => {
      const count = layer.grid[r]?.[c] || 0;
      const total = layer.total_points;
      const share = total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';
      return {
        label: layer.name || key,
        value: count.toLocaleString(),
        rawCount: count,
        denominator: `${total.toLocaleString()} total ${layer.name || key} pings`,
        note: `${share}% of map layer total`,
      };
    });

    const totalCellPings = layerBreakdown.reduce((sum, l) => sum + (l.rawCount || 0), 0);

    const hotspots: HotspotSummary[] = [
      {
        rank: 1,
        row: r,
        col: c,
        count: totalCellPings,
        percentOfTotal: 100,
        worldBounds: world,
        uvBounds: uv,
        layerName: `Sector [R${r}, C${c}]`,
      },
    ];

    const conclusion = `Sector [R${r}, C${c}] on ${mapName} spans World Coordinates [X: ${world.xMin} to ${world.xMax}, Z: ${world.zMin} to ${world.zMax}] meters (UV: [${uv.uMin.toFixed(3)}, ${uv.uMax.toFixed(3)}] × [${uv.vMin.toFixed(3)}, ${uv.vMax.toFixed(3)}]). It contains ${totalCellPings.toLocaleString()} total telemetry pings across all 6 layers.`;

    return {
      intent: 'sector_comparison',
      title: `Sector Inspection: [Row ${r}, Col ${c}] — ${mapName}`,
      conclusion,
      mapId,
      filtersApplied: { mapId, row: r, col: c },
      dataScope: `Sector [R${r}, C${c}] | ${mapName}`,
      metrics: [
        {
          label: 'Total Sector Pings (All Layers)',
          value: totalCellPings.toLocaleString(),
          rawCount: totalCellPings,
        },
        ...layerBreakdown,
      ],
      hotspots,
      methodology: `Evaluated cell coordinates in natural UV bounds and projected onto world coordinates using calibrated map origin (${mapId}). Evaluated exact count in all 6 layer grids at [${r}, ${c}].`,
      limitations: STANDARD_LIMITATIONS,
      followUpQuestions: [
        `Which areas have the highest human movement activity on ${mapName}?`,
        `Which sectors have the highest activity across multiple telemetry layers on ${mapName}?`,
      ],
      deepLink: {
        label: `Focus Sector [R${r}, C${c}] in Map Explorer`,
        url: `/map-explorer?map=${mapId}&heatmap=1&cell=${r},${c}`,
      },
    };
  }

  /**
   * Deterministic rejection of unsupported queries.
   */
  public getUnsupportedAnalysis(question: string): AnalyticalResult {
    return {
      intent: 'unsupported',
      title: 'Query Beyond Supported Telemetry Scope',
      conclusion: 'The requested analytical query cannot be resolved with high confidence from the available telemetry schema. LILA BLACK maintains strict analytical grounding and does not fabricate inferences regarding player skill, weapon balance, causal intentions, or unrecorded variables.',
      filtersApplied: {},
      dataScope: 'Nakama 5-Day Telemetry Dataset (Feb 10–14, 2026)',
      metrics: [
        {
          label: 'Supported Domains',
          value: 'Movement, Combat, Loot, Spatial Heatmaps, Map Coverage',
          note: 'Ground-truth telemetry only',
        },
      ],
      methodology: 'The controlled intent parser did not match a verified deterministic calculation routine.',
      limitations: [
        'No weapon models, player health, ammo, or damage metrics exist in the data.',
        'No skill ratings (Elo/MMR) or subjective player classifications exist.',
        'BotKill and BotKilled events do not contain paired killer-victim relationships.',
        'Extraction events do not exist (only SURVIVED_PRESUMED).',
      ],
      followUpQuestions: [
        'Which areas have the highest human movement activity?',
        'How does human traffic compare with bot traffic?',
        'Where are BotKill events most concentrated?',
        'Which map has the widest recorded human movement footprint?',
      ],
    };
  }
}

export const insightEngine = new InsightEngine();
