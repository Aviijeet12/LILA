# LILA BLACK — Analytical Insights

> Evidence-backed spatial and telemetry findings derived from the production dataset covering 796 matches, 1,242 player journeys, 339 unique entities (245 humans, 94 bots), and 14,750 discrete events recorded across five operational days (2026-02-10 to 2026-02-14) on three maps: Ambrose Valley, Grand Rift, and Lockdown.

---

## Finding 1: Ambrose Valley Concentrates Disproportionate Operational Activity Across All Telemetry Dimensions

### 1. What Caught Our Eye in the Data
When examining the global activity distribution, Ambrose Valley monopolizes the entire telemetry footprint. Despite being one of three available operational theaters alongside Grand Rift and Lockdown, Ambrose Valley accounts for over three-quarters of all combat events and more than two-thirds of all matches and player journeys.

### 2. Back It Up — Pattern, Stat & Concrete Evidence
The activity imbalance is statistically overwhelming across every recorded metric:

- **Discrete Events (`events.json`, n = 14,750 total events)**:
  - **Ambrose Valley**: **11,266 events (76.4%)**
  - **Lockdown**: 2,489 events (16.9%)
  - **Grand Rift**: 995 events (6.7%)
- **Matches and Journeys (`global_stats.json`, n = 796 matches, 1,242 journeys)**:
  - **Ambrose Valley**: **566 matches (71.1%)** | **836 journeys (67.3%)**
  - **Lockdown**: 171 matches (21.5%) | 295 journeys (23.7%)
  - **Grand Rift**: 59 matches (7.4%) | 111 journeys (8.9%)
- **Human Spatial Position Samples (`heatmaps.json`, n = 50,501 human samples)**:
  - **Ambrose Valley**: **35,429 samples (70.2%)**
  - **Lockdown**: 11,355 samples (22.5%)
  - **Grand Rift**: 3,717 samples (7.4%)

Every discrete event record (`map_id`) was verified without missing or invalid values. Denominators: 14,750 total discrete events, 796 matches, and 50,501 human samples.

### 3. Actionable Takeaways: Affected Metrics & Actionable Items
- **Metrics Affected**:
  - *Matchmaking Queue Latency*: Player wait times across non-primary queues.
  - *Map Abandonment / Dodge Rate*: Proportion of players aborting lobbies when assigned non-preferred maps.
  - *Statistical Sample Confidence Index*: Reliability of balance tweaks applied across maps.
- **Actionable Items**:
  1. **Matchmaker Rotation Weighting**: Re-weight server queue rotation algorithms from static round-robin to dynamic weighting to ensure equal sample collection across all three maps.
  2. **Per-Journey Normalized Balancing**: When tuning weapons, bot aggression, or loot drop probabilities, calculate metrics on a per-journey or per-hour basis rather than aggregate totals, preventing Ambrose Valley's terrain from skewing global gameplay tuning.
  3. **Queue Incentives**: Introduce featured map rotation bonuses (e.g. +20% bonus battle pass progression) during off-peak hours on Grand Rift and Lockdown to organically distribute server load.

### 4. Why a Level Designer Should Care
Level designers cannot evaluate map layout, chokepoints, or sightlines without statistical sample density. Ambrose Valley benefits from 35,429 human position samples across 836 journeys, providing high statistical confidence in its movement corridors. Grand Rift, by contrast, has only 3,717 human samples across 59 matches. Critical design flaws on Grand Rift (unintentional sightline snags, dead zones, or traversal exploits) risk slipping through unnoticed due to insufficient operational testing.

---

## Finding 2: Grand Rift Exhibits High Spatial Divergence Between Human and Bot Movement

### 1. What Caught Our Eye in the Data
When comparing the spatial overlap between human participants and server bots across 64×64 grid sectors, Grand Rift displayed a striking divergence: human players regularly explored large portions of the terrain where server bots never set foot.

### 2. Back It Up — Pattern, Stat & Concrete Evidence
Evaluating sector occupancy across the 4,096 cells of each map's 64×64 spatial grid reveals a sharp divergence:

| Map | Human-Active Sectors | Bot-Active Sectors | Human-Exclusive Sectors (`Human > 0, Bot = 0`) | Human-Exclusive % of Human Active |
|---|---:|---:|---:|---:|
| **Ambrose Valley** | 1,556 | 1,302 | 298 | **19.2%** |
| **Grand Rift** | 981 | 688 | 448 | **45.7%** |
| **Lockdown** | 1,008 | 894 | 208 | **20.6%** |

