import os

os.makedirs("docs", exist_ok=True)

dict_content = """# LILA BLACK — Data Dictionary
**Project:** LILA BLACK — Player Intelligence  
**Author:** Senior Data Engineer  
**Dataset Version:** Production Gameplay Telemetry (Feb 10–14, 2026)  
**Status:** Completed Investigation  

---

## 1. Overview & File Specifications

The telemetry dataset consists of **1,243 Apache Parquet files** partitioned across 5 daily folders (`February_10` through `February_14`). Despite having a `.nakama-0` extension rather than `.parquet`, all files conform strictly to the Apache Parquet format.

- **Total Files:** 1,243 (1,242 unique filenames; 1 file duplicated across Feb 10 and Feb 11)
- **Total Records:** 89,104 rows
- **Grain:** One record per sampled telemetry event (movement tick, combat event, storm death, or loot pickup) for a specific entity (player or bot) in a specific match.
- **File Grain:** One file per entity journey per match (`{user_id}_{match_id}.nakama-0`).

---

## 2. Parquet Schema Definition

All 1,243 files share an identical Arrow/Parquet schema consisting of **8 columns**. No schema drift was detected across files or dates.

| Column Name | Storage Type (Parquet/Arrow) | Logical Type | Nullable | Primary Source / Entity | Description & Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `user_id` | `STRING` (UTF-8) | Text Identifier | No | Player / Bot | Unique identifier of the tracked entity. Standard 36-character UUID strings represent **human players**. Short 3-to-4 digit numeric strings represent **bots**. |
| `match_id` | `STRING` (UTF-8) | Text Identifier | No | Match Session | Unique identifier for the gameplay match session. Contains a standard UUID suffixed with `.nakama-0` representing the Nakama game server instance cluster (e.g., `b71aaad8-aa62-4b3a-8534-927d4de18f22.nakama-0`). |
| `map_id` | `STRING` (UTF-8) | Categorical Enum | No | Level / Environment | Game level on which the match was hosted. Exactly three values exist: `AmbroseValley`, `GrandRift`, and `Lockdown`. |
| `x` | `FLOAT` (float32) | Continuous Float | No | World Position | In-game world X-coordinate on the horizontal ground plane (East-West axis). |
| `y` | `FLOAT` (float32) | Continuous Float | No | Elevation | In-game world vertical elevation/height coordinate (Up-Down axis). **Not used for 2D minimap projection.** |
| `z` | `FLOAT` (float32) | Continuous Float | No | World Position | In-game world Z-coordinate on the horizontal ground plane (North-South axis). |
| `ts` | `TIMESTAMP[ms]` (int64) | Epoch Timestamp | No | Event Temporal Reference | Stored in Parquet as an Arrow `timestamp[ms]` field. **Critical Data Quality Discovery:** The underlying integer values are 10-digit **Unix epoch seconds** (e.g., `1770754537`), representing wall-clock UTC time between `2026-02-09 23:58:55 UTC` and `2026-02-14 15:01:40 UTC`. Because the writer configured the Arrow schema as milliseconds, standard parsers interpret the integers as milliseconds, showing dates in January 1970 (`1970-01-21`). True wall-clock time is recovered by interpreting integers as epoch seconds. |
| `event` | `BINARY` (byte string) | Categorical Event | No | Telemetry Event Action | Byte-encoded event category string (e.g., `b"Position"`, `b"Loot"`). Requires `.decode('utf-8')` to obtain the logical event name. Exactly 8 event types exist. |

---

## 3. Detailed Field Specifications & Semantics

### 3.1 Entity Identification (`user_id`)
- **Format:**
  - **Human Player:** RFC 4122 UUID v4 format (e.g., `f4e072fa-b7af-4761-b567-1d95b7ad0108`), 36 characters with hyphens.
  - **Bot (AI):** Short numeric string, length 3 to 4 digits (e.g., `1440`, `382`).
- **Cardinality:**
  - Total Unique Entities: 339
  - Human Players: 245
  - Bots: 94
- **Retention across matches:** Human player IDs persist across multiple matches. Bot IDs are also reused across different matches (serving as AI bot pool identifiers).

### 3.2 Session Identification (`match_id`)
- **Format:** `{UUID}.nakama-0`
- **Cardinality:** 796 unique match IDs.
- **Server Cluster:** The `.nakama-0` suffix indicates Heroic Labs Nakama game server instance #0.
- **Multi-entity Match Grouping:** Grouping all files by `match_id` enables reconstructing simultaneous player and bot positions within that match session.

### 3.3 Map Identifier (`map_id`)
- **Format:** String literal from closed set: `["AmbroseValley", "GrandRift", "Lockdown"]`.
- **Integrity:** 100% consistent within each match. No match spans multiple maps.

### 3.4 Spatial Coordinates (`x`, `y`, `z`)
- **Coordinate Space:** In-game 3D world coordinate system (Unity/Unreal style right-handed/left-handed orientation where Y is Up).
- **Projection to 2D Minimap:**
  - Horizontal components are `x` and `z`.
  - `y` represents elevation/vertical terrain displacement and must be ignored when projecting onto 2D top-down minimaps.
- **Physical Extents Observed:**
  - `AmbroseValley`: X in [-324.97, 301.79], Y in [100.00, 162.67], Z in [-380.01, 360.76]
  - `GrandRift`: X in [-225.90, 256.62], Y in [8.14, 46.86], Z in [-194.00, 170.11]
  - `Lockdown`: X in [-406.63, 348.36], Y in [32.58, 70.55], Z in [-285.10, 329.24]

### 3.5 Event Categories (`event`)
Stored as raw binary bytes. Decoded strings and observed counts:

| Decoded Event String | Total Count | % of Data | Emitted By Humans | Emitted By Bots | Description & Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Position` | 51,347 | 57.63% | 50,711 | 636 | Periodic movement sample of a player. Samples position, elevation, and timestamp every 5-20 seconds. (636 rows generated by bots 1429, 1402, 1379). |
| `BotPosition` | 21,712 | 24.37% | 0 | 21,712 | Periodic movement sample of an AI bot entity. |
| `Loot` | 12,885 | 14.46% | 12,770 | 115 | Entity picked up an item or interacted with a loot container. Contains coordinates of pickup, but **no item metadata** (item ID, rarity, weapon type are not logged). |
| `BotKill` | 2,415 | 2.71% | 2,232 | 183 | Elimination of a bot. Emitted in the killer's journey (human or bot killer). Coordinates reflect killer's position. Victim ID is not logged. |
| `BotKilled` | 700 | 0.79% | 403 | 297 | Death event indicating the entity was killed by an AI bot. Emitted in the victim's file. Coordinates reflect victim's death location. Bot killer ID is not logged. |
| `KilledByStorm` | 39 | 0.04% | 39 | 0 | Player died to the contracting environmental hazard zone (storm). Emitted in the victim's file. |
| `Kill` | 3 | 0.003% | 3 | 0 | Human-vs-human combat kill. Only 3 occurrences in the entire dataset. In all 3 occurrences, paired with a concurrent `Killed` record in the same file. |
| `Killed` | 3 | 0.003% | 3 | 0 | Human-vs-human death event. Only 3 occurrences in the entire dataset. |

---

## 4. Derived & Missing Fields Analysis

| Telemetry Concept | Availability | Realization Strategy |
| :--- | :--- | :--- |
| **Spawn Point** | Implicit | Coordinates of the chronologically earliest event (`ts.min()`) in a player journey. |
| **Extraction Event** | **Unavailable** | No `Extract` event exists. Must be inferred if a player survived the match without a death event (`BotKilled`, `KilledByStorm`, `Killed`). |
| **Match Outcome** | Inferred | Must be derived from terminal event: `BotKilled` / `KilledByStorm` / `Killed` = ELIMINATED; `Position` / `Loot` = SURVIVED / EXTRACTED. |
| **Victim / Killer Linkage** | **Unavailable** | Combat events do not record cross-player IDs. Cross-referencing timestamp and coordinates across concurrent files in the same match is required for approximate attribution. |
| **Loot Item Metadata** | **Unavailable** | No payload column exists for item class, rarity, or quantity. |
| **Health / Armor / Ammo** | **Unavailable** | No player vitals or state variables are tracked in this schema. |
"""

with open("docs/DATA_DICTIONARY.md", "w", encoding="utf-8") as f:
    f.write(dict_content)
print("Wrote docs/DATA_DICTIONARY.md")
