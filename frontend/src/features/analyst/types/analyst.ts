import { MapId } from '../../../types/telemetry';
import { UVBounds, WorldBounds } from '../../map-explorer/utils/heatmapMath';

export type AnalystIntent =
  | 'human_traffic_hotspots'
  | 'bot_traffic_hotspots'
  | 'combat_event_distribution'
  | 'loot_hotspots'
  | 'map_coverage_comparison'
  | 'cross_layer_activity'
  | 'sector_comparison'
  | 'storm_deaths_summary'
  | 'human_vs_bot_traffic'
  | 'loot_vs_human_traffic'
  | 'unsupported';

export interface AnalyticalFilter {
  mapId?: MapId | 'all';
  category?: string;
  row?: number;
  col?: number;
  topN?: number;
  entityType?: 'all' | 'human' | 'bot';
  matchId?: string;
}

export interface MetricSummary {
  label: string;
  value: number | string;
  rawCount?: number;
  denominator?: string;
  unit?: string;
  note?: string;
}

export interface HotspotSummary {
  rank: number;
  row: number;
  col: number;
  count: number;
  percentOfTotal: number;
  worldBounds: WorldBounds;
  uvBounds: UVBounds;
  layerName?: string;
}

export interface DeepLinkAction {
  label: string;
  url: string;
}

export interface AnalyticalResult {
  intent: AnalystIntent;
  title: string;
  conclusion: string;
  mapId?: MapId;
  filtersApplied: AnalyticalFilter;
  dataScope: string;
  metrics: MetricSummary[];
  hotspots?: HotspotSummary[];
  methodology: string;
  limitations: string[];
  followUpQuestions: string[];
  deepLink?: DeepLinkAction;
  llmCommentary?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'analyst';
  timestamp: number;
  text?: string;
  result?: AnalyticalResult;
  isError?: boolean;
}

export interface SuggestedQuestion {
  category: 'Player Movement' | 'Combat Telemetry' | 'Loot Activity' | 'Spatial Analysis';
  question: string;
  intent: AnalystIntent;
  defaultMap?: MapId;
}
