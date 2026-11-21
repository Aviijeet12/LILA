# LILA BLACK — Frontend Architecture & Implementation (Phases 3, 4, 5 & 6)

## 1. Executive Summary

The frontend for **LILA BLACK — Player Intelligence** is a production-grade, dark-mode tactical operations dashboard built with React 19, TypeScript 7, Vite 8, Tailwind CSS v4, Zustand, and HTML5 Canvas 2D. 

Phases 4, 5, and 6 elevate the Map Explorer into a comprehensive spatial exploration, match replay, and thermal telemetry intelligence engine. Phase 5 adds sub-millisecond timeline playback, smooth player head interpolation, dynamic event revelation with pulse animations, timeline event ticks with hover previews, and variable speed scrubbing.

---

## 2. Interactive Map Explorer Architecture

### 2.1 Coordinate Transformation Engine (`spatialMath.ts`)
The spatial renderer projects 3D in-game coordinates onto 2D minimaps using normalized UV intermediate space:

$$egin{aligned}
u &= rac{x - O_x}{S} \
v &= rac{z - O_z}{S} \
	ext{pixel}_x &= u 	imes 	ext{width} \
	ext{pixel}_y &= (1.0 - v) 	imes 	ext{height}
\end{aligned}$$

Because in-game $+Z$ points North (Up) while screen pixel $+Y$ points South (Down), a vertical inversion $(1.0 - v) 	imes 	ext{height}$ is applied. This aligns trajectories with the roads, bridges, and compound buildings across all 3 maps:
- **Ambrose Valley**: $S = 900.0, O_x = -370.0, O_z = -473.0$ ($2048 	imes 2048$ px)
- **Grand Rift**: $S = 581.0, O_x = -290.0, O_z = -290.0$ ($2048 	imes 2046$ px, non-square preserved)
- **Lockdown**: $S = 1000.0, O_x = -500.0, O_z = -500.0$ ($2048 	imes 2048$ px)

Inverse mapping for cursor hovering and click selection:
$$egin{aligned}
u &= rac{	ext{pixel}_x}{	ext{width}} \
v &= 1.0 - rac{	ext{pixel}_y}{	ext{height}} \
x &= O_x + u 	imes S \
z &= O_z + v 	imes S
\end{aligned}$$

### 2.2 Zoom & Pan Math
Transform state consists of `{ panX, panY, zoom }` clamped to $[0.6	imes, 14.0	imes]$:
- **Cursor-Centered Zoom**: When zooming via mouse wheel at cursor $(c_x, c_y)$:
  $$egin{aligned}
  m_x &= rac{c_x - 	ext{pan}_x}{	ext{zoom}} \
  m_y &= rac{c_y - 	ext{pan}_y}{	ext{zoom}} \
  	ext{pan}_x' &= c_x - m_x 	imes 	ext{zoom}' \
  	ext{pan}_y' &= c_y - m_y 	imes 	ext{zoom}'
  \end{aligned}$$
- **Canvas Matrix Transform**: The Canvas 2D context applies:
  ```typescript
  ctx.scale(dpr, dpr);
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);
  ```
  Both the background minimap image and all path vectors/event markers are drawn in natural map pixel space $(0 \dots 	ext{width}, 0 \dots 	ext{height})$, guaranteeing alignment under arbitrary zoom and pan.

### 2.3 Visual Hierarchy & Encodings
- **Human Trajectories**: Solid Cyan paths (`#00E5FF`), lineWidth 1.5px.
- **Bot Trajectories**: Dashed Purple paths (`#A855F7`), dash pattern `[5, 3]`.
- **Selected Journey Highlight**:
  - Rendered in illuminated cyan/purple with glowing drop shadow (`shadowBlur: 10`).
  - Line width elevated to 3.5px.
  - Background journeys dimmed to 12% alpha.
  - **Spawn Landmark**: Green emerald circle (`#10B981`) marking first recorded tick.
  - **Terminal Landmark**: Rose square (`#EF4444`) for `ELIMINATED`, emerald diamond (`#10B981`) for `SURVIVED_PRESUMED`.
