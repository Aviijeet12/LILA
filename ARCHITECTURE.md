# LILA BLACK — Architecture Specification

> One-page technical architecture, data pipeline, coordinate mapping methodology, and engineering tradeoffs for the LILA BLACK Player Intelligence platform.

---

## 1. Technology Stack & Selection Rationale

| Layer | Technology | Why We Picked It Over Alternatives |
|---|---|---|
| **Data ETL & Parsing** | **Python 3.10+ (PyArrow, Pandas, NumPy, Pillow)** | Selected for high-throughput vectorized Parquet reading and zero-copy columnar memory mapping. Fast enough to clean, normalize, and discretize 89,104 raw records into 64×64 grids in ~11 seconds, avoiding heavy database dependencies like Spark or full DuckDB server processes. |
| **Frontend Framework** | **React 18 + TypeScript 5 (Vite 5)** | Strict type safety across spatial schemas (Waypoints, Journeys, Events, Affine Transforms) combined with sub-second hot-module reloading and optimized static chunking (~1.08s production build). |
| **Spatial Rendering** | **HTML5 Canvas 2D (Custom Matrix Engine)** | **Picked over SVG and WebGL.** SVG introduces prohibitive DOM overhead when rendering 72,000+ trajectory points and continuous timeline paths (causing severe frame drops). WebGL introduces unnecessary shader compilation complexity and device compatibility friction for 2D orthographic map projections. Canvas 2D effortlessly sustains smooth 60 FPS sub-second interpolation, high-DPI retina scaling, and offscreen heatmap alpha blending. |
| **State Management** | **Zustand 5** | Minimal boilerplate with atomic selector subscriptions. Prevents unnecessary re-renders of heavy canvas elements while synchronizing timeline playback clocks, active filters, and deep-link parameters. |
| **Design & UI System** | **Tailwind CSS 3 + Lucide React** | Low-overhead tactical dark command center aesthetic (`#080D14` base, `#101925` surfaces, `#00D9F5` human cyan, `#F5A623` bot amber) with responsive layout containment. |
| **Analytics & AI Engine** | **Deterministic In-Browser Engine (`insightEngine.ts`)** | 100% deterministic, offline mathematical computation from local JSON artifacts. Zero hallucination risk, sub-millisecond response latency, and no runtime API key or cloud subscription dependencies. |

---

## 2. End-to-End Data Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA PIPELINE ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────┘
  Raw Parquet Telemetry (1,243 files, 89,104 records)
         │
         ▼
  Python ETL Pipeline (scripts/process_telemetry.py)
         │  ├── Clean & Deduplicate (file hash checks, timestamp scale normalization)
         │  ├── Event Parsing (Loot, BotKill, BotKilled, Kill, Killed, KilledByStorm)
         │  ├── Coordinate Calibration & Affine Projection (Scale S, Origin X₀, Z₀)
         │  └── Spatial Discretization (64×64 cell density rasters across 6 layers)
         ▼
  Processed Analytical Datasets (data/processed/ & frontend/public/data/processed/)
         │  ├── global_stats.json (796 matches, 1,242 journeys, 339 entities, 14,750 events)
         │  ├── events/events.json (14,750 discrete records with world [X, Z] and UV [u, v])
         │  ├── players/players.json (339 entity profiles: 245 humans, 94 bots)
         │  ├── maps/<map>/journeys.json (1 Hz timestamped waypoint trajectories)
         │  └── maps/<map>/heatmaps.json (64×64 density grids per layer)
         ▼
  React Frontend Architecture (Zustand Global Store + Custom Canvas Viewport)
         ├── Map Explorer (/map-explorer)       ──► Canvas 2D Pan/Zoom, Trajectories, Playback
         ├── Player Intelligence (/players)     ──► In-Page Match Replay, Behavioral Dossiers
         ├── Combat Analysis (/combat)          ──► Discrete Event Table & Interactive Minimap
         ├── Region Intelligence (/regions)     ──► Satellite Map Heatmap & 64×64 Sector Analytics
         └── AI Map Analyst (/analyst)          ──► Deterministic Telemetry Intelligence
