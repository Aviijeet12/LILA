# LILA BLACK — Combat Telemetry Analysis

## 1. Overview

The **Combat Analysis** feature (`/combat`) exposes all recorded combat-related telemetry events across the 5-day dataset. It couples a tabular event log with an interactive spatial minimap preview, allowing analysts to isolate combat occurrences, inspect precise world/UV coordinates, and jump directly to replay playback at the exact timestamp of an encounter.

---

## 2. Event Semantics & Tallies

Every event in the dataset is traceable to source records. The exact overall combat counts in the production dataset (`data/processed/events/events.json`) are:

| Event Type | Total Count | Semantic Definition & Neutral Boundary |
| :--- | :--- | :--- |
| **`BotKill Events`** | **2,376** | Discrete telemetry records with event type `BotKill`. Emitted unilaterally along player journey trajectories; does not log victim identity or interaction partner. |
| **`BotKilled Events`** | **697** | Discrete telemetry records with event type `BotKilled`. Emitted unilaterally along bot journey trajectories; does not identify an eliminator. |
| **`Kill Events`** | **3** | Discrete telemetry records with event type `Kill`. Extremely low frequency in this dataset. No paired victim field is present. |
| **`Killed Events`** | **3** | Discrete telemetry records with event type `Killed`. Unilateral emission; no eliminator field is present. |
| **`Storm Death Events`** | **39** | Discrete telemetry records with event type `KilledByStorm`. Environmental elimination attributed to zone boundary constriction. |
| **`Loot Events`** | **11,632** | Discrete resource interaction records with event type `Loot`. Evaluated independently from elimination telemetry. |

### Total Discrete Events:
$$\text{BotKill (2,376)} + \text{BotKilled (697)} + \text{Kill (3)} + \text{Killed (3)} + \text{KilledByStorm (39)} + \text{Loot (11,632)} = \textbf{14,750 total events}$$

This is the exact total verified against `events.json` (`total_discrete_events` field). No residual records exist outside these six categories.

---

## 3. Telemetry Semantic Boundaries (Mandatory Governance)

1. **Independent Entity Logs (No Killer-Victim Linking)**:
   - `BotKill` and `BotKilled` are separate unilateral client/server emissions.
   - The telemetry schema does not contain killer IDs in `BotKilled` events or victim IDs in `BotKill` events.
   - **LILA BLACK strictly avoids fabricating killer-victim associations, kill feeds, or paired combat encounters.**
2. **No Fabricated Weapon / Damage Metrics**:
   - The telemetry dataset does not contain weapon models, ammo counts, health pools, armor values, or shot vectors.
   - No assumptions regarding weapon tier, engagement range, or tactical prowess are made.
3. **Storm Deaths Kept Isolated**:
   - `KilledByStorm` events represent zone death and are never grouped with player-on-player or player-on-bot combat tallies.

---

## 4. Analytical Tools

1. **Category Filter**:
   - All Combat Events (Excluding Loot)
   - `BotKill` only
   - `BotKilled` only
   - `Kill` only
   - `Killed` only
   - `KilledByStorm` only
   - `Loot` pickups only
   - All Events Including Loot
2. **Entity Search**: Filter events associated with any specific entity ID.
3. **Map & Date Selectors**: Focus on specific operational theaters (`AmbroseValley`, `GrandRift`, `Lockdown`) and test dates.
4. **Interactive Spatial Minimap Preview (`CombatMapPreview.tsx`)**:
   - Plots actual event locations onto map terrain.
   - Color-coded pins matching the platform-wide design system:
     - `BotKill`: Emerald / Rose ring
     - `BotKilled`: Crimson red
     - `Kill`: Bright amber
     - `Killed`: Deep purple
     - `KilledByStorm`: Indigo
     - `Loot`: Gold amber
   - Interactive selection: Clicking an event row or canvas dot highlights the pin with a pulsed ring and displays the coordinate dossier.
5. **Replay Deep Linking**:
   - Clicking **Replay** on any row or **Open In Map Explorer Replay** in the event dossier immediately navigates to `/map-explorer?map=<mapId>&seek=<ts>`, initializing playback directly at the event moment.