- **45.7% of human-active sectors on Grand Rift have zero recorded bot samples**.
- This is **2.4× higher than Ambrose Valley (19.2%)** and **2.2× higher than Lockdown (20.6%)**.
- This divergence is not simply due to a lack of bots: Grand Rift recorded 2,011 bot samples (H:B ratio of 1.85 : 1, comparable to Lockdown's 1.58 : 1). However, bots on Grand Rift were confined to a narrow footprint of 688 sectors, while human players traversed 981 sectors.

### 3. Actionable Takeaways: Affected Metrics & Actionable Items
- **Metrics Affected**:
  - *Human-Bot Encounter Frequency*: Average elapsed minutes before a human player encounters a bot.
  - *Combat Engagement Rate*: Percentage of match duration spent in active combat encounters.
  - *Peripheral Zone Dwell Time*: Time spent by players navigating uncontested territory.
- **Actionable Items**:
  1. **Navmesh & Patrol Volume Audit**: Inspect the 448 human-exclusive sectors in Grand Rift’s navmesh to determine whether elevation changes, cliffs, or jump links prevent server bot navigation.
  2. **Dynamic Roaming Waypoints**: Update server bot patrol algorithms to assign dynamic search radii into flanking ridges and peripheral outposts rather than adhering strictly to central arterial roads.
  3. **Rebalance Bot Spawn Anchors**: Redistribute a portion of bot spawn points into peripheral sectors where human players frequently transit.

### 4. Why a Level Designer Should Care
In multiplayer shooter design, bots exist to maintain pacing, provide target practice, and simulate active combat when player density is low. When nearly half the traversed map sectors contain zero bots, human players experience prolonged "dead stretches" where no combat occurs, eroding gameplay tension. Furthermore, if humans can traverse terrain that bots cannot navigate, players may have discovered geometry exploits or unclipped terrain perches that break the intended level boundaries.

---

## Finding 3: Loot Interaction Events Are Hyper-Concentrated in a Tiny Fraction of Sectors

### 1. What Caught Our Eye in the Data
Resource scavenging is heavily bottlenecked. Instead of loot interactions distributing smoothly across POIs, discrete `Loot` events cluster tightly into a minuscule fraction of sectors, turning small physical areas into hyper-dense resource magnets.

### 2. Back It Up — Pattern, Stat & Concrete Evidence
Spatial discretization of all 11,632 discrete `Loot` events across the 64×64 grids demonstrates extreme micro-clustering:

| Map | Total Loot Events | Active Loot Sectors | Top 10 Sectors' Share | Top 5% Human Sectors' Share | Top 10% Human Sectors' Share |
|---|---:|---:|---:|---:|---:|
| **Ambrose Valley** | 8,988 | 573 (14.0% of map) | 1,716 = **19.1%** | 5,140 = **57.2%** (78 cells) | 6,706 = **74.6%** (155 cells) |
| **Lockdown** | 1,891 | 309 (7.5% of map) | 366 = **19.4%** | 882 = **46.6%** (51 cells) | 1,200 = **63.5%** (100 cells) |
| **Grand Rift** | 753 | 199 (4.9% of map) | 145 = **19.3%** | 273 = **36.3%** (50 cells) | 421 = **55.9%** (98 cells) |

- **Ambrose Valley Top 5% / 10% Concentration**: The top 5% most human-active sectors (78 cells) capture **57.2% of all loot events**, and the top 10% (155 cells) capture **74.6%**.
- **Peak Super-Cluster on Ambrose Valley**: Two adjacent 64×64 cells concentrate **542 loot events (6.0% of the entire map's loot)** in an area under $400\text{ m}^2$:
  - Sector `[R55, C22]`: $X \in [-61, -47]\text{ m}$, $Z \in [-360, -346]\text{ m}$ (325 Loot events)
  - Sector `[R55, C23]`: $X \in [-47, -32]\text{ m}$, $Z \in [-360, -346]\text{ m}$ (217 Loot events)
- **Cross-Map Uniformity**: Across all three maps, the top 10 sectors consistently account for ~19% of all loot events on each map.

### 3. Actionable Takeaways: Affected Metrics & Actionable Items
- **Metrics Affected**:
  - *Early-Game Mortality Variance*: Rate of eliminations occurring within the first 90 seconds.
  - *Time-to-First-Equip*: Average seconds from match start until a player completes their first loot action.
  - *Spatial Dispersion Index*: Geometric spread of player trajectories across the map canvas.
- **Actionable Items**:
  1. **De-Densify Peak Clusters**: Reduce crate and container density in Ambrose Valley sector `[R55, C22-C23]` by 35–40%, redistributing containers into underutilized neighboring sectors (`[R50-R54, C20-C25]`).
  2. **Tier-Weighted Perimeter Incentives**: Place higher-tier weapon/armor spawns along perimeter POIs to draw traffic away from central super-clusters.
  3. **Environmental Risk Coupling**: Introduce environmental hazards or storm collapse paths that pass through hyper-dense loot hubs, balancing the high reward with proportional risk.

### 4. Why a Level Designer Should Care
When 75% of loot interactions occur within 10% of traversed sectors, players quickly learn the single "optimal landing zone" and ignore the rest of the map. This creates degenerate match flow: chaotic early-game death piles at the hot-drop, followed by a barren mid-game where surviving players wander empty corridors devoid of resources. By referencing these exact world coordinates $[X, Z]$, level designers can redistribute loot spawners to create varied route options, promote flanking, and restore balanced pacing.

