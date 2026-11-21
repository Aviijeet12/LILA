assumptions_content = """# LILA BLACK — Data Assumptions & Technical Constraints
**Project:** LILA BLACK — Player Intelligence  
**Author:** Senior Data Engineer  
**Dataset Version:** Production Gameplay Telemetry (Feb 10–14, 2026)  
**Execution Date:** 2026-11-21  

---

## 1. Introduction

Prior to architecting data processing pipelines or frontend dashboard interfaces for LILA BLACK, data engineers must strictly distinguish between **empirically proven facts**, **statistically grounded engineering assumptions**, and **unresolved ambiguities**. 

This document classifies all findings from the telemetry and asset audit into three rigorous categories.

---

## 2. Confirmed Facts

These statements have been verified through complete static analysis and programmatic inspection of all 1,243 files, 89,104 records, and 3 minimap assets:

1. **Parquet Storage Format:** All 1,243 `.nakama-0` files are valid Apache Parquet files sharing a single unvarying 8-column Arrow schema.
2. **Zero Null Completeness:** There are **zero null values**, **zero NaNs**, and **zero infinite values** across all columns (`user_id`, `match_id`, `map_id`, `x`, `y`, `z`, `ts`, `event`).
3. **Identifier Integrity:** Every file name `{user_id}_{match_id}.nakama-0` matches the internal `user_id` and `match_id` values with 100% fidelity.
4. **Coordinate Box Boundaries:** With map configurations defined as:
   - `AmbroseValley`: Origin=(-370, -473), Scale=900
   - `GrandRift`: Origin=(-290, -290), Scale=581
   - `Lockdown`: Origin=(-500, -500), Scale=1000  
   All 89,104 coordinates fall strictly within the normalized UV range $[0.0, 1.0]$. There are zero out-of-bounds coordinates.
5. **Elevation Separation:** The `y` column exclusively tracks 3D vertical terrain elevation (height range 8m to 163m) and must not be used for 2D minimap projection.
6. **Timestamp Encoding Bug:** Parquet stores `ts` as Arrow `timestamp[ms]`, but the raw 64-bit integer values are 10-digit Unix epoch **seconds**. Interpreting raw values as seconds yields true wall-clock UTC dates from **2026-02-09 23:58:55 UTC** to **2026-02-14 15:01:40 UTC**, matching the 5 capture dates in the project manifest.
7. **Closed Event Vocabulary:** There are exactly 8 discrete event types stored in raw UTF-8 bytes: `Position`, `BotPosition`, `Loot`, `BotKill`, `BotKilled`, `KilledByStorm`, `Kill`, `Killed`.
8. **No Payload Columns:** The telemetry table contains no payload JSON, no nested structs, no item identifiers, and no health/inventory attributes.
9. **Asset Resolution Discrepancy:** The minimap images are not 1024x1024:
   - `AmbroseValley_Minimap.png`: 4320 x 4320 px (RGBA PNG)
   - `GrandRift_Minimap.png`: 2160 x 2158 px (RGBA PNG)
   - `Lockdown_Minimap.jpg`: 9000 x 9000 px (RGB JPEG)
10. **Duplicate File:** The exact file `cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed_ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0` appears in both `February_10` and `February_11`.

---

## 3. Reasonable Assumptions

These assumptions are grounded in battle-royale/extraction-shooter mechanics, telemetry patterns, and mathematical deduction:

1. **Spawn Point Deduction:** In the absence of an explicit `Spawn` event, the entity's spawn location can be inferred as the coordinates $(x, z)$ of their earliest chronological event ($\min(ts)$).
2. **Player Outcome Classification:**
   - If a player's final event is `BotKilled`, `KilledByStorm`, or `Killed`, their outcome is classified as **ELIMINATED** (Defeat).
   - If a player's final event is `Position` or `Loot`, and they reached a viable extraction or survivable game duration, their outcome can be classified as **SURVIVED / PRESUMED EXTRACTED**.
3. **Journey Continuity:** Sorting records chronologically by `ts` provides an authentic movement trajectory. The 3 files exhibiting negative timestamp jumps can be healed by sorting ascending by `ts`.
4. **Tick Event Collisions:** Records sharing identical `(user_id, ts)` where one is `Position` and the other is `Loot` or `BotKilled` represent action occurrences during that movement tick and should both be retained. Exact duplicate records (identical across all 8 columns) represent telemetry flush redundancy and should be deduplicated.
5. **Bot Identification via ID Structure:** Entities with numeric `user_id` strings (e.g. `1440`) are AI-controlled bots, while UUIDs are human players. Anomalies where bot `1429` emitted `Position` and `Loot` are treated as AI bot behavior variations rather than misclassified humans.
6. **Minimap Resizing for Web Canvas:** The 1024x1024 dimensions mentioned in the README represent the standard web canvas resolution to which high-resolution minimap assets should be rendered.

---

## 4. Unknown or Ambiguous Information

The following items cannot be determined from the provided dataset and must not be fabricated in analytics or visualizations:

1. **Explicit Extraction Success vs Disconnect:** Telemetry lacks an `Extracted` event. We cannot definitively distinguish between a player who successfully extracted via an extraction point versus a player whose client crashed or who quit to lobby.
2. **Combat Attribution (Cross-Player Linkage):** Neither `Kill`, `Killed`, `BotKill`, nor `BotKilled` records the victim ID or killer ID. When a human executes a `BotKill`, we cannot identify which specific bot was destroyed. When a human dies to `BotKilled`, we cannot identify which bot killed them.
3. **Item Identity & Rarity:** The `Loot` event provides coordinate and timestamp only. Item names (e.g. "AK-47", "Medkit"), weapon tier, loot chest type, or inventory value are completely absent.
4. **Vitals & Combat Dynamics:** Player health, shield level, ammunition count, damage dealt, and shots fired are not captured. Combat cannot be evaluated at the hit-point or damage level.
5. **Dynamic Storm Trajectory:** `KilledByStorm` events confirm the presence of a deadly storm, but no telemetry exists tracking the storm boundary, radius, center, or advance velocity over time.
6. **Match Lifecycle Bounds:** Server-side match initiation and match closure timestamps are unavailable. A match's duration can only be approximated from the earliest and latest recorded player/bot telemetry points.
"""

with open("docs/DATA_ASSUMPTIONS.md", "w", encoding="utf-8") as f:
    f.write(assumptions_content)
print("Wrote docs/DATA_ASSUMPTIONS.md")