- **Discrete Event Markers**:
  - `Loot`: Amber Diamond (`#F59E0B`)
  - `BotKill`: Rose Triangle (`#F43F5E`)
  - `BotKilled`: Crimson Cross (`#DC2626`)
  - `KilledByStorm`: Indigo Ring (`#6366F1`)
  - `Kill`: Orange Star (`#F97316`)
  - `Killed`: Purple Square (`#BE185D`)

---

## 3. Component Hierarchy

```
MapExplorerPage
├── Sidebar
│   ├── Active Map Selector (AmbroseValley, GrandRift, Lockdown)
│   ├── Entity Filter (All, Human, Bot)
│   ├── Date Filter (Dropdown)
│   ├── Matches List (Scrollable, participant counts)
│   ├── Layer Toggles (All 8 layers + All On/Off)
│   └── Reset All Filters Action
└── Canvas Viewport
    ├── Status Bar (Visible count, active match tag, active journey tag)
    ├── MapCanvas (HTML5 Canvas 2D, pan/drag, wheel zoom, click hit-testing)
    │   ├── MapLegend (Collapsible visual legend)
    │   ├── MapControls (+, -, Fit, Reset, Coordinate readout)
    │   └── TooltipOverlay (Hover card for events/journeys)
    └── JourneyDetailsPanel (Slide-over telemetry inspection card)
```

---

## 4. Performance Optimizations

1. **`requestAnimationFrame` Render Loop**: Redraws are scheduled via rAF and cancelled if a newer frame arrives, preventing GPU pipeline thrashing during rapid mouse wheel zooms.
2. **Device Pixel Ratio (DPR) Scaling**: The backing canvas buffer matches physical display pixels (`rect.width * dpr`), preventing blurry lines on retina / high-DPI screens.
3. **Viewport & Spatial Hit-Testing**: Distance-squared calculations (`distSq`) bypass expensive square roots for hover tooltips. Event markers take hit precedence over continuous line paths.
4. **Sub-scaled Marker Sizing**: Marker radiuses scale smoothly with `Math.pow(zoom, 0.3)`, remaining distinct and clickable across $1	imes$ to $14	imes$ zoom levels without cluttering the view.

---

---

## 5. Timeline Playback & Temporal Replay Engine (Phase 5)

### 5.1 Architecture & Render Loop
Match replay is driven by the dedicated `useTimelinePlayback` hook using an un-throttled `requestAnimationFrame` loop, completely decoupled from global application re-renders:
- **Time Representation**: Maintains exact integer Unix epoch seconds (`playbackTs`) alongside sub-second fractional accumulation (`accumulatedMs`) scaled by the active playback speed (0.5x, 1x, 2x, 4x).
- **State Segregation**: Playback position and animation frames execute inside hook-level state and refs (`requestAnimationFrame`). Global Zustand state is not bombarded with 60fps updates, preserving smooth rendering and responsive UI controls.
- **Playback Controls**:
  - `play()`, `pause()`, `togglePlay()`
  - `restart()`: Resets timestamp to `timelineRange.minTs` and auto-plays
  - `seekToTimestamp(ts)`: Clamps target timestamp within match boundaries `[minTs, maxTs]`
  - `seekToProgress(0.0 - 1.0)`: Normalized scrubber positioning
  - `setSpeed(0.5 | 1 | 2 | 4)`: Live speed switching during active playback
  - **Completion State**: Automatically pauses and emits `isCompleted = true` upon reaching `maxTs`, displaying a high-contrast "Replay Complete" indicator.

### 5.2 Progressive Trajectory & Head Interpolation Math
Rather than showing static full-match polyline tracks, the canvas dynamically slices journeys up to `playbackTs`:
1. **Path Slicing (`getProgressivePositions`)**:
   - Telemetry position samples are filtered to $t_i \le \text{playbackTs}$.
   - If the player has not yet spawned ($t_0 > \text{playbackTs}$), no path or markers are rendered.
   - If the player was eliminated prior to `playbackTs`, the trajectory remains rendered up to the terminal position, with the elimination marker displayed.
