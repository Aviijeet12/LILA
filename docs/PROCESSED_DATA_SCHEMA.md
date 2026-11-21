# LILA BLACK — Processed Telemetry Data Schema
**Project:** LILA BLACK — Player Intelligence  
**Phase:** Phase 2 — Production Telemetry Data Processing Pipeline  
**Destination Directory:** `data/processed/`  
**Total Size:** 12.51 MB across 15 JSON files  
**Author:** Senior Data Engineer  

---

## 1. Directory Structure

```
data/processed/
├── manifest.json                               # Master manifest and checksums
├── global_stats.json                           # Overall platform KPIs
├── matches/
│   └── matches.json                            # All 796 matches with summaries
├── players/
│   └── players.json                            # All 339 players/bots with stats
├── events/
│   └── events.json                             # 14,750 discrete gameplay events
├── maps/
│   ├── AmbroseValley/
│   │   ├── metadata.json                       # Map bounds, scale, match counts
│   │   ├── journeys.json                       # Player trajectories on this map
│   │   └── heatmaps.json                       # 64x64 density grids (6 layers)
│   ├── GrandRift/
│   │   ├── metadata.json
│   │   ├── journeys.json
│   │   └── heatmaps.json
│   └── Lockdown/
│       ├── metadata.json
│       ├── journeys.json
│       └── heatmaps.json
└── quality/
    └── processing_report.json                  # Ingestion, cleaning & audit checks
```

---

## 2. File Schemas

### 2.1 `manifest.json`
```json
{
  "pipeline_version": "1.0.0",
  "dataset_name": "LILA BLACK — Player Intelligence",
  "export_timestamp_utc": "2026-11-21T01:37:59.081827+00:00",
  "total_exported_files": 15,
  "total_directory_size_bytes": 13123847,
  "total_directory_size_mb": 12.51,
  "summary_counts": {
    "total_matches": 796,
    "total_unique_players": 339,
    "total_journeys": 1242,
    "total_movement_samples": 72849,
    "total_discrete_events": 14750,
    "total_clean_records": 87599
  },
  "files_manifest": {
    "global_stats.json": { "size_bytes": 1200, "size_mb": 0.001 },
    "matches/matches.json": { "size_bytes": 651882, "size_mb": 0.622 }
  }
}
```

### 2.2 `global_stats.json`
```json
{
  "dataset_name": "LILA BLACK — Production Gameplay Telemetry",
  "date_range": "2026-02-10 to 2026-02-14",
  "total_matches": 796,
  "total_unique_players": 339,
  "total_unique_humans": 245,
  "total_unique_bots": 94,
  "total_journeys": 1242,
  "total_raw_records": 89104,
  "total_clean_records": 87599,
  "total_movement_samples": 72849,
  "total_discrete_events": 14750,
  "total_distance_travelled_km": 1058.42,
  "matches_per_map": { "AmbroseValley": 566, "Lockdown": 171, "GrandRift": 59 },
  "journeys_per_map": { "AmbroseValley": 836, "Lockdown": 295, "GrandRift": 111 },
  "matches_per_day": { "2026-02-10": 285, "2026-02-11": 201, "2026-02-12": 162, "2026-02-13": 112, "2026-02-14": 37 },
  "event_distribution_overall": { "Position": 51137, "BotPosition": 21712, "Loot": 11632, "BotKill": 2376, "BotKilled": 697, "KilledByStorm": 39, "Kill": 3, "Killed": 3 },
  "event_distribution_human": { "Position": 50501, "Loot": 11517, "BotKill": 2193, "BotKilled": 400, "KilledByStorm": 39, "Kill": 3, "Killed": 3 },
  "event_distribution_bot": { "BotPosition": 21712, "Position": 636, "BotKilled": 297, "BotKill": 183, "Loot": 115 },
  "outcomes_overall": { "ELIMINATED": 533, "SURVIVED_PRESUMED": 709 }
}
```

