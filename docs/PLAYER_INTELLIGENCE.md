# LILA BLACK — Player Intelligence Feature & Behavioral Analytics

## 1. Overview

The **Player Intelligence** feature (`/players`) provides deep exploration and descriptive profiling of all 339 unique entities (245 human players and 94 bots) identified across the 5-day Nakama production telemetry dataset (February 10–14, 2026).

It bridges aggregate summary metrics with individual match replay capabilities, allowing analysts to transition from holistic behavior exploration to minute-by-minute journey scrutiny in the Map Explorer.

---

## 2. Telemetry Ingestion & Data Sources

All statistics rendered on the Player Intelligence page are loaded from `data/processed/players/players.json`, which was derived directly from raw Parquet telemetry during the Phase 2 ETL pipeline without extrapolation or synthetic mock entries.

### Key Data Fields & Mathematical Definitions:
| Property | Type | Metric Formula & Definition |
| :--- | :--- | :--- |
| `user_id` | String | Unique Nakama entity ID (UUID for humans, integer string for bots) |
| `entity_type` | `"human"` \| `"bot"` | Deterministic classification established in Phase 0 audit |
| `matches_played` | Integer | Count of distinct Nakama match IDs in which the entity participated: $\lvert\text{unique}(\text{matches})\rvert$. Verified to have 0 duplicate match IDs per entity in processed telemetry. |
| `total_distance_travelled_meters` | Float | Cumulative Euclidean distance traversed across all recorded journey segments: $\sum_{i=1}^{N-1} \sqrt{(x_{i+1}-x_i)^2 + (y_{i+1}-y_i)^2 + (z_{i+1}-z_i)^2}$. |
| `avg_distance_travelled_meters` | Float | Arithmetic mean distance traversed per match participation: $\frac{\text{total\_distance\_travelled\_meters}}{\text{matches\_played}}$. |
| `total_duration_seconds` | Float | Cumulative recorded duration across all journeys: $\sum (\text{ts}_{\text{end}} - \text{ts}_{\text{start}}) / 1000.0$. |
| `avg_duration_seconds` | Float | Arithmetic mean duration per match: $\frac{\text{total\_duration\_seconds}}{\text{matches\_played}}$. |
| `total_loot_events` | Integer | Total discrete `Loot` telemetry emissions recorded along journeys. |
| `total_bot_kill_events` | Integer | Total discrete `BotKill` victory emissions recorded along journeys. |
| `total_death_events` | Integer | Elimination Events: Total recorded elimination emissions ($\text{BotKilled} + \text{Killed} + \text{KilledByStorm}$). |
| `total_storm_deaths` | Integer | Discrete environmental elimination records (`KilledByStorm`). |
| `outcomes` | Object | Tally and percentage share of terminal statuses: $\frac{N_{\text{SURVIVED\_PRESUMED}}}{N_{\text{total}}}$ and $\frac{N_{\text{ELIMINATED}}}{N_{\text{total}}}$. |
| `maps_played` | Object | Distribution of matches played across tactical maps (`AmbroseValley`, `GrandRift`, `Lockdown`). |
| `dates_active` | Array<String> | Unique calendar dates with recorded activity. |
| `matches` | Array<String> | Deduplicated list of Nakama match IDs in which the entity participated. |

---

## 3. Directory Capabilities

1. **Entity Classification Filtering**:
   - `All`: Full directory of 339 entities.
   - `Humans`: 245 verified human clients.
   - `Bots`: 94 server-simulated bot entities.

2. **Map & Date Filters**:
   - Filter entities active on specific tactical maps (`AmbroseValley`, `GrandRift`, `Lockdown`).
   - Filter entities by recorded calendar dates.

3. **Multi-Column Sorting**:
   - Matches Played ($\uparrow/\downarrow$)
   - Total Traversed Distance ($\uparrow/\downarrow$)
   - Cumulative Duration ($\uparrow/\downarrow$)
   - Recorded Loot Events ($\uparrow/\downarrow$)
   - BotKill Events Recorded ($\uparrow/\downarrow$)
   - Elimination Events ($\uparrow/\downarrow$)

4. **Real-Time Substring Search**:
   - Instant search across entity IDs (exact or prefix/substring).

---

## 4. Behavioral Profile Dossier (Modal)

Clicking **Inspect** on any entity opens an interactive dossier:
- **KPI Summary**: Total distance (km), average distance per match (m), total duration, average duration, BotKill Events, Loot Events.
- **Terminal Outcomes Distribution**: Visual progress bar indicating percentage share of `SURVIVED_PRESUMED` vs `ELIMINATED`.
- **Map Deployment Frequency**: Bar breakdown displaying match counts and percentage allocation per map.
- **Distinct Match Participations**: Scrollable list of exact Nakama match IDs ($\lvert\text{unique}(\text{matches})\rvert$). Each entry includes a **View Replay** button deep-linking directly into `/map-explorer?map=<primaryMap>&match=<matchId>`.

---

## 5. Semantic Boundaries & Methodology Notice

To preserve analytical integrity and adhere to data engineering best practices:
- **No Skill or Personality Inference**: The platform avoids subjective labels like "camper", "aggressive", "pro", or "rookie".
- **Survival Status Convention**: Status is categorized as `SURVIVED_PRESUMED` because telemetry ceases when a match finishes without an explicit extraction confirmation event.
- **No Fabricated K/D Ratio**: Kill-to-death ratios are not computed because `BotKill` and `BotKilled` are unilateral client logs rather than zero-sum bilateral records.
- **Strictly Distinct Match Counting**: Every match count reflects distinct match IDs traversed, ensuring multi-segment journeys or reconnects do not artificially inflate participation tallies.