2. **Player Head Interpolation (`interpolatePosition`)**:
   - For an active player between consecutive samples $P_1(x_1, z_1, t_1)$ and $P_2(x_2, z_2, t_2)$ where $t_1 \le t \le t_2$:
     $$\alpha = \frac{t - t_1}{t_2 - t_1}$$
     $$x(t) = x_1 + \alpha(x_2 - x_1), \quad z(t) = z_1 + \alpha(z_2 - z_1)$$
   - The interpolated position is mapped into canvas pixels $(p_x, p_y)$ and rendered as a distinct glowing tactical marker:
     - **Human**: Solid cyan circle (`#00E5FF`) with outer radar ring.
     - **Bot**: Solid purple circle (`#A855F7`) with dashed perimeter.
   - Live directional trail segment connects the last confirmed sample to the interpolated head position.

### 5.3 Temporal Event Revelation & Pulse FX
- Discrete gameplay events (`Loot`, `BotKill`, `BotKilled`, `KilledByStorm`, `Kill`, `Killed`) remain hidden until their historical timestamp occurs ($t_{\text{event}} \le \text{playbackTs}$).
- **Tactical Event Pulse**: Events that occurred within the last 12 seconds of replay time render an expanding, fading concentric ripple circle, highlighting recent combat or item pickups to the analyst.
- **Temporal Hit-Testing**: Tooltip hovers and selection clicks only detect events that have already been revealed and journeys that have spawned by `playbackTs`.

### 5.4 Timeline Control Bar & Interactive Scrubber
Mounted immediately beneath the canvas viewport:
- **Time Readouts**:
  - Relative elapsed match time: `mm:ss` / `mm:ss` total match duration.
  - Absolute UTC clock: `YYYY-MM-DD HH:MM:SS UTC`.
  - Progress percentage: `XX.X%`.
- **Interactive Scrubber Track**:
  - Full-width interactive scrubber supporting click-to-seek and drag-to-scrub.
  - **Event Tick Marks**: Vertical color-coded tick marks plotted across the scrubber track for every discrete event in the match (amber for loot, rose for kills, crimson for deaths).
  - **Hover Preview**: Moving cursor over the scrubber reveals a floating tactical tooltip displaying the hovered relative time (`mm:ss`), UTC timestamp, and nearest event description.

---

---

## 6. Spatial Heatmaps & Thermal Intelligence Architecture (Phase 6)

### 6.1 Data Ingestion & Grid Projection
Heatmap matrices are ingested directly from `data/processed/maps/<map_name>/heatmaps.json`. Each map contains 6 discrete activity layers on a calibrated 64x64 grid matrix (4,096 sectors):
- `human_traffic`: Human player movement samples
- `bot_traffic`: AI bot patrol movement samples
- `loot`: Item pickup interaction points
- `bot_kill`: Telemetry-recorded bot kills
- `bot_killed`: Telemetry-recorded bot casualties
- `killed_by_storm`: Zone restriction fatalities

Sector indices $(row, col)$ map directly to canvas pixel space without coordinate re-inversion because row 0 represents North ($v=1.0$, pixel $y=0$) and row 63 represents South ($v=0.0$, pixel $y=\text{height}$):
$$\text{col} = \left\lfloor \frac{p_x}{\text{width}} \times 64 \right\rfloor, \quad \text{row} = \left\lfloor \frac{p_y}{\text{height}} \times 64 \right\rfloor$$

### 6.2 Zero-Overhead Offscreen Rasterization (`heatmapRenderer.ts`)
1. **Offscreen Canvas Generation**:
   An offscreen $64 \times 64$ HTMLCanvasElement is generated using raw `ImageData`. Normalized intensity is mapped either to a single-layer tactical tint (Cyan, Purple, Amber, Rose, Crimson, Indigo) or a high-contrast thermal gradient (Navy $\to$ Cyan $\to$ Emerald $\to$ Yellow $\to$ Crimson).
2. **LRU Cache**:
   Rasters are cached by `(map_id, active_layers, opacity, style, normalization_mode)`. If none of these parameters change, zero rasterization occurs.
3. **Hardware-Accelerated Render Pass**:
   The canvas render pass executes a single `ctx.drawImage(offscreenRaster, 0, 0, dims.w, dims.h)`. At $< 0.05\text{ ms}$ per frame, this incurs zero overhead during 60 FPS timeline playback, smooth wheel zoom, and pan dragging.

