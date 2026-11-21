# LILA BLACK — AI Map Analyst: Grounded Telemetry Intelligence

## 1. Overview & Operational Philosophy

The **AI Map Analyst** (`/analyst`) is a data-grounded telemetry intelligence assistant built for **LILA BLACK**. It bridges raw spatial datasets, 64×64 thermal raster matrices, and discrete combat events with natural-language exploration.

### Core Architectural Principle: Grounded Determinism
Unlike conversational models that speculate or hallucinate tactical commentary, the AI Map Analyst:
- **Computes Every Statistic Deterministically**: Every count, ratio, and percentage is derived directly from validated client datasets (`heatmaps.json`, `events.json`, `players.json`) using `insightEngine.ts`.
- **Zero Client-Side Secret Exposure**: No external API keys or vendor credentials exist in the client bundle.
- **Strict Semantic Boundaries**: Rejects questions regarding weapon balance, subjective player skill, cheating, or unrecorded variables with explicit educational disclosures.
- **Explicit Denominator Definitions**: Every percentage clearly cites its mathematical base (e.g., 4,096 sectors, 3,079 total combat events).

---

## 2. Product Experience & Capabilities

### 2.1 Analyst Overview Bar
Displays real-time telemetry operational context:
- **Selected Map**: Ambrose Valley, Grand Rift, Lockdown, or All Maps Combined.
- **Date Range**: February 10 – 14, 2026 (5-day production dataset).
- **Entity Scope**: 245 Verified Humans and 94 Server-Simulated Bots.
- **Integrity Status**: Deterministic Grounding Active badge.
- **Record Availability**: 14,750 discrete events and 12,288 total evaluated sectors.

### 2.2 Suggested Analytical Inquiries
Pre-configured categories covering core operational questions:

1. **Player Movement**:
   - *Which areas have the highest human movement activity?*
   - *How does human traffic compare with bot traffic?*
   - *Which map has the widest recorded human movement footprint?*
2. **Combat Telemetry**:
   - *Where are BotKill events most concentrated?*
   - *How do BotKill and BotKilled event distributions differ?*
   - *How many storm-related death events were recorded on each map?*
3. **Loot Activity**:
   - *Which regions have the highest recorded Loot event counts?*
   - *How does loot activity overlap with human traffic hotspots?*
4. **Spatial Analysis**:
   - *Which sectors have the highest activity across multiple telemetry layers?*
   - *Which areas have high human traffic but relatively low bot traffic?*
   - *Which regions have activity across several different event categories?*

### 2.3 Structured Response Structure
Every response delivered by the analyst provides:
1. **Direct Conclusion**: High-level summary directly grounded in calculated data.
2. **Supporting Telemetry Metrics**: Key metric cards with raw integer count, unit, denominator, and contextual notes.
3. **Top Ground-Truth Sectors**: Coordinates in meters $[X, Z]$, normalized UV bounds $[U, V]$, and layer sample counts.
4. **Spatial Deep-Link Action**: One-click navigation to Map Explorer centered on the relevant cell (`/map-explorer?map=<map>&heatmap=1&cell=<r>,<c>`).
5. **Calculation Methodology**: Collapsible disclosure detailing exact mathematical formulas.
6. **Telemetry Semantic Boundaries**: Collapsible alert outlining schema limitations.
7. **Recommended Follow-Up Inquiries**: Contextually relevant follow-up questions.

---

## 3. Query Classification & Intent Mapping

The controlled intent parser (`queryClassifier.ts`) matches natural-language queries against verified deterministic routines:

| Intent Key | Target Domain | Extracted Parameters | Example Queries |
| :--- | :--- | :--- | :--- |
| `human_traffic_hotspots` | Player Movement | `mapId`, `topN` | "Which areas have the highest human movement activity on Ambrose Valley?" |
| `bot_traffic_hotspots` | Bot Waypoints | `mapId`, `topN` | "Where is bot movement concentrated?" |
| `map_coverage_comparison` | Cross-Map Utilization | `mapId: 'all'` | "Which map has the widest recorded human movement footprint?" |
| `combat_event_distribution` | Combat Telemetry | `mapId`, `category` | "Where are BotKill events most concentrated?" |
| `storm_deaths_summary` | Environmental Zones | `category: 'KilledByStorm'` | "How many storm-related death events were recorded on each map?" |
| `loot_hotspots` | Resource Distribution | `mapId`, `topN` | "Which regions have the highest recorded Loot event counts?" |
| `human_vs_bot_traffic` | Agent Divergence | `mapId` | "How does human traffic compare with bot traffic on Grand Rift?" |
| `loot_vs_human_traffic` | Resource Correlation | `mapId` | "How does loot activity overlap with human traffic hotspots?" |
| `cross_layer_activity` | Multi-Spectral Density | `mapId`, `minLayers` | "Which sectors have the highest activity across multiple telemetry layers?" |
| `sector_comparison` | Micro-Sector Dossier | `mapId`, `row`, `col` | "Inspect sector [25, 6] on Ambrose Valley" |
| `unsupported` | Boundary Protection | None | "Who is the best player?", "What is the best weapon tier?" |

