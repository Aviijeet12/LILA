# LILA BLACK — Analytical Insights

> Evidence-backed spatial and telemetry findings derived from the production dataset covering 796 matches, 1,242 player journeys, 339 unique entities (245 humans, 94 bots), and 14,750 discrete events recorded across five operational days (2026-02-10 to 2026-02-14) on three maps: Ambrose Valley, Grand Rift, and Lockdown.

## Methodology Note

Three findings were selected by the following criteria:

1. **Statistical distinctiveness**: Each finding exhibits a measurable, non-trivial pattern that distinguishes it from baseline noise.
2. **Cross-source verifiability**: Each finding can be independently reproduced from two or more processed data artifacts (`events.json`, `heatmaps.json`, `global_stats.json`).
3. **Analytical value**: Each finding has practical relevance for map design assessment or player behavior understanding, while respecting the strict semantic limits of the available telemetry.

All values were recalculated directly from the authoritative processed datasets. No values were carried from prior narrative reports without re-verification.

---

## Finding 1: Ambrose Valley Receives Disproportionately High Activity Relative to Its Share of Available Operational Time

### 1. Executive Observation

Ambrose Valley hosts 76.4% of all recorded discrete events and 67.3% of all player journeys despite being one of three available operational maps. The imbalance is consistent across event categories, matches, and telemetry samples, indicating that the dataset reflects an operational configuration in which Ambrose Valley was selected or sampled far more frequently than the other two maps.

### 2. Supporting Evidence

**Discrete events by map (`data/processed/events/events.json`, n = 14,750 total events):**

| Map | Discrete Events | Share of Total |
|---|---:|---:|
| Ambrose Valley | 11,266 | **76.4%** |
| Lockdown | 2,489 | 16.9% |
| Grand Rift | 995 | 6.7% |

**Matches and journeys by map (`data/processed/global_stats.json`, n = 796 matches, 1,242 journeys):**

| Map | Matches | Match Share | Journeys | Journey Share |
|---|---:|---:|---:|---:|
| Ambrose Valley | 566 | **71.1%** | 836 | **67.3%** |
| Lockdown | 171 | 21.5% | 295 | 23.7% |
| Grand Rift | 59 | 7.4% | 111 | 8.9% |

**Spatial human position samples (`data/processed/maps/<map>/heatmaps.json`, n = 50,501 total samples):**

| Map | Human Position Samples | Share of All Human Samples |
|---|---:|---:|
| Ambrose Valley | 35,429 | **70.2%** |
| Lockdown | 11,355 | 22.5% |
| Grand Rift | 3,717 | 7.4% |
| **Total** | **50,501** | 100% |

### 3. Calculation Methodology

- Discrete event counts were computed by grouping all 14,750 records in `events.json` by their `map_id` field. Exactly zero events have missing or invalid `map_id` values.
- Match and journey counts are taken directly from `global_stats.json` (`matches_per_map`, `journeys_per_map` fields).
- Human position sample totals are taken from `human_traffic.total_points` in each map's `heatmaps.json`, which sum positions where `entity_type == 'human'`.
- Denominator for event percentages: 14,750 total discrete events. Denominator for human samples: 50,501 total human position samples (sum across all three maps).

### 4. Relevance to Player and Map Intelligence

The activity imbalance has direct implications for comparative map analysis. Spatial patterns computed on Ambrose Valley rest on a substantially larger sample (836 journeys, 35,429 position samples) than Grand Rift (111 journeys, 3,717 samples). Findings derived from Grand Rift data should be interpreted with proportionally greater caution, and cross-map comparisons must normalize by journey volume rather than raw counts.

### 5. Limitations and Alternative Explanations

- The dataset may reflect deliberate test-deployment scheduling toward Ambrose Valley rather than organic player choice.
- Match selection may have been server-scheduled rather than player-driven, so overrepresentation cannot be attributed to player preference without external scheduling records.
- Position samples are periodic telemetry emissions (~1 Hz), not counts of unique players. High sample counts reflect duration of presence, not necessarily geographic diversity.
- The dataset covers five days of one deployment window and may not generalize to long-term operational patterns.

### 6. Dataset References

- `data/processed/events/events.json` — event records with `map_id` field
- `data/processed/global_stats.json` — `matches_per_map`, `journeys_per_map`
- `data/processed/maps/*/heatmaps.json` — `human_traffic.total_points`

