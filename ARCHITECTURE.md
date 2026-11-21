# LILA BLACK â€” Architecture Specification

> End-to-end tactical telemetry and spatial intelligence platform for production game telemetry analysis.

---

## 1. System Overview

LILA BLACK ingests production gameplay telemetry from Nakama game servers, normalizes irregular coordinate conventions across three operational theaters, constructs journey trajectories, generates 64Ã—64 spatial heatmaps, and delivers interactive analytics through a high-performance React/TypeScript application.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           DATA PIPELINE ARCHITECTURE                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
  Raw Parquet Telemetry (1,243 files, 89,104 records)
         â”‚
         â–¼
  Python ETL Pipeline (scripts/process_telemetry.py)
         â”‚  â”œâ”€ Data Cleaning, Deduplication & Event Decoding
         â”‚  â”œâ”€ Coordinate Normalization & UV Mapping (Scale S, Origin Xâ‚€, Zâ‚€)
         â”‚  â””â”€ Journey Reconstruction & 64Ã—64 Spatial Heatmap Generation
         â–¼
  Processed JSON Datasets & WebP Minimaps (data/processed/ & public/data/processed/)
         â”‚
         â–¼
  React 18 + TypeScript Frontend (Zustand Global Store + Canvas 2D Renderer)
         â”œâ”€â”€ Map Explorer (/map-explorer) â”€â”€â”€â”€ Zoom/Pan, Entity Trajectories, Replay
         â”œâ”€â”€ Player Intelligence (/players) â”€â”€ Entity Directory, Behavioral Profiles
         â”œâ”€â”€ Combat Analysis (/combat) â”€â”€â”€â”€â”€â”€â”€ Discrete Combat Events & Minimap Pins
         â”œâ”€â”€ Region Intelligence (/regions) â”€â”€ 64Ã—64 Multi-Layer Grid Analytics
         â”‚
         â–¼
  Analytics & AI Map Analyst (/analyst)
         â”œâ”€â”€ Deterministic Insight Engine (insightEngine.ts) â”€â”€â–º Exact Computations
         â”‚                                                      (Immutable Output)
         â””â”€â”€ Optional Server-Side LLM Adapter (Optional) â”€â”€â”€â”€â”€â”€â”€â–º Auxiliary Commentary
                                                                (Zero Client Secrets)
```

---

## 2. Data Ingestion & ETL

The Python ETL pipeline (`scripts/process_telemetry.py`) processes raw Parquet logs in ~11 seconds:
1. **Cleaning & Deduplication**: Discards identical file duplicates, decodes binary event names (`BotKill`, `BotKilled`, `Kill`, `Killed`, `KilledByStorm`, `Loot`), and handles irregular timestamp scaling (resolving seconds vs. milliseconds anomaly).
2. **Journey Assembly**: Aggregates 72,849 movement samples into 1,242 coherent journeys across 796 matches.
3. **Heatmap Generation**: Discretizes spatial events into 64Ã—64 cell density grids across 6 layers per map.
4. **Minimap Optimization**: Converts multi-megabyte source assets to optimized 2048px WebP images.

---

## 3. Coordinate Transformation

Each map uses an affine transformation converting engine world coordinates $[X, Z]$ to normalized $[U, V]$ space and pixel buffers:

$$\begin{aligned}
u &= \frac{X - X_0}{S}, \quad v = 1.0 - \frac{Z - Z_0}{S} \\
\text{pixel}_x &= u \times (\text{width} - 1), \quad \text{pixel}_y = v \times (\text{height} - 1)
\end{aligned}$$

| Map Name | Scale ($S$) | Origin $X_0$ | Origin $Z_0$ | Grid Partition | Sector Size |
|---|---:|---:|---:|:---:|:---:|
| **Ambrose Valley** | 900.0 m | âˆ’370.0 m | âˆ’473.0 m | $64 \times 64$ | $14.06\text{ m} \times 14.06\text{ m}$ ($197.8\text{ m}^2$) |
| **Grand Rift** | 581.0 m | âˆ’290.0 m | âˆ’290.0 m | $64 \times 64$ | $9.08\text{ m} \times 9.07\text{ m}$ ($82.3\text{ m}^2$) |
| **Lockdown** | 1000.0 m | âˆ’500.0 m | âˆ’500.0 m | $64 \times 64$ | $15.62\text{ m} \times 15.62\text{ m}$ ($244.1\text{ m}^2$) |

Calibration verified with round-trip error $< 1.71 \times 10^{-13}\text{ m}$.

---

## 4. Processed Data Architecture

All static analytical assets reside in `data/processed/` and are mirrored to `frontend/public/data/processed/`:
- `global_stats.json`: Dataset-level tallies (796 matches, 1,242 journeys, 14,750 discrete events, 339 players).
- `events/events.json`: 14,750 cleaned discrete events with spatial coordinates, timestamps, and map IDs.
- `players/players.json`: Directory of 339 entities (245 humans, 94 bots) with lifetime metrics.
- `maps/<map>/journeys.json`: Reconstructed match journeys with timestamped waypoints.
- `maps/<map>/heatmaps.json`: 64Ã—64 rasters across 6 layers (`human_traffic`, `bot_traffic`, `loot`, `bot_kill`, `bot_killed`, `killed_by_storm`).
- `minimaps/*.webp`: Lightweight map backgrounds.

---

## 5. Frontend Architecture

- **Core Stack**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React.
- **State Management**: Zustand store (`useTelemetryStore.ts`) providing synchronized caching, filtering, and playback time coordination.
- **Rendering**: Custom Canvas 2D render loop (`MapCanvas.tsx`) supporting smooth pan/zoom, high-DPI scaling, offscreen heatmap blending, and sub-second interpolation.
- **Modularity**: Route-level code-splitting via `React.lazy()` with isolated Suspense boundaries for zero bundle bloat.

---

## 6. Analytics & AI Map Analyst

- **Deterministic Core (`insightEngine.ts`)**: All metrics, rankings, ratios, and sector bounds are calculated strictly from local datasets. Numbers are immutable and 100% reproducible.
- **Controlled Intent Parsing (`queryClassifier.ts`)**: Categorizes natural-language inquiries into 10 deterministic routines without external API roundtrips.
- **Optional Server-Side LLM (`llmAdapter.ts`)**: If configured via `VITE_ANALYST_API_URL`, sends only computed numerical summaries to generate auxiliary narrative synthesis. The client contains zero API keys.
- **Independent Execution**: The platform works identically and completely offline without any external LLM provider configured.

---

## 7. Testing & Validation

- **Backend**: 52 unit tests (`pytest tests/ -v`) validating coordinate transforms, UV clamping, Parquet parsing, and JSON schema conformity.
- **Frontend**: 127 unit and integration tests across 16 test suites (`npm test -- --run`) using Vitest and Testing Library.
- **Data Integrity**: 100% concordance verified between `events.json` discrete event totals and `heatmaps.json` layer points; zero unmapped map IDs; zero duplicate records.

---

## 8. Known Limitations

1. **No Extraction Telemetry**: Match termination without an elimination record is classified as `SURVIVED_PRESUMED`.
2. **Unilateral Combat Events**: `BotKill` and `BotKilled` are emitted independently; no paired killer-victim relationship is recorded.
3. **No Weapon / Damage Metrics**: Schema contains no weapon tiers, ammunition counts, damage amounts, or health pools.
4. **Aggregated Heatmaps**: Spatial heatmap rasters represent 5-day totals and cannot be filtered to sub-hour intervals.
5. **Position Emissions $\ne$ Headcounts**: Traffic pings reflect ~1 Hz sampling frequency, not unique player counts.