```

---

## 3. Game Coordinates to Minimap Mapping

### Coordinate System Discrepancy
- **Game Engine World Space**: Right-handed 3D Cartesian space where $X$ represents East/West, $Z$ represents North/South, and positions can span negative or positive metric values in meters.
- **Minimap Canvas Space**: 2D pixel space with origin $(0, 0)$ positioned at the **top-left** corner, where $X_{\text{px}}$ increases to the right and $Y_{\text{px}}$ increases **downward**.

### Mathematical Model & Derivation
To map any world coordinate $(X, Z)$ to normalized UV coordinates $[0, 1]$ and screen pixel coordinates $(X_{\text{px}}, Y_{\text{px}})$, we apply a calibrated affine bounding-box transformation:

$$u = \frac{X - X_0}{S}, \quad v = \frac{Z - Z_0}{S}$$

Because canvas pixel $Y$ runs top-to-bottom while game world $Z$ points upward, the vertical axis is inverted:

$$X_{\text{px}} = u \times (\text{width} - 1), \quad Y_{\text{px}} = (1.0 - v) \times (\text{height} - 1)$$

### Calibrated Map Calibration Parameters

| Map Identifier | Bounding Scale ($S$) | Origin Offset $X_0$ | Origin Offset $Z_0$ | 64×64 Sector Dimensions | World Area Covered |
|---|---:|---:|---:|:---:|:---:|
| **Ambrose Valley** | 900.0 m | −370.0 m | −473.0 m | $14.06\text{ m} \times 14.06\text{ m}$ ($197.8\text{ m}^2$) | $810,000\text{ m}^2$ |
| **Grand Rift** | 581.0 m | −290.0 m | −290.0 m | $9.08\text{ m} \times 9.07\text{ m}$ ($82.3\text{ m}^2$) | $337,561\text{ m}^2$ |
| **Lockdown** | 1000.0 m | −500.0 m | −500.0 m | $15.62\text{ m} \times 15.62\text{ m}$ ($244.1\text{ m}^2$) | $1,000,000\text{ m}^2$ |

*Verification*: Validated by computing maximum bounding extents of 72,849 trajectory waypoints, verifying that all points land strictly within $u, v \in [0, 1]$, and confirming round-trip reversibility with precision error $< 1.71 \times 10^{-13}\text{ m}$.

---

## 4. Ambiguities & Engineering Assumptions

| Ambiguity Encountered | Observed Reality in Raw Data | Engineering Resolution / Assumption |
|---|---|---|
| **Timestamp Unit Discrepancy** | Some log entries recorded timestamps in Unix seconds ($1.77 \times 10^9$) while others recorded milliseconds ($1.77 \times 10^{12}$). | Evaluated order of magnitude in ETL: if $t > 10^{11}$, divided by 1,000 to normalize all timestamps uniformly to epoch seconds. |
| **Lack of Extraction Event** | Telemetry logs terminate when a match ends. There is no explicit `ExtractionSuccess` or `Victory` event in the schema. | Entities that reach match completion without an elimination event (`BotKilled`, `Killed`, `KilledByStorm`) are classified as `SURVIVED_PRESUMED` rather than speculating on final extraction state. |
| **Unilateral Combat Events** | `BotKill` and `BotKilled` are logged as isolated events along an individual entity's trajectory without a killer-victim foreign key. | Avoided synthesizing speculative kill-feed pairs. Both events are preserved and analyzed as independent spatial combat encounters. |
| **Human vs. Bot Identification** | The schema lacked an explicit boolean `is_bot` column in raw parquet files. | Analyzed entity ID schemas: 32-character hexadecimal UUIDs (`[a-f0-9]{32}`) represent human clients (245 entities); numeric strings (e.g. `"34"`, `"92"`) represent server bots (94 entities). |
| **Unrecorded Variables** | The telemetry does not record weapon types, damage dealt, health pools, ammunition, or player Elo/MMR. | Strictly bounded all visualizations and AI Analyst responses to recorded spatial, temporal, and discrete event variables. Transparently declared missing metrics as out-of-scope. |

---

## 5. Major Architectural Tradeoffs

| Decision Area | Option A (Considered) | Option B (Selected) | Rationale & Tradeoff |
|---|---|---|---|
| **Trajectory Rendering Engine** | **DOM / SVG Elements**<br>Each path as an `<svg><path>` | **HTML5 Canvas 2D Engine**<br>Imperative render loop with dynamic matrix transforms | SVG elements overwhelmed the browser DOM with 72,000+ nodes, freezing UI interactions. Canvas 2D delivers 60 FPS pan/zoom, sub-second trajectory interpolation, and zero DOM bloat at the cost of managing custom hit-testing. |
| **Data Delivery Pipeline** | **Dynamic Backend API Server**<br>Node/Express or FastAPI querying a SQL/Postgres database | **Pre-Computed Static JSON Artifacts**<br>Pre-processed and served via static CDN / Vite assets | Telemetry for completed matches is immutable. Pre-computing normalized journeys and 64×64 heatmap grids eliminated server infrastructure, database maintenance, network latency, and deployment hosting costs while enabling 100% offline functionality. |
| **Heatmap Discretization** | **Continuous Kernel Density Estimation (KDE)**<br>Dynamic Gaussian blur across thousands of points | **64×64 Uniform Grid Matrix**<br>4,096 discrete sectors with bilinear color palette mapping | KDE recalculation on every viewport pan/zoom caused high CPU/GPU spikes. Uniform 64×64 grid rasters compute once in Python ETL and render instantly in Canvas with predictable memory footprint ($<200\text{ KB}$ per map). |
| **AI Analyst Architecture** | **Direct Cloud LLM Call**<br>OpenAI/Gemini API streaming text responses on every user prompt | **Deterministic In-Browser Engine + Query Classifier**<br>Local regex classifier routing to immutable calculation routines | LLMs hallucinate numbers, fail at spatial arithmetic, cost money per query, and expose API keys on client apps. The local deterministic engine computes exact, reproducible figures from authoritative data with sub-millisecond response time and zero cost. |
| **Replay Architecture** | **Separate Dedicated Page**<br>Redirecting user to an isolated `/replay` route | **In-Page Containment in Player Intelligence**<br>Seamless slide-in replay screen inside `/players` | Navigating to a separate page disrupted analyst workflow and caused state resets. In-page replay maintains entity context, allows instant match switching, and provides a 1-click return to the player directory. |

---

## 6. Testing & Validation

- **Backend ETL**: 52 unit tests (`pytest tests/ -v`) validating coordinate transforms, UV clamping, Parquet parsing, and JSON schema conformity.
- **Frontend Analytical Suite**: 150 unit and integration tests across 18 test suites (`npm test -- --run`) using Vitest and Testing Library (100% pass rate).
- **Data Integrity**: 100% concordance verified between `events.json` discrete event totals and `heatmaps.json` layer points; zero unmapped map IDs; zero duplicate records.

---

## 7. Known Telemetry Boundaries

1. **No Extraction Telemetry**: Match termination without an elimination record is classified as `SURVIVED_PRESUMED`.
2. **Unilateral Combat Events**: `BotKill` and `BotKilled` are emitted independently; no paired killer-victim relationship is recorded.
3. **No Weapon / Damage Metrics**: Schema contains no weapon tiers, ammunition counts, damage amounts, or health pools.
4. **Aggregated Heatmaps**: Spatial heatmap rasters represent 5-day totals and cannot be filtered to sub-hour intervals.
5. **Position Emissions $\ne$ Headcounts**: Traffic pings reflect ~1 Hz sampling frequency, not unique player counts.

