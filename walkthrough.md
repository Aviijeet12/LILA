# LILA BLACK — Reviewer Walkthrough & Navigation Guide

This document guides technical reviewers through the **LILA BLACK — Player Intelligence** platform in an optimal, logical sequence to evaluate architecture, performance, telemetry fidelity, and spatial analytics.

---

## Step 1: Overview & Dataset Health Summary

- **Route**: `/` (`OverviewPage`)
- **What to Inspect**:
  - Global telemetry statistics cards: 796 matches, 1,242 journeys, 339 entities (245 humans, 94 bots), 14,750 discrete events, 1,024.37 km total distance.
  - Cross-map comparison table with territorial coverage and match distributions.
  - Daily journey volume histogram spanning Feb 10 – Feb 14, 2026.
  - Data integrity indicator confirming verified affine coordinate calibration.
- **Capability Demonstrated**: Holistic dataset verification, multi-file JSON data ingestion, and dataset-level aggregations.
- **Reference Screenshot**: `docs/screenshots/overview_page.png`

---

## Step 2: Map Explorer & Continuous Trajectory Rendering

- **Route**: `/map-explorer` (`MapExplorerPage`)
- **What to Inspect**:
  - High-resolution minimap canvas supporting smooth mouse-wheel zoom centered on cursor, click-and-drag panning, and reset button.
  - Color-differentiated trajectories: Cyan (`#00E5FF`) for human journeys, Amber (`#F59E0B`) for server bots.
  - Hovering over trajectory segments displays real-time tooltip with entity ID, timestamp, and world coordinates $[X, Z]$.
  - Clicking any trajectory highlights it, dims unrelated paths, and opens the slide-out trajectory dossier.
  - Left control sidebar: Toggle maps (Ambrose Valley, Grand Rift, Lockdown), filter by Human Only / Bot Only / All, and search by match or entity ID.
- **Capability Demonstrated**: Custom Canvas 2D render loop, affine transformation pipeline, high-DPI scaling, and responsive trajectory filtering.
- **Reference Screenshot**: `docs/screenshots/map_explorer_page.png`

---

## Step 3: Timeline Playback & Temporal Replay

- **Route**: `/map-explorer` (bottom playback dock)
- **What to Inspect**:
  - Select a match (e.g. `m-av-1` on Ambrose Valley) and click **Play**.
  - Adjust playback speed: 0.5×, 1×, 2×, 4×.
  - Observe sub-second player head interpolation between discrete 1 Hz waypoints.
  - Progressive trajectory reveal: Past paths stay drawn while future segments remain hidden until reached.
  - Time scrubber bar with color-coded event markers. Dragging the scrubber instantly repositions all active entities.
  - Elimination event pulse effects at the exact spatial point of occurrence.
- **Capability Demonstrated**: Time-synchronized temporal simulation, trajectory interpolation, and multi-entity replay coordination.
- **Reference Screenshot**: `docs/screenshots/playback_midway.png`

---

## Step 4: Spatial Heatmaps & Micro-Sector Inspection

- **Route**: `/map-explorer` (toggle **Heatmap** in the toolbar or press `H`)
- **What to Inspect**:
  - Toggle between 6 discrete density layers: `Human Movement`, `Bot Movement`, `Loot Events`, `BotKill Events`, `BotKilled Events`, `Storm Deaths`.
  - Color ramp selector (`Thermal Glow`, `Viridis Tactical`, `Solar Flare`, `Mono Cyan`) and opacity slider.
  - Offscreen canvas rasterization rendering a 64×64 grid (4,096 cells) with zero animation stutter.
  - Click any grid cell to open the **Sector Dossier**: Displays sector $[R, C]$, sample count, percentage of map total, exact world bounding box $[X_{\min}, X_{\max}] \times [Z_{\min}, Z_{\max}]$ in meters, and UV bounds.
  - Open **Heatmap Analytics** modal for map-wide top-10 hotspot rankings.
- **Capability Demonstrated**: Spatial discretization, offscreen canvas acceleration, coordinate conversion, and micro-sector analytics.
- **Reference Screenshot**: `docs/screenshots/heatmap_ambrose_valley.png`

---

## Step 5: Player Intelligence Directory & Behavioral Profiling

- **Route**: `/players` (`PlayerIntelligencePage`)
- **What to Inspect**:
  - Tabular directory of 339 tracked entities (245 humans, 94 bots).
  - Search by Entity ID; filter by Human / Bot / All; sort by matches played, distance travelled, session duration, and loot pickups.
  - Click any player row to open the comprehensive **Player Dossier Modal**:
    - Lifetime metrics: Total distance, matches played, total duration, average speed.
    - Outcome breakdown: Presumed Survived vs. Eliminated.
    - Event profile: Discrete loot interactions, BotKill events, and casualty occurrences.
    - Match session table: Click any match to launch Map Explorer initialized to that player's journey.