### 6.3 Interactive Sector Inspection & Analytics
- **Sub-Cell Hover Detection**: Hovering over the canvas computes the active sector $(r, c)$, displaying map name, sector indices, active layer name, raw event count, and normalized thermal percentage.
- **Sector Click Selection (`SpatialCellDetailsPanel.tsx`)**: Clicking on any cell locks selection, highlights the cell with golden corner brackets, and displays full 6-layer breakdowns and world coordinate bounding boxes in meters.
- **Map-Wide Analytics Modal (`SpatialAnalyticsModal.tsx`)**: Displays coverage percentages, mean sector density, and ranked top 10 hotspot sectors with click-to-focus capabilities.

---

## 7. Phase 7: Player Intelligence, Combat Analysis & Region Intelligence

### 7.1 Player Intelligence (`/players`)
- **Directory**: Full searchable/sortable entity directory for all 339 entities (245 human players, 94 bots).
- **Filtering**: Multi-mode filter by entity type (All / Human / Bot), deployment map, and date.
- **Sorting**: Reactive multi-column sorting across matches played, total distance, duration, loot counts, bot kills, and fatalities.
- **Dossier Inspection (`PlayerProfileModal.tsx`)**: Modal dossier with terminal outcome ratios, map deployment bars, behavioral aggregates (average distance/duration per match), and match sessions list with deep links (`/map-explorer?map=<map>&match=<matchId>`).

### 7.2 Combat Analysis (`/combat`)
- **Event-Centric Exploration**: Exact tallies for `BotKill` (2,376), `BotKilled` (697), `Kill` (3), `Killed` (3), `KilledByStorm` (39), and separate `Loot` (11,632).
- **Interactive Spatial Preview (`CombatMapPreview.tsx`)**: Lightweight Canvas minimap preview displaying spatial pins with category-specific colors and selection halos.
- **Event Dossier & Scrubbing**: Instant row selection displaying world/UV bounds and deep link to replay at exact timestamp (`/map-explorer?map=<map>&seek=<ts>`).
- **Telemetry Boundaries Disclosure**: Permanent alert enforcing data boundaries (no inferred killer-victim pairings, no weapon/damage assumptions, separated storm deaths).

### 7.3 Region Intelligence (`/regions`)
- **Interactive 64×64 Grid Matrix**: Live grid canvas with thermal color rendering, cursor hover detection, and cell selection.
- **Sector Inspector**: Real-time bounding box calculation (UV bounds and world-coordinate meters) with full 6-layer activity breakdown and share-of-map percentage.
- **Ranked Hotspots Analysis**: Layer-specific Top 8 hotspot sectors table with % share of layer total and direct Map Explorer focus.
- **Cross-Map Comparisons**: Territorial metrics comparing Ambrose Valley, Grand Rift, and Lockdown coverage, peak sector pings, and human density.

---

## 8. Phase 7.1: Semantic Validation, Metric Definitions & Code Splitting

### 8.1 Telemetry Semantics & Neutral Labelling
- Neutral labels applied systematically across `canvasRenderer.ts`, `heatmapRenderer.ts`, `MapExplorerPage.tsx`, `CombatAnalysisPage.tsx`, `PlayerIntelligencePage.tsx`, and `RegionIntelligencePage.tsx`:
  - `BotKill Events`, `BotKilled Events`, `Kill Events`, `Killed Events`, `Storm Death Events`, `Loot Events`
- Avoids fabricated killer-victim pairings, human-vs-human classifications, or bot-elimination claims without supporting fields.
- Mandatory disclosures prominently visible in Combat Analysis and Player Intelligence.

### 8.2 Precise Metric Formulations
- **Distinct Match Count**: Formulated as $\lvert\text{unique}(\text{matches})\rvert$; verified that all 339 entities have 0 duplicate match entries.
- **Elimination Events**: Defined as the sum of recorded unilateral elimination emissions ($\text{BotKilled} + \text{Killed} + \text{KilledByStorm}$), without unsupported claims of kill/death efficiency.
- **Dual Coverage Formulations**:
  - Human Traffic Coverage: $\frac{\lvert\{c : \text{human\_traffic}[c] > 0\}\rvert}{4096} \times 100\%$
  - Union Footprint Coverage: $\frac{\lvert\{c : \exists l, \text{count}_l[c] > 0\}\rvert}{4096} \times 100\%$

