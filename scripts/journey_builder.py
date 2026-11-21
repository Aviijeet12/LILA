import math
from typing import List, Dict, Any, Tuple
import pandas as pd
from scripts.coordinate_mapping import world_to_uv

MOVEMENT_EVENTS = {"Position", "BotPosition"}
DEATH_EVENTS = {"BotKilled", "KilledByStorm", "Killed"}

def build_journeys(clean_df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    print(f"[JourneyBuilder] Reconstructing player journeys from {len(clean_df):,} records...")

    journeys: List[Dict[str, Any]] = []
    total_positions = 0
    total_discrete_events = 0

    # Group by match_id and user_id
    grouped = clean_df.groupby(["match_id", "user_id"], sort=False)

    for (match_id, user_id), group in grouped:
        group_sorted = group.sort_values("ts_sec", ascending=True)

        map_id = group_sorted["map_id"].iloc[0]
        date_str = group_sorted["date"].iloc[0]
        is_bot = str(user_id).isdigit()
        entity_type = "bot" if is_bot else "human"

        start_ts = int(group_sorted["ts_sec"].iloc[0])
        end_ts = int(group_sorted["ts_sec"].iloc[-1])
        duration_seconds = max(0, end_ts - start_ts)

        positions = []
        events = []

        dist_travelled = 0.0
        prev_x, prev_z = None, None

        for _, row in group_sorted.iterrows():
            ev = row["event_str"]
            x = round(float(row["x"]), 2)
            y = round(float(row["y"]), 2)
            z = round(float(row["z"]), 2)
            ts = int(row["ts_sec"])
            iso = row["ts_iso"]

            u, v = world_to_uv(x, z, map_id)
            u = round(float(u), 4)
            v = round(float(v), 4)

            coord_dict = {"ts": ts, "x": x, "y": y, "z": z, "u": u, "v": v}

            if ev in MOVEMENT_EVENTS:
                positions.append(coord_dict)
                if prev_x is not None and prev_z is not None:
                    step_dist = math.sqrt((x - prev_x) ** 2 + (z - prev_z) ** 2)
                    dist_travelled += step_dist
                prev_x, prev_z = x, z
            else:
                event_dict = {
                    "event": ev,
                    "ts": ts,
                    "iso": iso,
                    "x": x,
                    "y": y,
                    "z": z,
                    "u": u,
                    "v": v
                }
                events.append(event_dict)

        total_positions += len(positions)
        total_discrete_events += len(events)

        # Terminal event and outcome
        terminal_event = group_sorted["event_str"].iloc[-1]
        if terminal_event in DEATH_EVENTS:
            outcome = "ELIMINATED"
        else:
            outcome = "SURVIVED_PRESUMED"

        # Starting and ending positions
        if positions:
            start_pos = {"x": positions[0]["x"], "y": positions[0]["y"], "z": positions[0]["z"], "u": positions[0]["u"], "v": positions[0]["v"]}
            end_pos = {"x": positions[-1]["x"], "y": positions[-1]["y"], "z": positions[-1]["z"], "u": positions[-1]["u"], "v": positions[-1]["v"]}
        else:
            first_row = group_sorted.iloc[0]
            last_row = group_sorted.iloc[-1]
            u0, v0 = world_to_uv(first_row["x"], first_row["z"], map_id)
            u1, v1 = world_to_uv(last_row["x"], last_row["z"], map_id)
            start_pos = {"x": round(float(first_row["x"]), 2), "y": round(float(first_row["y"]), 2), "z": round(float(first_row["z"]), 2), "u": round(float(u0), 4), "v": round(float(v0), 4)}
            end_pos = {"x": round(float(last_row["x"]), 2), "y": round(float(last_row["y"]), 2), "z": round(float(last_row["z"]), 2), "u": round(float(u1), 4), "v": round(float(v1), 4)}

        # Event counts for summary
        ev_counts = group_sorted["event_str"].value_counts().to_dict()

        journey_obj = {
            "journey_id": f"{user_id}_{match_id}",
            "user_id": str(user_id),
            "match_id": str(match_id),
            "map_id": str(map_id),
            "date": date_str,
            "entity_type": entity_type,
            "start_ts": start_ts,
            "end_ts": end_ts,
            "duration_seconds": duration_seconds,
            "distance_travelled_meters": round(dist_travelled, 2),
            "starting_position": start_pos,
            "ending_position": end_pos,
            "terminal_event": terminal_event,
            "outcome": outcome,
            "event_counts": ev_counts,
            "positions_count": len(positions),
            "discrete_events_count": len(events),
            "positions": positions,
            "events": events
        }
        journeys.append(journey_obj)

    print(f"[JourneyBuilder] Built {len(journeys):,} journeys ({total_positions:,} positions, {total_discrete_events:,} events).")

    report = {
        "total_journeys_built": len(journeys),
        "total_position_samples": total_positions,
        "total_discrete_events": total_discrete_events,
        "human_journeys": sum(1 for j in journeys if j["entity_type"] == "human"),
        "bot_journeys": sum(1 for j in journeys if j["entity_type"] == "bot"),
        "eliminated_count": sum(1 for j in journeys if j["outcome"] == "ELIMINATED"),
        "survived_presumed_count": sum(1 for j in journeys if j["outcome"] == "SURVIVED_PRESUMED")
    }

    return journeys, report