- **Capability Demonstrated**: Relational entity aggregation from unstructured event logs and deep cross-feature navigation.
- **Reference Screenshot**: `docs/screenshots/player_intelligence_page.png`

---

## Step 6: Combat Telemetry Analysis

- **Route**: `/combat` (`CombatAnalysisPage`)
- **What to Inspect**:
  - Metric summary cards: BotKill Events (2,376), BotKilled Events (697), Kill Events (3), Killed Events (3), Storm Death Events (39), Loot Events (11,632).
  - Event log table with pagination, map filter, date filter, and entity search.
  - Interactive **Combat Minimap Preview (`CombatMapPreview.tsx`)**: Plots discrete events as color-coded spatial pins directly onto map terrain.
  - Click any event row: Highlights the pin on the minimap with a radar pulse and displays the coordinate dossier.
  - Click **Replay**: Immediately jumps to `/map-explorer?map=<map>&seek=<ts>`, initializing playback at the exact second of the event.
- **Capability Demonstrated**: Neutral telemetry governance, spatial encounter pin-mapping, and temporal replay deep-linking.
- **Reference Screenshot**: `docs/screenshots/combat_analysis_page.png`

---

## Step 7: Region Intelligence & Cross-Map Footprint

- **Route**: `/regions` (`RegionIntelligencePage`)
- **What to Inspect**:
  - Global territorial footprint comparison across all three theaters: Ambrose Valley (37.99% human coverage / 39.09% union coverage), Grand Rift (23.95% / 27.76%), Lockdown (24.61% / 26.90%).
  - Multi-spectral sector density matrix: Distribution of sectors active in 1, 2, 3, 4, 5, or all 6 layers.
  - Interactive 64×64 Grid Visualizer: Inspect any cell for layer-by-layer breakdown.
  - Tactical Hub list identifying sectors where $\ge 4$ distinct telemetry layers intersect.
- **Capability Demonstrated**: Multi-dimensional spatial indexing, cross-layer density analysis, and macro-level territorial comparisons.
- **Reference Screenshot**: `docs/screenshots/region_intelligence_page.png`

---

## Step 8: AI Map Analyst (Grounded Telemetry Intelligence)

- **Route**: `/analyst` (`AnalystPage`)
- **What to Inspect**:
  - Analyst Overview Bar: Displays selected theater, date range, entity scope, and active grounding state.
  - Suggested Analytical Questions: Click any pre-configured question (e.g. *"Which areas have the highest human movement activity on Ambrose Valley?"* or *"How many storm-related death events were recorded on each map?"*).
  - Freeform query input: Try typing *"Where is loot concentrated on Lockdown?"* or *"How does human traffic compare with bot traffic on Grand Rift?"*.
  - Structured Response:
    - **Conclusion**: Plain-language executive finding generated from exact formulas.
    - **Supporting Metrics**: Cards citing raw integer counts, denominators, and units.
    - **Top Ground-Truth Sectors**: Coordinates in meters and UV space.
  - **Question Map**: Open the analyst-specific map screen with only heatmap layers supported by the answer; the relevant hotspot or inspected sector is highlighted. When no matching raster exists for an event type, the map explains that and avoids displaying an unrelated layer.
    - **Calculation Methodology & Semantic Boundaries**: Collapsible disclosures detailing mathematical formulas and data limitations.
  - Boundary testing: Type *"Who is the best player?"* or *"What is the best weapon tier?"* to observe strict out-of-scope handling.
- **Capability Demonstrated**: Controlled natural-language intent parsing, deterministic insight computation, immutable numerical grounding, and fallback resilience.
- **Reference Screenshot**: `docs/screenshots/analyst_insight_response.png`

---

## Step 9: Reviewing the Three Ground-Truth Insights

- **Document**: [`INSIGHTS.md`](INSIGHTS.md)
- **What to Review**:
  1. **Finding 1 (Operational Asymmetry)**: Ambrose Valley concentrates 76.4% of discrete events (11,266 / 14,750), 67.3% of journeys (836 / 1,242), and 70.2% of human position samples (35,429 / 50,501).
  2. **Finding 2 (Human vs. Bot Spatial Distribution)**: Grand Rift exhibits 45.7% human-active sectors without recorded bot samples (448 / 981 human-active sectors), 2.4× higher than Ambrose Valley (19.2%) and 2.2× higher than Lockdown (20.6%). Telemetry confirms observed spatial co-occurrence divergence without establishing underlying causation.
  3. **Finding 3 (Loot Event Concentration)**: Across all maps, the top 10 sectors by recorded Loot event count hold ~19% of each map's Loot events; on Ambrose Valley, the top 5% of human-active sectors (78 cells) hold 57.2% of all recorded Loot events (5,140 / 8,988).
- **Capability Demonstrated**: Rigorous scientific telemetry analysis with exact denominators, sample sizes, world coordinates, and methodological limitations.
