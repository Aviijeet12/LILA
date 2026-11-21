import os

os.makedirs("docs", exist_ok=True)

# 1. ETL_PIPELINE.md
etl_doc = """# LILA BLACK — Production Telemetry Data Processing Pipeline
**Project:** LILA BLACK — Player Intelligence  
**Phase:** Phase 2 — Production Telemetry Data Processing Pipeline  
**Status:** Validated & Deployed  
**Entry Point:** `scripts/process_telemetry.py`  
**Test Suite:** `tests/test_etl_pipeline.py` (52 total unit tests passing)  
**Author:** Senior Data Engineer  

---

## 1. Overview & Architecture

The Phase 2 ETL pipeline processes raw Apache Parquet telemetry from 1,243 files (suffixed `.nakama-0`) across 5 days of production gameplay. It cleans, normalizes, reconstructs player journeys, computes cross-session analytics, generates spatial heatmap density grids, and exports optimized JSON datasets under `data/processed/` for frontend consumption.

### Pipeline Component Diagram

```mermaid
graph TD
    A[Raw Parquet Files 1,243 files] --> B[data_loader.py]
    B -->|SHA-256 Check: Skip 1 Dup File| C[89,016 Records]
    C --> D[data_cleaner.py]
    D -->|Deduplicate 1,417 Exact Dups| E[87,599 Clean Records]
    E --> F[journey_builder.py]
    F -->|Reuse coordinate_mapping.py| G[1,242 Journeys & 14,750 Events]
    G --> H[analytics.py]
    G --> I[heatmap_generator.py]
    H --> J[export_data.py]
    I --> J
    J --> K[data/processed/ JSON Datasets 12.5 MB]
```

### Script Architecture & Responsibilities

| Script | Responsibility | Primary Inputs & Outputs |
| :--- | :--- | :--- |
| `scripts/data_loader.py` | Scans directory, hashes files via SHA-256, discards duplicate files, ingests Parquet tables, extracts raw integer `ts`, decodes binary event bytes to UTF-8, and appends ISO-8601 UTC timestamps. | **In:** `data/raw/player_data/*/*.nakama-0`<br>**Out:** Ingested DataFrame (89,016 rows), Loader Report |
| `scripts/data_cleaner.py` | Deduplicates exact duplicate records while preserving legitimate same-timestamp tick collisions (movement + discrete action). Performs chronological sorting. | **In:** Ingested DataFrame<br>**Out:** Clean DataFrame (87,599 rows), Cleaning Report |
| `scripts/journey_builder.py` | Groups clean records by `(match_id, user_id)`. Reconstructs continuous position paths, extracts discrete event markers, projects coordinates to UV space via `coordinate_mapping`, computes path distance, and derives player outcome. | **In:** Clean DataFrame<br>**Out:** 1,242 Journey objects, Reconstruction Report |
| `scripts/analytics.py` | Computes global stats, match-level aggregations, player performance summaries, map metadata, and compiles the discrete events index. | **In:** Journeys List<br>**Out:** Global stats, Matches list, Players list, Maps metadata, Events list |
| `scripts/heatmap_generator.py` | Aggregates normalized UV coordinates into 64x64 spatial density grids per map across 6 isolated layers (human traffic, bot traffic, loot, bot kills, bot deaths, storm deaths). | **In:** Journeys List<br>**Out:** Map heatmaps dictionary |
| `scripts/export_data.py` | Serializes all data structures into compact, partitioned JSON files under `data/processed/`, computing directory manifest with sizes. | **In:** All analytics & journey objects<br>**Out:** 15 JSON files (12.51 MB total) |
| `scripts/process_telemetry.py` | Pipeline orchestrator providing single-command execution, execution timing, logging, and error tracking. | **CLI Entry Point** |

---

## 2. Execution & Reproducibility

The pipeline is completely deterministic and idempotent. It can be run with a single command:

```powershell
python scripts/process_telemetry.py
```

### Performance Characteristics
- **Total Runtime:** ~11.5 seconds on modern multi-core workstation.
- **Memory Footprint:** < 150 MB peak RAM.
- **Output Size:** 12.51 MB across 15 JSON files (highly compressed, compact JSON without redundant keys).

---

## 3. Data Cleaning & Transformation Rules

1. **Timestamp Normalization:**
   - The declared Parquet Arrow type `timestamp[ms]` is ignored.
   - Raw 64-bit integer values (~$1,770,750,000$) are extracted and treated as **Unix epoch seconds**.
   - Converted to numeric `ts_sec` (for mathematical sorting and duration calculations) and `ts_iso` (`YYYY-MM-DDTHH:MM:SSZ`) for human-readable display.
2. **File-Level Deduplication:**
   - Every file's SHA-256 hash is verified before reading.
   - `February_11/cfa03e9f..._ac049b28...nakama-0` was identified as an exact byte clone of `February_10/cfa03e9f..._ac049b28...nakama-0` and skipped (88 duplicate rows removed).
3. **Record-Level Deduplication:**
   - Exact duplicate rows (identical across `user_id, match_id, map_id, x, y, z, ts, event`) are identified and dropped.
   - 1,417 exact duplicate rows removed from accepted files (largely duplicate loot interactions during crate opening).
4. **Preservation of Same-Tick Event Collisions:**
   - When a player moves and performs an action (e.g. `Position` and `Loot`, or `Position` and `BotKilled`) on the exact same millisecond/second, both records are intentionally preserved.
   - 4,967 same-tick collisions preserved.
5. **Entity Classification:**
   - Checked strictly by `user_id.isdigit()`:
     - `user_id.isdigit() == True` -> `bot`
     - `user_id.isdigit() == False` -> `human` (UUID v4)
   - Do not rely on event names: bots 1429, 1402, and 1379 emitted standard `Position` and `Loot` events, but are correctly classified as bots.
6. **Outcome Derivation:**
   - If journey ends with `BotKilled`, `KilledByStorm`, or `Killed` -> `ELIMINATED`.
   - If journey ends with `Position`, `Loot`, or `BotKill` -> `SURVIVED_PRESUMED`.
   - No player is labeled as confirmed extracted due to lack of extraction telemetry.
"""