---

## Finding 2: Grand Rift Exhibits a Substantially Higher Proportion of Human-Active Sectors Without Recorded Bot Samples Than Other Maps

### 1. Executive Observation

On Grand Rift, 45.7% of all sectors that recorded human movement contain zero recorded bot movement samples. This proportion of human-active sectors without bot presence is 2.4× higher than on Ambrose Valley (19.2%) and 2.2× higher than on Lockdown (20.6%), showing that human and bot spatial distributions diverge across sectors to a greater degree on Grand Rift than on the other two maps.

### 2. Supporting Evidence

**Sector-level human vs. bot spatial presence (`data/processed/maps/<map>/heatmaps.json`):**

| Map | Human-Active Sectors | Bot-Active Sectors | Sectors with Human > 0 and Bot = 0 | % of Human-Active Sectors Without Bot Samples |
|---|---:|---:|---:|---:|
| Ambrose Valley | 1,556 | 1,302 | 298 | **19.2%** |
| Grand Rift | 981 | 688 | 448 | **45.7%** |
| Lockdown | 1,008 | 894 | 208 | **20.6%** |

*Definitions: A sector is a 64×64 grid cell. Human-active means `human_traffic.grid[r][c] > 0`. Bot-active means `bot_traffic.grid[r][c] > 0`.*

**Human-to-bot position sample ratio by map:**

| Map | Human Samples | Bot Samples | H:B Sample Ratio |
|---|---:|---:|---:|
| Ambrose Valley | 35,429 | 13,152 | **2.69 : 1** |
| Grand Rift | 3,717 | 2,011 | **1.85 : 1** |
| Lockdown | 11,355 | 7,185 | **1.58 : 1** |

Grand Rift exhibits both a lower H:B sample ratio (1.85 : 1) than Ambrose Valley and a substantially higher proportion of human-active sectors that contain zero bot samples (45.7%), demonstrating an observed difference in spatial sector occupancy between human and bot entities on this map.

### 3. Calculation Methodology

For each of the 4,096 sectors in a map's 64×64 grid:
- **Human-active**: `human_traffic.grid[r][c] > 0`
- **Bot-active**: `bot_traffic.grid[r][c] > 0`
- **Human without bot**: `human_traffic.grid[r][c] > 0` AND `bot_traffic.grid[r][c] == 0`

Counts were computed by iterating all 4,096 cells for each map's heatmap grid. Ratios were computed using `human_traffic.total_points` and `bot_traffic.total_points` from `heatmaps.json`.

### 4. Relevance to Player and Map Intelligence

Documenting the spatial distribution of human and bot entities identifies geographic sectors where recorded human trajectories did not encounter or share space with recorded bot positions. This provides a baseline spatial map of where each entity type was recorded during the test deployment.

### 5. Limitations and Alternative Explanations

- **No causal evidence**: The telemetry documents the spatial distribution of recorded positions, but cannot establish the underlying cause of this distribution. It does not record bot navmesh configurations, server-side pathfinding constraints, map terrain topology, or player routing motivations. Whether this divergence stems from map geometry, bot routing rules, or human exploration patterns remains outside the scope of the available data.
- **Sample volume on Grand Rift**: 3,717 human samples and 2,011 bot samples represent a smaller sample size than on the other maps. Some sector divergence may reflect sampling sparsity rather than systematic differences in presence.
- Sectors with only 1–2 position samples represent very low volume and may reflect transient traversals.
- Position samples are periodic ~1 Hz emissions, not continuous vector paths; rapid transit through a sector without an emission will leave that sector unrecorded.

### 6. Dataset References

- `data/processed/maps/*/heatmaps.json` — `human_traffic.grid`, `bot_traffic.grid`, `active_cells_count`, `total_points`
- `docs/HEATMAP_ANALYTICS.md` — grid normalization and cell bounds formulas

---

## Finding 3: Recorded Loot Events Are Heavily Concentrated in a Small Fraction of Human-Active Sectors

### 1. Executive Observation

Across all three maps, the top 10 sectors by recorded Loot event count contain approximately 19% of all Loot events on each map, despite representing fewer than 5% of active loot sectors. Furthermore, on Ambrose Valley, the top 5% of human-active sectors (78 cells) contain 57.2% of all recorded Loot events on that map.