---

## 4. LLM Adapter Architecture & Security

The analyst features an optional server-side LLM adapter (`llmAdapter.ts`) designed around strict security requirements:

```
[User Query]
     │
     ▼
[queryClassifier.ts] ──► Intent & Filters Extracted
     │
     ▼
[insightEngine.ts] ──► Pure Deterministic Numerical Calculation
     │
     ▼
[AnalyticalResult (Exact Numbers)]
     │
     ├── (Default Offline / Deterministic Mode)
     │       └── DeterministicInsightExplainer (Zero Network Call, Zero Secret)
     │
     └── (Optional Server Proxy Mode: VITE_ANALYST_API_URL configured)
             └── Secure Server Endpoint (Passes ONLY pre-computed numerical payload)
```

### Security Guarantees:
1. **No Frontend Secrets**: No API keys, credentials, or proprietary provider tokens are compiled into the client.
2. **Numbers Are Never Invented**: The LLM receives only pre-computed numerical result objects; it never performs telemetry calculations.
3. **Resilient Fallback**: If an external proxy fails or is unconfigured, the application defaults instantly to the deterministic engine.

---

## 5. Telemetry Semantic Boundaries

Every response enforces non-negotiable boundaries:
- **No Inferred Killer-Victim Relationships**: `BotKill` and `BotKilled` are unilateral logs without paired identity fields.
- **No Weapon or Armor Metrics**: The dataset contains no damage, weapon tier, or health data.
- **No Extraction Claims**: `SURVIVED_PRESUMED` is defined as non-eliminated status when logging ceased.
- **Pings $\ne$ Unique Players**: Spatial cell densities represent cumulative 5-day trajectory emissions, not individual user counts.

---

## 6. Phase 8.1 Integrity Audit — Grounding Protection & Storm Reconciliation

### 6.1 Authoritative Storm Death Distribution

After comprehensive cross-referencing of `data/processed/events/events.json` against all three `data/processed/maps/<map_id>/heatmaps.json` files, the definitive `KilledByStorm` distribution is:

| Map | events.json Count | heatmaps.json `killed_by_storm` | Concordance |
| :--- | :---: | :---: | :---: |
| Ambrose Valley | **17** | **17** | ✓ |
| Grand Rift | **5** | **5** | ✓ |
| Lockdown | **17** | **17** | ✓ |
| **Total** | **39** | **39** | ✓ |

**Root cause of prior discrepancies**: Earlier Phase 6 and Phase 8 completion reports contained erroneous narrative text. The underlying engine code (`insightEngine.ts` `getStormDeathsSummary()`) was always correct, dynamically computing the 17/5/17 distribution from raw `events.json` data.

### 6.2 Grounding Protection Architecture (Updated)

The `result.conclusion` field is now **immutable** after deterministic computation. The LLM commentary flow has been restructured:

```
[insightEngine.ts] ──► result.conclusion  (IMMUTABLE: exact deterministic output)
                        result.metrics     (IMMUTABLE: exact integer counts)
                        result.hotspots    (IMMUTABLE: exact grid coordinates)
                   │
                   └── [llmAdapter.ts] ──► result.llmCommentary  (OPTIONAL: auxiliary AI prose)
                                           ^ Rendered in a visually distinct "AI Commentary" block
                                           ^ Never replaces or corrupts result.conclusion
                                           ^ Fully absent when LLM endpoint is unconfigured or fails
```

### 6.3 Regression Test Coverage (AnalystIntegrity.test.ts — 12 tests)

| Test Category | Tests | Verified Values |
| :--- | :---: | :--- |
| Reconciled storm distribution (events.json) | 1 | Ambrose: 17, GrandRift: 5, Lockdown: 17, Total: 39 |
| Heatmap layer cross-reconciliation | 1 | 100% match, heatmap totals = events.json |
| `insightEngine.getStormDeathsSummary()` output | 1 | Exact rawCount fields verified |
| All 6 category totals in events.json | 1 | BotKill: 2376, BotKilled: 697, Kill: 3, Killed: 3, Storm: 39, Loot: 11632 |
| Analyst combat distribution (all maps & per map) | 1 | Full matrix across all three maps |
| Heatmap layer ↔ event cross-reconciliation | 1 | bot_kill=2379, bot_killed=700, loot=11632, storm=39 |
| Zero missing/invalid map_id records | 1 | 0 unmapped events |
| Zero duplicate records | 1 | 0 duplicates |
| Unmapped `map_id` resilience (synthetic injection) | 1 | Unmapped metric appears, totals correct |
| DeterministicInsightExplainer grounding | 1 | conclusion preserved, isExternalAvailable=false |
| SecureServerLlmAdapter fallback when unconfigured | 1 | Returns deterministic conclusion |
| SecureServerLlmAdapter fallback on network error | 1 | Returns deterministic conclusion after fetch rejection |

