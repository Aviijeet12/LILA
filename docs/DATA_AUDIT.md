# LILA BLACK — Data Quality & Integrity Audit
**Project:** LILA BLACK — Player Intelligence  
**Author:** Senior Data Engineer  
**Dataset Version:** Production Gameplay Telemetry (Feb 10–14, 2026)  
**Execution Date:** 2026-11-21  

---

## 1. Executive Summary

A comprehensive data quality audit was conducted across **1,243 Apache Parquet files** and **89,104 telemetry events** spanning 5 production days of LILA BLACK gameplay. 

The dataset demonstrates **high structural completeness** (0% null values across all columns, 0% missing identifiers, 100% valid coordinates within map bounds). However, the audit revealed **three critical data pipeline anomalies** that must be handled prior to analytics and frontend visualization:
1. **Timestamp Representation Bug:** Parquet schema declares `timestamp[ms]`, but values are stored as 10-digit Unix epoch **seconds**. Parquet readers interpret this as January 1970 (`1970-01-21`).
2. **Minimap Resolution Discrepancy:** The README specifies all minimaps are `1024x1024`, but raw image files range from `2160x2158` to `9000x9000`.
3. **Cross-file & In-file Duplication:** 1,420 exact duplicate rows exist, 3,917 same-tick event collisions exist, and 1 complete file is duplicated across two daily directories.

---

## 2. Dataset Volume & Breakdown

### 2.1 File and Row Counts by Date

| Day Directory | Total Files | Total Records | Unique Matches | Unique Humans | Unique Bots | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `February_10` | 437 | 33,687 | 285 | 98 | 62 | Full capture day |
| `February_11` | 293 | 21,235 | 201 | 81 | 50 | Full capture day |
| `February_12` | 268 | 18,429 | 162 | 59 | 55 | Full capture day |
| `February_13` | 166 | 11,106 | 112 | 47 | 43 | Full capture day |
| `February_14` | 79 | 4,647 | 37 | 12 | 36 | Partial capture day (ended ~15:01 UTC) |
| **Total** | **1,243** | **89,104** | **796** | **245** | **94** | *Note: 1 file duplicated across days* |

### 2.2 File and Row Counts by Map