### 8.3 Route-Level Code Splitting & Chunk Isolation
- Implemented `React.lazy()` for all 5 primary routes (`OverviewPage`, `MapExplorerPage`, `PlayerIntelligencePage`, `CombatAnalysisPage`, `RegionIntelligencePage`).
- Scoped `<Suspense fallback={<PageLoadingFallback />}>` directly around `<Outlet />` inside `MainLayout.tsx`. This preserves the sidebar shell and navigation immediately while asynchronous route chunks are fetched.
- Extracted standalone `PageLoadingFallback.tsx` to eliminate circular module dependencies between `App.tsx` and `MainLayout.tsx`.
- Bundle isolation ensures heavy dependencies (such as Recharts in `OverviewPage`) do not inflate the initial bundle or block tactical map interactions.

---

## 9. Phase 8: AI Map Analyst — Grounded Telemetry Intelligence

### 9.1 Overview & Architecture
The AI Map Analyst (`/analyst`) provides interactive, evidence-based exploration of spatial telemetry, movement corridors, combat distributions, and loot densities.

### 9.2 Component Tree
```
AnalystPage (/analyst)
├── AnalystOverviewBar (Map, date, entity classification, data scope, grounding status)
├── SuggestedQuestions (Category tabs: Movement, Combat, Loot, Spatial)
├── ConversationThread (Scrollable message history)
│   ├── MessageItem (User inquiry)
│   └── MessageItem (Analyst response card)
│       ├── Header (Title, mapId badge, intent badge, scope)
│       ├── Conclusion Block (Direct analytical answer)
│       ├── Metrics Grid (Cards with raw count, formatted value, denominator, and note)
│       ├── Hotspot Sectors Table (Row, Col, UV bounds, World coordinates in meters)
│       ├── Deep-Link Action Button (Contextual navigation to Map Explorer)
│       ├── Collapsible Calculation Methodology (Exact formulas & definitions)
│       ├── Collapsible Telemetry Limitations (Schema boundaries)
│       └── Recommended Follow-Up Chips (Interactive related questions)
└── AnalystInput (Query input bar with clear conversation action)
```

### 9.3 Deterministic Engine & Intent Parser
- **`insightEngine.ts`**: Pure calculation routines consuming `dataService` without client-side Parquet parsing or network latency.
- **`queryClassifier.ts`**: Intent parser supporting 10 analytical domains, map extraction, sector coordinate extraction, and rejection of unsupported queries.
- **`llmAdapter.ts`**: Secure abstraction layer defaulting to `DeterministicInsightExplainer`. Exposes optional server proxy interface (`VITE_ANALYST_API_URL`) with zero client-side secret exposure.

---

## 10. Verification Results

- **Vitest Frontend Tests**: **115 / 115 passing** across 15 test suites:
  - `insightEngine.test.ts` (Deterministic hotspot math, coverage denominators, combat tallies)
  - `queryClassifier.test.ts` (Intent classification, map/sector extraction, boundary protections)
  - `AnalystPage.test.tsx` (Integration, chat history, suggested questions, error states)
  - `CodeSplitting.test.tsx` (Route lazy loading, fallback presentation, deep link query persistence)
  - `PlayerMetrics.test.ts` (Distinct match counts, average distance, duration, terminal outcomes)
  - `PlayerIntelligence.test.tsx` (Directory, search, modal dossier, KPI validation)
  - `CombatAnalysis.test.tsx` (Category filtering, spatial preview, deep link seeks)
  - `RegionIntelligence.test.tsx` (64×64 grid, sector coordinates, hotspot ranking, cross-map metrics)
  - `HeatmapIntegration.test.tsx` (Raster caching, layer toggles, visual styling)
  - `heatmapMath.test.ts` (UV bounds, normalization, coverage math)
  - `TimelinePlayback.test.tsx` (Play/pause, speeds, scrubber, event ticks)
  - `timelineMath.test.ts` (Interpolation, progress calculation)
  - `MapCanvas.test.tsx` (Canvas 2D render loop, hit-testing, zoom/pan transforms)
  - `MapExplorer.test.tsx` (End-to-end integration, layer controls, sidebar filters)
  - `Overview.test.tsx` (Global metrics, telemetry summary cards)
- **Production Build**: `npm run build` succeeds with **0 TypeScript compilation errors** and route-level chunking for `AnalystPage` (49.17 kB).

