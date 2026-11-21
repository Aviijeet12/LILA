# LILA BLACK — Deterministic Analytics Engine Specification

## 1. Mathematical Foundations & Coordinate Mapping

The **Deterministic Analytics Engine** (`insightEngine.ts`) implements pure algorithmic aggregations across the three operational theaters:

| Map Name | Scale ($S$) | Origin $X_0$ | Origin $Z_0$ | Partition ($N$) | Sector Footprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ambrose Valley** | 900.0 m | -370.0 m | -473.0 m | $64 \times 64$ | $14.06\text{ m} \times 14.06\text{ m}$ ($197.8\text{ m}^2$) |
| **Grand Rift** | 581.0 m | -290.0 m | -290.0 m | $64 \times 64$ | $9.08\text{ m} \times 9.07\text{ m}$ ($82.3\text{ m}^2$) |
| **Lockdown** | 1000.0 m | -500.0 m | -500.0 m | $64 \times 64$ | $15.62\text{ m} \times 15.62\text{ m}$ ($244.1\text{ m}^2$) |

### Coordinate Bounding Formulas:
For any sector $[row, col]$ where $row, col \in [0, 63]$:

$$u_{\min} = \frac{col}{64}, \quad u_{\max} = \frac{col + 1}{64}$$

$$v_{\min} = 1.0 - \frac{row + 1}{64}, \quad v_{\max} = 1.0 - \frac{row}{64}$$

$$x_{\min} = X_0 + u_{\min} \times S, \quad x_{\max} = X_0 + u_{\max} \times S$$

$$z_{\min} = Z_0 + v_{\min} \times S, \quad z_{\max} = Z_0 + v_{\max} \times S$$

---

## 2. Core Deterministic Metrics & Formulas

### 2.1 Spatial Coverage Formulations:
1. **Human Movement Coverage**:
   $$\text{Coverage}_{\text{human}} = \left( \frac{\lvert\{c \in [0, 4095] : \text{count}_{\text{human\_traffic}}[c] > 0\}\rvert}{4,096} \right) \times 100\%$$
   - Ambrose Valley: **$37.99\%$** ($1,556 / 4,096$)
   - Grand Rift: **$23.95\%$** ($981 / 4,096$)
   - Lockdown: **$24.61\%$** ($1,008 / 4,096$)

2. **Union Operational Footprint**:
   $$\text{Coverage}_{\text{union}} = \left( \frac{\lvert\{c \in [0, 4095] : \sum_{l=1}^6 \text{count}_l[c] > 0\}\rvert}{4,096} \right) \times 100\%$$
   - Ambrose Valley: **$39.09\%$** ($1,601 / 4,096$)
   - Grand Rift: **$27.76\%$** ($1,137 / 4,096$)
   - Lockdown: **$26.90\%$** ($1,102 / 4,096$)

### 2.2 Sector Share of Layer Total:
For cell $[r, c]$ within layer $l$:
$$\text{Share} = \left( \frac{\text{count}_l[r, c]}{\sum_{i=0}^{63} \sum_{j=0}^{63} \text{count}_l[i, j]} \right) \times 100\%$$

### 2.3 Human-to-Bot Traffic Ratio:
$$\text{Ratio} = \frac{\sum \text{human\_traffic}}{\sum \text{bot\_traffic}}$$
Denominator is strictly total bot position samples on the specified map.

### 2.4 Multi-Layer Sector Diversity:
For each sector $c \in [0, 4095]$:
$$\text{Diversity}(c) = \sum_{l=1}^6 \mathbb{I}(\text{count}_l[c] > 0)$$
Identifies tactical hubs where $\text{Diversity}(c) \ge 3$.

---

## 3. Telemetry Integrity Guarantees

1. **No Approximated Counts**: Preserves raw integer values directly from the ETL outputs.
2. **Distinct Denominators**: Percentages cite verified totals (4,096 sectors, 3,079 combat events, etc.).
3. **No Synthetic Streaming**: Analysis returns instantly upon mathematical computation without fake typing pauses.

---

## 4. Authoritative Event Category & Storm Distribution (Phase 8.1 Audit)

The following table is the definitive ground-truth distribution, verified by cross-reading `data/processed/events/events.json` against each map's `heatmaps.json`. All numbers confirmed with zero discrepancies.

### 4.1 Discrete Event Category Totals

| Event Type | AmbroseValley | GrandRift | Lockdown | **Total** |
| :--- | :---: | :---: | :---: | :---: |
| `BotKill` | 1,772 | 189 | 415 | **2,376** |
| `BotKilled` | 485 | 46 | 166 | **697** |
| `Kill` | 2 | 1 | 0 | **3** |
| `Killed` | 2 | 1 | 0 | **3** |
| `KilledByStorm` | **17** | **5** | **17** | **39** |
| `Loot` | 8,988 | 753 | 1,891 | **11,632** |
| **Map Total** | **11,266** | **995** | **2,489** | **14,750** |

### 4.2 Heatmap Layer ↔ Discrete Event Cross-Reconciliation

| Heatmap Layer | Constituent Events | AmbroseValley | GrandRift | Lockdown | **Total** |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `loot` | `Loot` (1:1) | 8,988 | 753 | 1,891 | **11,632** |
| `killed_by_storm` | `KilledByStorm` (1:1) | 17 | 5 | 17 | **39** |
| `bot_kill` | `BotKill` + `Kill` | 1,774 | 190 | 415 | **2,379** |
| `bot_killed` | `BotKilled` + `Killed` | 487 | 47 | 166 | **700** |

**Note**: `bot_kill` and `bot_killed` heatmap layers merge bot-specific and player-specific elimination events into unified spatial density rasters. Discrete event analysis preserves all six original categories.

### 4.3 Authoritative KilledByStorm Distribution

| Map | events.json | heatmaps.json `killed_by_storm` | Match |
| :--- | :---: | :---: | :---: |
| Ambrose Valley | 17 | 17 | ✓ |
| Grand Rift | 5 | 5 | ✓ |
| Lockdown | 17 | 17 | ✓ |
| **Total** | **39** | **39** | ✓ |

Zero records with missing or invalid `map_id`. Zero duplicate event records in the dataset.