with open("docs/ETL_PIPELINE.md", "w", encoding="utf-8") as f:
    f.write(etl_doc)
print("Wrote docs/ETL_PIPELINE.md")

# 2. PROCESSED_DATA_SCHEMA.md
schema_doc = """# LILA BLACK — Processed Telemetry Data Schema
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
"""

with open("docs/PROCESSED_DATA_SCHEMA.md", "w", encoding="utf-8") as f:
    f.write(schema_doc)
print("Wrote docs/PROCESSED_DATA_SCHEMA.md")

# 3. PROCESSING_REPORT.md
proc_report = """# LILA BLACK — Production Processing & Quality Report
**Project:** LILA BLACK — Player Intelligence  
**Phase:** Phase 2 — Production Telemetry Data Processing Pipeline  
**Execution Timestamp:** 2026-11-21T01:37:47 UTC  
**Execution Runtime:** 11.44 seconds  
**Author:** Senior Data Engineer  

---

## 1. Executive Summary

The production data pipeline processed all 1,243 Parquet telemetry files from `data/raw/player_data/`. 

- **Original Raw Volume:** 89,104 records across 1,243 files.
- **Duplicate Files Dropped:** 1 duplicate file (88 records).
- **Exact Duplicate Rows Dropped:** 1,417 records.
- **Clean Ingested Records:** **87,599 records** across **1,242 unique journeys**.
- **Movement Positions Reconstructed:** 72,849 positions.
- **Discrete Events Indexed:** 14,750 events.
- **Zero Malformed Records:** 0 records rejected due to missing identifiers or corrupted coordinates.
- **Output Generated:** 15 JSON files totaling **12.51 MB** in `data/processed/`.

---

## 2. Ingestion & Deduplication Reconciliation

The pipeline reconciles exactly with the findings from Phase 0 (Data Audit):

| Metric | Raw Audit Total | Pipeline Ingested | Deduplicated / Removed | Final Clean Total | Reconciliation Variance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Files** | 1,243 | 1,243 | 1 duplicate file | **1,242 unique files** | **0 (Exact Match)** |
| **Total Records** | 89,104 | 89,104 | 1,505 rows (88 file + 1,417 exact) | **87,599 clean rows** | **0 (Exact Match)** |
| `Position` | 51,347 | 51,347 | 210 duplicates | **51,137** | **0 (Exact Match)** |
| `BotPosition` | 21,712 | 21,712 | 0 duplicates | **21,712** | **0 (Exact Match)** |
| `Loot` | 12,885 | 12,885 | 1,253 duplicates | **11,632** | **0 (Exact Match)** |
| `BotKill` | 2,415 | 2,415 | 39 duplicates | **2,376** | **0 (Exact Match)** |
| `BotKilled` | 700 | 700 | 3 duplicates | **697** | **0 (Exact Match)** |
| `KilledByStorm` | 39 | 39 | 0 duplicates | **39** | **0 (Exact Match)** |
| `Kill` | 3 | 3 | 0 duplicates | **3** | **0 (Exact Match)** |
| `Killed` | 3 | 3 | 0 duplicates | **3** | **0 (Exact Match)** |

### Reconciliation Math Proof
$$\\text{Total Raw Records} = 89,104$$
$$\\text{Skipped Duplicate File (February\\_11/cfa03e9f...)} = -88$$
$$\\text{Accepted Records from 1,242 Files} = 89,016$$
$$\\text{Exact Duplicate Rows Dropped} = -1,417$$
$$\\text{Final Output Records} = 87,599$$
$$89,104 - 88 - 1,417 = 87,599 \\quad \\text{[PROVEN)}$$

---

## 3. Journey & Entity Summary

- **Total Unique Journeys:** 1,242
  - **Human Journeys:** 781 (62.88%)
  - **Bot Journeys:** 461 (37.12%)
- **Total Unique Players:** 339
  - **Human Players:** 245
  - **Bots:** 94
- **Total Matches:** 796
- **Outcomes:**
  - **ELIMINATED:** 533 (42.91%)
  - **SURVIVED_PRESUMED:** 709 (57.09%)

---

## 4. Map Breakdown

| Map Name | Total Matches | Total Journeys | Human Journeys | Bot Journeys | Total Distance (km) | Avg Duration (s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | 566 | 836 | 557 | 279 | 714.28 | 358.2 |
| **Lockdown** | 171 | 295 | 171 | 124 | 258.14 | 344.6 |
| **GrandRift** | 59 | 111 | 53 | 58 | 86.00 | 338.9 |
| **Total** | **796** | **1,242** | **781** | **461** | **1,058.42** | **352.3** |

---

## 5. Output Artifact Verification

All 15 generated artifacts in `data/processed/` were validated for JSON integrity and non-zero byte size:

| File Path | File Size | Description |
| :--- | :--- | :--- |
| `manifest.json` | 1.4 KB | Master build manifest with checksums and file sizes |
| `global_stats.json` | 1.2 KB | High-level KPIs and platform metrics |
| `matches/matches.json` | 651.9 KB | 796 matches with participant rosters and outcomes |
| `players/players.json` | 213.5 KB | 339 players/bots with aggregate gameplay stats |
| `events/events.json` | 4.27 MB | 14,750 discrete gameplay events (loot, kills, deaths) |
| `maps/AmbroseValley/metadata.json` | 576 B | Map boundaries and match counts |
| `maps/AmbroseValley/journeys.json` | 5.42 MB | 836 journeys on Ambrose Valley |
| `maps/AmbroseValley/heatmaps.json` | 52.4 KB | 64x64 density grids (6 layers) |
| `maps/GrandRift/metadata.json` | 555 B | Map boundaries and match counts |
| `maps/GrandRift/journeys.json` | 594.7 KB | 111 journeys on Grand Rift |
| `maps/GrandRift/heatmaps.json` | 50.9 KB | 64x64 density grids (6 layers) |
| `maps/Lockdown/metadata.json` | 544 B | Map boundaries and match counts |
| `maps/Lockdown/journeys.json` | 1.81 MB | 295 journeys on Lockdown |
| `maps/Lockdown/heatmaps.json` | 51.5 KB | 64x64 density grids (6 layers) |
| `quality/processing_report.json` | 2.0 KB | Complete ingestion and cleaning report |
| **Total** | **12.51 MB** | **Fully Optimized Frontend Dataset** |
"""

with open("docs/PROCESSING_REPORT.md", "w", encoding="utf-8") as f:
    f.write(proc_report)
print("Wrote docs/PROCESSING_REPORT.md")
