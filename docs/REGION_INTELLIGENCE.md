# LILA BLACK — Region Intelligence & Sector Density

## 1. Overview

The **Region Intelligence** feature (`/regions`) delivers spatial intelligence across the uniform $64 \times 64$ grid partition ($4,096$ sectors per map) established in Phase 2 and validated in Phase 6.

Analysts can inspect sector coordinates, evaluate multi-layer activity breakdowns, review ranked territorial hotspots, and compare cross-map activity footprints.

---

## 2. Spatial Partitioning & Coordinate Math

Each map is partitioned into a uniform $64 \times 64$ matrix indexed by $[row, col]$ where $row, col \in [0, 63]$:
- $col = 0$ corresponds to $u = 0.0$ (Western boundary); $col = 63$ corresponds to $u = 1.0$ (Eastern boundary).
- $row = 0$ corresponds to $v = 1.0$ (Northern boundary); $row = 63$ corresponds to $v = 0.0$ (Southern boundary).

### Spatial Coordinate Formulas:
For any sector $[row, col]$ with grid size $N = 64$:

$$\Delta u = \frac{1}{N}, \quad \Delta v = \frac{1}{N}$$

$$\text{UV Bounds}: \quad u_{\min} = col \times \Delta u, \quad u_{\max} = (col + 1) \times \Delta u$$

$$v_{\min} = 1.0 - (row + 1) \times \Delta v, \quad v_{\max} = 1.0 - row \times \Delta v$$

Using calibrated map scale $S$ and origin $(X_0, Z_0)$:

$$x_{\min} = X_0 + u_{\min} \times S, \quad x_{\max} = X_0 + u_{\max} \times S$$

$$z_{\min} = Z_0 + v_{\min} \times S, \quad z_{\max} = Z_0 + v_{\max} \times S$$

On Ambrose Valley ($S = 900\text{ m}$), each sector represents approximately $14.06\text{ m} \times 14.06\text{ m}$ ($197.8\text{ m}^2$).

---

## 3. The 6-Layer Multi-Spectral Breakdown

For any selected sector $[row, col]$, the inspector evaluates exact telemetry pings across all 6 layers:

| Layer Key | Telemetry Meaning | Unit |
| :--- | :--- | :--- |
| `human_traffic` | Position samples emitted by verified human clients | Periodic pings (~1Hz) |
| `bot_traffic` | Bot position samples | Periodic pings |
| `loot` | Discrete resource interaction records (`Loot Events`) | Item pickup pings |
| `bot_kill` | Discrete telemetry records (`BotKill Events` & `Kill Events`) | Elimination pings |
| `bot_killed` | Discrete telemetry records (`BotKilled Events` & `Killed Events`) | Elimination pings |
| `killed_by_storm` | Environmental fatalities from electric storm constriction (`Storm Death Events`) | Death pings |

The inspector calculates the percentage share of each layer:

$$\text{Share of Layer Total} = \left( \frac{\text{Cell Count}}{\sum_{\text{grid}} \text{Count}} \right) \times 100\%$$

---

## 4. Ranked Hotspots Analysis

The page extracts the **Top 8 highest-density sectors** for each active layer using `extractTopHotspots(grid, mapId, 8, 64)`.

For each hotspot:
- Rank ($\#1$ through $\#8$)
- Sector index $[row, col]$
- World Coordinate Box $[X, Z]$ in meters
- Normalized UV Box $[U, V]$
- Raw Activity Count (exact integer preserved)
- Percentage Share of Map Layer Total
- **Focus on Map** action button deep-linking into `/map-explorer?map=<mapId>&heatmap=1&cell=<row>,<col>`

---

## 5. Cross-Map Comparative Metrics & Coverage Definitions

The platform provides a dual-metric spatial coverage breakdown distinguishing human mobility from all-spectrum operations:

### Mathematical Definitions:

1. **Human Traffic Coverage**:
   $$\text{Coverage}_{\text{human}} = \left( \frac{\lvert\{c \in [0, 4095] : \text{count}_{\text{human\_traffic}}[c] > 0\}\rvert}{4,096} \right) \times 100\%$$

2. **Union Footprint Coverage (6 Layers)**:
   $$\text{Coverage}_{\text{union}} = \left( \frac{\lvert\{c \in [0, 4095] : \sum_{l=1}^{6} \text{count}_l[c] > 0\}\rvert}{4,096} \right) \times 100\%$$

### Validated Cross-Map Telemetry Footprints:

| Metric | Ambrose Valley | Grand Rift | Lockdown |
| :--- | :--- | :--- | :--- |
| **Grid Size** | $64 \times 64$ | $64 \times 64$ | $64 \times 64$ |
| **Native Dimensions** | $2048 \times 2048$ | $2048 \times 2046$ | $2048 \times 2048$ |
| **Human Traffic Coverage** | $37.99\%$ ($1,556 / 4096$) | $23.95\%$ ($981 / 4096$) | $24.61\%$ ($1,008 / 4096$) |
| **Union Footprint Coverage (6 Layers)** | $39.09\%$ ($1,601 / 4096$) | $27.76\%$ ($1,137 / 4096$) | $26.90\%$ ($1,102 / 4096$) |
| **Max Sector Human Pings** | $476$ | $37$ | $126$ |
| **Total Human Pings** | $35,429$ | $3,717$ | $11,355$ |

---

## 6. Analytical Boundaries

- **Not Unique Players**: Sector counts represent cumulative telemetry records over 5 days, not unique individuals.
- **No Clustering Approximation**: Heatmap calculations preserve raw integer counts directly from `heatmaps.json`.
