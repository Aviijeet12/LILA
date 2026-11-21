import os
import json
from typing import List, Dict, Any
from datetime import datetime, timezone

def export_processed_datasets(
    output_dir: str,
    global_stats: Dict[str, Any],
    matches_list: List[Dict[str, Any]],
    players_list: List[Dict[str, Any]],
    maps_metadata: Dict[str, Dict[str, Any]],
    map_heatmaps: Dict[str, Dict[str, Any]],
    journeys: List[Dict[str, Any]],
    all_discrete_events: List[Dict[str, Any]],
    quality_report: Dict[str, Any]
) -> Dict[str, Any]:
    print(f"[ExportData] Exporting optimized JSON datasets to {output_dir}...")
    os.makedirs(output_dir, exist_ok=True)

    exported_files_info = {}

    def save_json(rel_path: str, data: Any) -> str:
        full_path = os.path.join(output_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        sz = os.path.getsize(full_path)
        exported_files_info[rel_path.replace("\\", "/")] = {
            "size_bytes": sz,
            "size_mb": round(sz / (1024 * 1024), 3)
        }
        return full_path

    # 1. Global Stats
    save_json("global_stats.json", global_stats)

    # 2. Matches
    save_json("matches/matches.json", {
        "total_matches": len(matches_list),
        "matches": matches_list
    })

    # 3. Players
    save_json("players/players.json", {
        "total_players": len(players_list),
        "players": players_list
    })

    # 4. Events
    save_json("events/events.json", {
        "total_discrete_events": len(all_discrete_events),
        "events": all_discrete_events
    })

    # 5. Maps (AmbroseValley, GrandRift, Lockdown)
    # Group journeys by map for partitioning
    journeys_by_map: Dict[str, List[Dict[str, Any]]] = {
        "AmbroseValley": [],
        "GrandRift": [],
        "Lockdown": []
    }
    for j in journeys:
        m = j["map_id"]
        if m in journeys_by_map:
            journeys_by_map[m].append(j)

    for map_name in ["AmbroseValley", "GrandRift", "Lockdown"]:
        # metadata
        meta = maps_metadata.get(map_name, {})
        save_json(f"maps/{map_name}/metadata.json", meta)

        # journeys
        map_j = journeys_by_map.get(map_name, [])
        save_json(f"maps/{map_name}/journeys.json", {
            "map_id": map_name,
            "total_journeys": len(map_j),
            "journeys": map_j
        })

        # heatmaps
        hm = map_heatmaps.get(map_name, {})
        save_json(f"maps/{map_name}/heatmaps.json", hm)

    # 6. Quality & Processing Report
    save_json("quality/processing_report.json", quality_report)

    # 7. Manifest
    total_size = sum(info["size_bytes"] for info in exported_files_info.values())
    manifest = {
        "pipeline_version": "1.0.0",
        "dataset_name": "LILA BLACK — Player Intelligence",
        "export_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "total_exported_files": len(exported_files_info),
        "total_directory_size_bytes": total_size,
        "total_directory_size_mb": round(total_size / (1024 * 1024), 2),
        "summary_counts": {
            "total_matches": len(matches_list),
            "total_unique_players": len(players_list),
            "total_journeys": len(journeys),
            "total_movement_samples": global_stats["total_movement_samples"],
            "total_discrete_events": len(all_discrete_events),
            "total_clean_records": global_stats["total_clean_records"]
        },
        "files_manifest": exported_files_info
    }
    save_json("manifest.json", manifest)

    print(f"[ExportData] Finished export of {len(exported_files_info)} files ({round(total_size / (1024 * 1024), 2)} MB total).")
    return manifest
