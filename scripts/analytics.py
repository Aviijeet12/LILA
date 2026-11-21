from typing import List, Dict, Any, Tuple
from collections import defaultdict
import numpy as np

def compute_analytics(
    journeys: List[Dict[str, Any]],
    cleaning_report: Dict[str, Any],
    loader_report: Dict[str, Any]
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    print("[Analytics] Computing global, match, player, map, and event statistics...")

    # Data structures for aggregation
    matches_dict: Dict[str, Dict[str, Any]] = {}
    players_dict: Dict[str, Dict[str, Any]] = {}
    maps_dict: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "total_matches": 0,
        "total_journeys": 0,
        "human_journeys": 0,
        "bot_journeys": 0,
        "unique_humans": set(),
        "unique_bots": set(),
        "total_distance_meters": 0.0,
        "durations": [],
        "event_counts": defaultdict(int),
        "outcomes": {"ELIMINATED": 0, "SURVIVED_PRESUMED": 0}
    })

    all_discrete_events: List[Dict[str, Any]] = []

    # Process all journeys
    for j in journeys:
        mid = j["match_id"]
        uid = j["user_id"]
        map_id = j["map_id"]
        date_str = j["date"]
        entity_type = j["entity_type"]
        dur = j["duration_seconds"]
        dist = j["distance_travelled_meters"]
        ev_counts = j["event_counts"]
        outcome = j["outcome"]

        # Collect discrete events for global events index
        for ev in j["events"]:
            all_discrete_events.append({
                "event": ev["event"],
                "match_id": mid,
                "user_id": uid,
                "entity_type": entity_type,
                "map_id": map_id,
                "date": date_str,
                "ts": ev["ts"],
                "iso": ev["iso"],
                "x": ev["x"],
                "y": ev["y"],
                "z": ev["z"],
                "u": ev["u"],
                "v": ev["v"]
            })

        # 1. Match aggregation
        if mid not in matches_dict:
            matches_dict[mid] = {
                "match_id": mid,
                "map_id": map_id,
                "date": date_str,
                "start_ts": j["start_ts"],
                "end_ts": j["end_ts"],
                "duration_seconds": dur,
                "human_count": 0,
                "bot_count": 0,
                "total_participants": 0,
                "total_events": 0,
                "movement_samples": 0,
                "discrete_events": 0,
                "eliminated_count": 0,
                "survived_presumed_count": 0,
                "total_loot_events": 0,
                "total_bot_kills": 0,
                "total_deaths": 0,
                "total_distance_travelled_meters": 0.0,
                "participants": []
            }

        m_obj = matches_dict[mid]
        m_obj["start_ts"] = min(m_obj["start_ts"], j["start_ts"])
        m_obj["end_ts"] = max(m_obj["end_ts"], j["end_ts"])
        m_obj["duration_seconds"] = max(0, m_obj["end_ts"] - m_obj["start_ts"])

        if entity_type == "human":
            m_obj["human_count"] += 1
        else:
            m_obj["bot_count"] += 1
        m_obj["total_participants"] += 1

        loot_c = ev_counts.get("Loot", 0)
        bot_kills = ev_counts.get("BotKill", 0) + ev_counts.get("Kill", 0)
        deaths = ev_counts.get("BotKilled", 0) + ev_counts.get("KilledByStorm", 0) + ev_counts.get("Killed", 0)

        m_obj["total_events"] += sum(ev_counts.values())
        m_obj["movement_samples"] += j["positions_count"]
        m_obj["discrete_events"] += j["discrete_events_count"]
        m_obj["total_loot_events"] += loot_c
        m_obj["total_bot_kills"] += bot_kills
        m_obj["total_deaths"] += deaths
        m_obj["total_distance_travelled_meters"] += dist

        if outcome == "ELIMINATED":
            m_obj["eliminated_count"] += 1
        else:
            m_obj["survived_presumed_count"] += 1

        m_obj["participants"].append({
            "user_id": uid,
            "entity_type": entity_type,
            "outcome": outcome,
            "terminal_event": j["terminal_event"],
            "duration_seconds": dur,
            "distance_travelled_meters": dist,
            "positions_count": j["positions_count"],
            "loot_count": loot_c,
            "bot_kills": bot_kills,
            "deaths": deaths
        })

        # 2. Player aggregation
        if uid not in players_dict:
            players_dict[uid] = {
                "user_id": uid,
                "entity_type": entity_type,
                "matches_played": 0,
                "total_duration_seconds": 0,
                "avg_duration_seconds": 0.0,
                "total_distance_travelled_meters": 0.0,
                "avg_distance_travelled_meters": 0.0,
                "total_loot_events": 0,
                "total_bot_kill_events": 0,
                "total_death_events": 0,
                "total_storm_deaths": 0,
                "outcomes": {"ELIMINATED": 0, "SURVIVED_PRESUMED": 0},
                "maps_played": defaultdict(int),
                "dates_active": set(),
                "matches": []
            }

        p_obj = players_dict[uid]
        p_obj["matches_played"] += 1
        p_obj["total_duration_seconds"] += dur
        p_obj["total_distance_travelled_meters"] += dist
        p_obj["total_loot_events"] += loot_c
        p_obj["total_bot_kill_events"] += ev_counts.get("BotKill", 0) + ev_counts.get("Kill", 0)
        p_obj["total_death_events"] += deaths
        p_obj["total_storm_deaths"] += ev_counts.get("KilledByStorm", 0)
        p_obj["outcomes"][outcome] += 1
        p_obj["maps_played"][map_id] += 1
        p_obj["dates_active"].add(date_str)
        p_obj["matches"].append(mid)

        # 3. Map aggregation
        map_st = maps_dict[map_id]
        map_st["total_journeys"] += 1
        if entity_type == "human":
            map_st["human_journeys"] += 1
            map_st["unique_humans"].add(uid)
        else:
            map_st["bot_journeys"] += 1
            map_st["unique_bots"].add(uid)
        map_st["total_distance_meters"] += dist
        map_st["durations"].append(dur)
        map_st["outcomes"][outcome] += 1
        for ev_name, cnt in ev_counts.items():
            map_st["event_counts"][ev_name] += cnt

    # Finalize match records
    matches_list = list(matches_dict.values())
    for m in matches_list:
        m["total_distance_travelled_meters"] = round(m["total_distance_travelled_meters"], 2)

    # Count unique matches per map
    for m in matches_list:
        maps_dict[m["map_id"]]["total_matches"] += 1

    # Finalize player records
    players_list = []
    for p in players_dict.values():
        p_copy = dict(p)
        mp = p_copy["matches_played"]
        p_copy["avg_duration_seconds"] = round(p_copy["total_duration_seconds"] / mp, 1) if mp > 0 else 0.0
        p_copy["total_distance_travelled_meters"] = round(p_copy["total_distance_travelled_meters"], 2)
        p_copy["avg_distance_travelled_meters"] = round(p_copy["total_distance_travelled_meters"] / mp, 2) if mp > 0 else 0.0
        p_copy["maps_played"] = dict(p_copy["maps_played"])
        p_copy["dates_active"] = sorted(list(p_copy["dates_active"]))
        players_list.append(p_copy)

    # Sort players by matches_played desc, then total_distance desc
    players_list.sort(key=lambda x: (x["matches_played"], x["total_distance_travelled_meters"]), reverse=True)

    # Finalize map records
    minimap_files = {
        "AmbroseValley": "AmbroseValley_Minimap.png",
        "GrandRift": "GrandRift_Minimap.png",
        "Lockdown": "Lockdown_Minimap.jpg"
    }
    map_configs_meta = {
        "AmbroseValley": {"scale": 900.0, "origin_x": -370.0, "origin_z": -473.0, "width": 4320, "height": 4320},
        "GrandRift": {"scale": 581.0, "origin_x": -290.0, "origin_z": -290.0, "width": 2160, "height": 2158},
        "Lockdown": {"scale": 1000.0, "origin_x": -500.0, "origin_z": -500.0, "width": 9000, "height": 9000}
    }

    final_maps_dict: Dict[str, Dict[str, Any]] = {}
    for map_name, st in maps_dict.items():
        durations = st["durations"]
        cfg = map_configs_meta.get(map_name, {})
        final_maps_dict[map_name] = {
            "map_id": map_name,
            "scale": cfg.get("scale"),
            "origin_x": cfg.get("origin_x"),
            "origin_z": cfg.get("origin_z"),
            "native_width": cfg.get("width"),
            "native_height": cfg.get("height"),
            "minimap_filename": minimap_files.get(map_name),
            "total_matches": st["total_matches"],
            "total_journeys": st["total_journeys"],
            "human_journeys": st["human_journeys"],
            "bot_journeys": st["bot_journeys"],
            "unique_humans": len(st["unique_humans"]),
            "unique_bots": len(st["unique_bots"]),
            "total_distance_km": round(st["total_distance_meters"] / 1000.0, 2),
            "avg_journey_duration_seconds": round(float(np.mean(durations)), 1) if durations else 0.0,
            "median_journey_duration_seconds": round(float(np.median(durations)), 1) if durations else 0.0,
            "event_counts": dict(st["event_counts"]),
            "outcomes": dict(st["outcomes"])
        }

    # Global Statistics
    total_matches = len(matches_list)
    total_humans = sum(1 for p in players_list if p["entity_type"] == "human")
    total_bots = sum(1 for p in players_list if p["entity_type"] == "bot")
    total_dist_meters = sum(p["total_distance_travelled_meters"] for p in players_list)

    # Date distribution
    matches_per_day = defaultdict(int)
    journeys_per_day = defaultdict(int)
    for m in matches_list:
        matches_per_day[m["date"]] += 1
    for j in journeys:
        journeys_per_day[j["date"]] += 1

    # Event distributions
    clean_events = cleaning_report["event_distribution_clean"]
    human_events = defaultdict(int)
    bot_events = defaultdict(int)
    for j in journeys:
        target = human_events if j["entity_type"] == "human" else bot_events
        for ev, cnt in j["event_counts"].items():
            target[ev] += cnt

    global_stats = {
        "dataset_name": "LILA BLACK — Production Gameplay Telemetry",
        "date_range": "2026-02-10 to 2026-02-14",
        "total_matches": total_matches,
        "total_unique_players": len(players_list),
        "total_unique_humans": total_humans,
        "total_unique_bots": total_bots,
        "total_journeys": len(journeys),
        "total_raw_records": loader_report["total_original_raw_rows_with_duplicates"],
        "total_clean_records": cleaning_report["records_output"],
        "total_movement_samples": sum(j["positions_count"] for j in journeys),
        "total_discrete_events": len(all_discrete_events),
        "total_distance_travelled_km": round(total_dist_meters / 1000.0, 2),
        "matches_per_map": {m: final_maps_dict[m]["total_matches"] for m in final_maps_dict},
        "journeys_per_map": {m: final_maps_dict[m]["total_journeys"] for m in final_maps_dict},
        "matches_per_day": dict(sorted(matches_per_day.items())),
        "journeys_per_day": dict(sorted(journeys_per_day.items())),
        "event_distribution_overall": clean_events,
        "event_distribution_human": dict(human_events),
        "event_distribution_bot": dict(bot_events),
        "outcomes_overall": {
            "ELIMINATED": sum(1 for j in journeys if j["outcome"] == "ELIMINATED"),
            "SURVIVED_PRESUMED": sum(1 for j in journeys if j["outcome"] == "SURVIVED_PRESUMED")
        }
    }

    print(f"[Analytics] Calculated analytics for {total_matches} matches, {len(players_list)} players, and {len(final_maps_dict)} maps.")
    return global_stats, matches_list, players_list, final_maps_dict, all_discrete_events
