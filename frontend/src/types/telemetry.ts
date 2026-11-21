export type EntityType = "human" | "bot";
export type PlayerOutcome = "ELIMINATED" | "SURVIVED_PRESUMED";
export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export interface PositionSample {
  ts: number;
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
}

export interface DiscreteEvent {
  event: string;
  ts: number;
  iso?: string;
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  match_id?: string;
  user_id?: string;
  entity_type?: EntityType;
  map_id?: string;
  date?: string;
}

export interface Journey {
  journey_id: string;
  user_id: string;
  match_id: string;
  map_id: MapId;
  date: string;
  entity_type: EntityType;
  start_ts: number;
  end_ts: number;
  duration_seconds: number;
  distance_travelled_meters: number;
  starting_position: { x: number; y: number; z: number; u: number; v: number };
  ending_position: { x: number; y: number; z: number; u: number; v: number };
  terminal_event: string;
  outcome: PlayerOutcome;
  event_counts: Record<string, number>;
  positions_count: number;
  discrete_events_count: number;
  positions: PositionSample[];
  events: DiscreteEvent[];
}

export interface ParticipantSummary {
  user_id: string;
  entity_type: EntityType;
  outcome: PlayerOutcome;
  terminal_event: string;
  duration_seconds: number;
  distance_travelled_meters: number;
  positions_count: number;
  loot_count: number;
  bot_kills: number;
  deaths: number;
}

export interface MatchSummary {
  match_id: string;
  map_id: MapId;
  date: string;
  start_ts: number;
  end_ts: number;
  duration_seconds: number;
  human_count: number;
  bot_count: number;
  total_participants: number;
  total_events: number;
  movement_samples: number;
  discrete_events: number;
  eliminated_count: number;
  survived_presumed_count: number;
  total_loot_events: number;
  total_bot_kills: number;
  total_deaths: number;
  total_distance_travelled_meters: number;
  participants: ParticipantSummary[];
}

export interface PlayerSummary {
  user_id: string;
  entity_type: EntityType;
  matches_played: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  total_distance_travelled_meters: number;
  avg_distance_travelled_meters: number;
  total_loot_events: number;
  total_bot_kill_events: number;
  total_death_events: number;
  total_storm_deaths: number;
  outcomes: {
    ELIMINATED: number;
    SURVIVED_PRESUMED: number;
  };
  maps_played: Record<string, number>;
  dates_active: string[];
  matches: string[];
}

export interface MapMetadata {
  map_id: MapId;
  scale: number;
  origin_x: number;
  origin_z: number;
  native_width: number;
  native_height: number;
  minimap_filename: string;
  total_matches: number;
  total_journeys: number;
  human_journeys: number;
  bot_journeys: number;
  unique_humans: number;
  unique_bots: number;
  total_distance_km: number;
  avg_journey_duration_seconds: number;
  median_journey_duration_seconds: number;
  event_counts: Record<string, number>;
  outcomes: {
    ELIMINATED: number;
    SURVIVED_PRESUMED: number;
  };
}

export interface HeatmapLayer {
  name: string;
  total_points: number;
  max_cell_count: number;
  active_cells_count: number;
  grid: number[][];
}

export interface MapHeatmaps {
  map_id: MapId;
  grid_size: number;
  coordinate_system: string;
  row_orientation: string;
  col_orientation: string;
  layers: {
    human_traffic: HeatmapLayer;
    bot_traffic: HeatmapLayer;
    loot: HeatmapLayer;
    bot_kill: HeatmapLayer;
    bot_killed: HeatmapLayer;
    killed_by_storm: HeatmapLayer;
    [key: string]: HeatmapLayer;
  };
}

export interface GlobalStats {
  dataset_name: string;
  date_range: string;
  total_matches: number;
  total_unique_players: number;
  total_unique_humans: number;
  total_unique_bots: number;
  total_journeys: number;
  total_raw_records: number;
  total_clean_records: number;
  total_movement_samples: number;
  total_discrete_events: number;
  total_distance_travelled_km: number;
  matches_per_map: Record<string, number>;
  journeys_per_map: Record<string, number>;
  matches_per_day: Record<string, number>;
  journeys_per_day: Record<string, number>;
  event_distribution_overall: Record<string, number>;
  event_distribution_human: Record<string, number>;
  event_distribution_bot: Record<string, number>;
  outcomes_overall: {
    ELIMINATED: number;
    SURVIVED_PRESUMED: number;
  };
}

export interface Manifest {
  pipeline_version: string;
  dataset_name: string;
  export_timestamp_utc: string;
  total_exported_files: number;
  total_directory_size_bytes: number;
  total_directory_size_mb: number;
  summary_counts: {
    total_matches: number;
    total_unique_players: number;
    total_journeys: number;
    total_movement_samples: number;
    total_discrete_events: number;
    total_clean_records: number;
  };
  files_manifest: Record<string, { size_bytes: number; size_mb: number }>;
}

export interface CanvasTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export type EventLayerKey =
  | 'loot'
  | 'bot_kill'
  | 'bot_killed'
  | 'killed_by_storm'
  | 'kill'
  | 'killed';

export type HoveredTarget =
  | { type: 'event'; event: DiscreteEvent; screenX: number; screenY: number; mapX: number; mapY: number }
  | { type: 'journey'; journey: Journey; point: PositionSample; screenX: number; screenY: number; mapX: number; mapY: number }
  | {
      type: 'cell';
      row: number;
      col: number;
      screenX: number;
      screenY: number;
      mapX: number;
      mapY: number;
      mapId: MapId;
      cellData: {
        total: number;
        activeLayerCount: number;
        activeLayerName: string;
        normalizedIntensity: number;
      };
    }
  | null;