### 2.3 `matches/matches.json`
Array of 796 match session objects:
```json
{
  "total_matches": 796,
  "matches": [
    {
      "match_id": "b71aaad8-aa62-4b3a-8534-927d4de18f22.nakama-0",
      "map_id": "AmbroseValley",
      "date": "2026-02-10",
      "start_ts": 1770754537,
      "end_ts": 1770755291,
      "duration_seconds": 754,
      "human_count": 1,
      "bot_count": 0,
      "total_participants": 1,
      "total_events": 88,
      "movement_samples": 63,
      "discrete_events": 25,
      "eliminated_count": 1,
      "survived_presumed_count": 0,
      "total_loot_events": 19,
      "total_bot_kills": 5,
      "total_deaths": 1,
      "total_distance_travelled_meters": 1124.37,
      "participants": [
        {
          "user_id": "cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed",
          "entity_type": "human",
          "outcome": "ELIMINATED",
          "terminal_event": "BotKilled",
          "duration_seconds": 754,
          "distance_travelled_meters": 1124.37,
          "positions_count": 63,
          "loot_count": 19,
          "bot_kills": 5,
          "deaths": 1
        }
      ]
    }
  ]
}
```

### 2.4 `players/players.json`
Array of 339 player/bot performance objects:
```json
{
  "total_players": 339,
  "players": [
    {
      "user_id": "5787de75-6610-4112-ac7c-72435d3803a2",
      "entity_type": "human",
      "matches_played": 31,
      "total_duration_seconds": 11420,
      "avg_duration_seconds": 368.4,
      "total_distance_travelled_meters": 34120.5,
      "avg_distance_travelled_meters": 1100.66,
      "total_loot_events": 412,
      "total_bot_kill_events": 84,
      "total_death_events": 22,
      "total_storm_deaths": 2,
      "outcomes": { "ELIMINATED": 22, "SURVIVED_PRESUMED": 9 },
      "maps_played": { "AmbroseValley": 24, "Lockdown": 6, "GrandRift": 1 },
      "dates_active": [ "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13" ],
      "matches": [ "fbbc5d02...", "a71c3aa8..." ]
    }
  ]
}
```

### 2.5 `maps/{map_name}/journeys.json`
Contains partitioned player journey trajectories:
```json
{
  "map_id": "AmbroseValley",
  "total_journeys": 836,
  "journeys": [
    {
      "journey_id": "cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed_ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0",
      "user_id": "cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed",
      "match_id": "ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0",
      "map_id": "AmbroseValley",
      "date": "2026-02-10",
      "entity_type": "human",
      "start_ts": 1770754537,
      "end_ts": 1770755291,
      "duration_seconds": 754,
      "distance_travelled_meters": 1124.37,
      "starting_position": { "x": -301.45, "y": 124.97, "z": -355.55, "u": 0.0762, "v": 0.1305 },
      "ending_position": { "x": -112.5, "y": 130.1, "z": -120.3, "u": 0.2861, "v": 0.3919 },
      "terminal_event": "BotKilled",
      "outcome": "ELIMINATED",
      "event_counts": { "Position": 63, "Loot": 19, "BotKill": 5, "BotKilled": 1 },
      "positions_count": 63,
      "discrete_events_count": 25,
      "positions": [
        { "ts": 1770754537, "x": -301.45, "y": 124.97, "z": -355.55, "u": 0.0762, "v": 0.1305 }
      ],
      "events": [
        { "event": "Loot", "ts": 1770754557, "iso": "2026-02-10T20:15:57Z", "x": -295.12, "y": 125.0, "z": -350.2, "u": 0.0832, "v": 0.1364 }
      ]
    }
  ]
}
```

### 2.6 `maps/{map_name}/heatmaps.json`
Dense 64x64 grid matrix per layer:
```json
{
  "map_id": "AmbroseValley",
  "grid_size": 64,
  "coordinate_system": "UV_normalized (0.0 to 1.0)",
  "row_orientation": "row 0 is North (v=1.0), row N-1 is South (v=0.0)",
  "col_orientation": "col 0 is West (u=0.0), col N-1 is East (u=1.0)",
  "layers": {
    "human_traffic": {
      "name": "human_traffic",
      "total_points": 35429,
      "max_cell_count": 312,
      "active_cells_count": 1420,
      "grid": [[0, 0, 12, ...], [0, 5, 24, ...]]
    },
    "bot_traffic": { "total_points": 13152, "max_cell_count": 180, "active_cells_count": 890, "grid": [...] },
    "loot": { "total_points": 8988, "max_cell_count": 95, "active_cells_count": 640, "grid": [...] },
    "bot_kill": { "total_points": 1774, "max_cell_count": 32, "active_cells_count": 310, "grid": [...] },
    "bot_killed": { "total_points": 487, "max_cell_count": 14, "active_cells_count": 185, "grid": [...] },
    "killed_by_storm": { "total_points": 17, "max_cell_count": 3, "active_cells_count": 14, "grid": [...] }
  }
}
```