| Map Identifier | Total Files | Total Records | % of Records | Total Matches | Unique Humans | Unique Bots |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AmbroseValley` | 837 | 61,013 | 68.47% | 566 | 217 | 51 |
| `Lockdown` | 295 | 21,238 | 23.83% | 171 | 79 | 41 |
| `GrandRift` | 111 | 6,853 | 7.69% | 59 | 29 | 30 |
| **Total** | **1,243** | **89,104** | **100.00%** | **796** | **245** | **94** |

### 2.3 Volume by Entity Type

| Entity Classification | Total Files | Total Records | % of Records | Unique IDs | Avg Records / File |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Human Players** (UUID `user_id`) | 782 | 66,161 | 74.25% | 245 | 84.60 |
| **Bots (AI)** (Numeric `user_id`) | 461 | 22,943 | 25.75% | 94 | 49.77 |
| **Total** | **1,243** | **89,104** | **100.00%** | **339** | **71.68** |

---

## 3. Schema & Data Quality Audit

| Audit Dimension | Target Column(s) | Expected Condition | Audit Result | Severity | Resolution / Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Missing Coordinates** | `x`, `y`, `z` | No null, NaN, or Inf | **0 nulls, 0 NaNs, 0 Infs** (100% complete) | PASS | No imputation needed. |
| **Missing Identifiers** | `user_id`, `match_id` | Valid string ID | **0 nulls, 0 empty strings** | PASS | All entities & matches identified. |
| **Missing Map ID** | `map_id` | Non-null valid map | **0 nulls, 0 unknown maps** | PASS | Matches cleanly partition into 3 maps. |
| **Missing Event** | `event` | Non-null bytes | **0 nulls** | PASS | All rows contain binary event tags. |
| **Out-of-Bounds Coords** | `x`, `z` | U, V in [0.0, 1.0] | **0 out-of-bounds points** | PASS | Coordinates strictly inside world boundary. |
| **Exact Row Duplicates** | All columns | No duplicate rows | **1,420 duplicate rows (1.59%)** | LOW | Deduplicate via `.drop_duplicates()`. |
| **Same-Tick Event Collisions** | `user_id`, `ts` | Unique timestamp | **3,917 rows (4.40%)** | INFO | Valid game tick behavior (simultaneous movement + action). |
| **Cross-Day File Duplicate** | Filename | Unique per dataset | **1 file duplicated** (88 rows) | LOW | `cfa03e9f..._ac049b28...` in Feb 10 & Feb 11. Drop duplicate file. |
| **Timestamp Unit Mismatch** | `ts` | UTC wall-clock time | **10-digit epoch seconds stored in `timestamp[ms]`** | HIGH | Multiply integer by 1,000 or parse as epoch seconds. |
| **Non-Monotonic Timestamps** | `ts` | Monotonically non-decreasing | **3 files with negative time diffs** | LOW | Sort each file by `ts` ascending during ETL. |
| **Bot Event Misattribution** | `event`, `user_id` | Bots emit `Bot*` events | **636 `Position`, 115 `Loot` in bot files** | MEDIUM | Recognize bot `1429` as capable of looting and emitting standard `Position`. |
| **PvP Kill/Death Concurrency** | `event` | Separate killer & victim | **3 `Kill` and 3 `Killed` in same file** | MEDIUM | Telemetry logger emits both events to single client; no cross-player victim logged. |

---

## 4. Coordinate System & Boundary Audit

Coordinates were projected into UV space using the formula:
$$u = \frac{x - \text{origin\_x}}{\text{scale}}, \quad v = \frac{z - \text{origin\_z}}{\text{scale}}$$

| Map | Scale | Origin X | Origin Z | Observed X Range | Observed Z Range | Observed U Range | Observed V Range | Out of Bounds |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | 900.0 | -370.0 | -473.0 | [-324.97, 301.79] | [-380.01, 360.76] | [0.0500, 0.7464] | [0.1033, 0.9264] | **0 (0.00%)** |
| **GrandRift** | 581.0 | -290.0 | -290.0 | [-225.90, 256.62] | [-194.00, 170.11] | [0.1103, 0.9408] | [0.1652, 0.7919] | **0 (0.00%)** |
| **Lockdown** | 1000.0 | -500.0 | -500.0 | [-406.63, 348.36] | [-285.10, 329.24] | [0.0934, 0.8484] | [0.2149, 0.8292] | **0 (0.00%)** |

**Vertical Elevation Range (`y`):**
- `AmbroseValley`: [100.00, 162.67] (terrain variation of 62.67 meters)
- `GrandRift`: [8.14, 46.86] (terrain variation of 38.72 meters)
- `Lockdown`: [32.58, 70.55] (terrain variation of 37.97 meters)

---

## 5. Event Distribution Audit

| Event Name | Overall Count | % Total | Human Count | Bot Count | Functional Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Position` | 51,347 | 57.63% | 50,711 | 636 | Player movement trajectory points |
| `BotPosition` | 21,712 | 24.37% | 0 | 21,712 | Bot movement trajectory points |
| `Loot` | 12,885 | 14.46% | 12,770 | 115 | Item pickup location |
| `BotKill` | 2,415 | 2.71% | 2,232 | 183 | Bot elimination (recorded by killer) |
| `BotKilled` | 700 | 0.79% | 403 | 297 | Entity eliminated by bot (recorded by victim) |
| `KilledByStorm` | 39 | 0.04% | 39 | 0 | Player death to environmental storm zone |
| `Kill` | 3 | 0.003% | 3 | 0 | PvP Player Kill (recorded by player) |
| `Killed` | 3 | 0.003% | 3 | 0 | PvP Player Death (recorded by player) |
| **Total** | **89,104** | **100.00%** | **66,161** | **22,943** | |

---

## 6. Match Duration & Temporal Dynamics

When evaluated using true Unix epoch seconds:
- **Minimum Journey Duration:** 13 seconds (early elimination)
- **Maximum Journey Duration:** 890 seconds (14.83 minutes)
- **Mean Journey Duration:** 352.34 seconds (5.87 minutes)
- **Median Journey Duration:** 306.00 seconds (5.10 minutes)
- **Movement Sampling Frequency:** Points are sampled predominantly at intervals of 5, 10, 15, or 20 seconds during movement, with discrete events occurring on tick intervals.

---

## 7. Minimap Asset Audit

| Image Filename | File Size | Dimensions (W x H) | Format | Mode | Aspect Ratio | README Stated Dimensions | Variance Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AmbroseValley_Minimap.png` | 9.29 MB | 4320 x 4320 | PNG | RGBA | 1.0000 | 1024 x 1024 | Raw asset is 4.22x larger |
| `GrandRift_Minimap.png` | 2.74 MB | 2160 x 2158 | PNG | RGBA | 1.0009 | 1024 x 1024 | Raw asset is non-square (2px height difference) |
| `Lockdown_Minimap.jpg` | 11.29 MB | 9000 x 9000 | JPEG | RGB | 1.0000 | 1024 x 1024 | Raw asset is 8.79x larger |

**Engineering Impact:**
Frontend coordinate transformation must normalize world coordinates to UV space `[0, 1]` first, and then multiply by the rendering canvas dimensions (e.g. `canvas.width`, `canvas.height`) rather than hardcoding `1024`.