### 2. Supporting Evidence

**Loot event sector concentration by map (`data/processed/maps/<map>/heatmaps.json`):**

| Map | Total Loot Events | Active Loot Sectors | Top 10 Sectors' Share | Top Sector Coordinates | Top Sector Count | Top Sector Share |
|---|---:|---:|---:|:---:|---:|---:|
| Ambrose Valley | 8,988 | 573 (14.0% of map) | 1,716 = **19.1%** | [R55, C22] | 325 | **3.6%** |
| Grand Rift | 753 | 199 (4.9% of map) | 145 = **19.3%** | [R31, C23] | 19 | 2.5% |
| Lockdown | 1,891 | 309 (7.5% of map) | 366 = **19.4%** | [R39, C13] | 56 | 3.0% |

**Recorded Loot events in top-5% and top-10% most human-active sectors:**

| Map | Top-5% Human Sectors | Loot Events in Those Sectors | % of Map Loot Events | Top-10% Human Sectors | Loot Events in Those Sectors | % of Map Loot Events |
|---|---:|---:|---:|---:|---:|---:|
| Ambrose Valley | 78 cells | 5,140 | **57.2%** | 155 cells | 6,706 | **74.6%** |
| Grand Rift | 50 cells | 273 | 36.3% | 98 cells | 421 | 55.9% |
| Lockdown | 51 cells | 882 | 46.6% | 100 cells | 1,200 | **63.5%** |

**World coordinates of the peak Ambrose Valley Loot event clusters** (map scale S = 900 m, origin X₀ = −370 m, Z₀ = −473 m):
- Sector [R55, C22]: X ∈ [−61, −47] m, Z ∈ [−360, −346] m (325 Loot events)
- Sector [R55, C23] (adjacent): X ∈ [−47, −32] m, Z ∈ [−360, −346] m (217 Loot events)
- These two adjacent sectors together concentrate 542 recorded Loot events = **6.0% of all Ambrose Valley Loot events**.

### 3. Calculation Methodology

1. For each map, all 4,096 grid cells were ranked by `loot.grid[r][c]`; the top 10 were summed and divided by `loot.total_points`.
2. Human-active cells were ranked in descending order of `human_traffic.grid[r][c]`; the top 5% and top 10% slices were taken, and corresponding `loot.grid[r][c]` counts were summed.
3. World bounding coordinates were computed using the validated affine transformation:
   - `u_min = col / 64`, `v_min = 1.0 - (row + 1) / 64`
   - `x_min = X₀ + u_min × S`, `z_min = Z₀ + v_min × S`
4. Denominators: `loot.total_points` from `heatmaps.json`, cross-verified with discrete `Loot` events in `events.json` (Ambrose: 8,988; Grand Rift: 753; Lockdown: 1,891; Total: 11,632).

### 4. Relevance to Player and Map Intelligence

The spatial co-occurrence of high human movement and recorded Loot events provides an empirical measure of where player trajectories and resource interaction events coincide on each map. Identifying that up to 74.6% of recorded Loot events occur within 10% of traversed sectors maps the high-activity resource corridors across the game environment.

### 5. Limitations and Alternative Explanations

- **No causal relationship**: The telemetry demonstrates spatial co-occurrence between recorded Loot events and areas of high human movement density. However, the telemetry records only discrete events with type 'Loot' and does not contain loot spawn locations, loot placement configurations, inventory contents, or player motivations. Consequently, the data cannot establish a causal relationship between loot placement and player movement—it cannot determine whether loot placement attracts players to these locations or whether high player transit frequency simply increases the likelihood of recorded loot events occurring in those areas.
- **Position samples are not player intentions**: Position samples reflect cumulative 5-day traffic density, not individual decision-making.
- **Recorded events vs. unlooted spawns**: The dataset contains records of events that occurred; unlooted spawns or unopened resource containers leave no telemetry signature.
- **Temporal aggregation**: Heatmap data aggregates all matches across the 5-day period; within-match temporal shifts (e.g., opening minutes vs. final circle) cannot be separated in the 2D raster grids.

### 6. Dataset References

- `data/processed/maps/*/heatmaps.json` — `loot.grid`, `loot.total_points`, `human_traffic.grid`
- `data/processed/events/events.json` — `Loot` event records
- `docs/COORDINATE_MAPPING.md` — mathematical calibration formulas
