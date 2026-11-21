from typing import List, Dict, Any
import numpy as np

LAYER_NAMES = [
    "human_traffic",
    "bot_traffic",
    "loot",
    "bot_kill",
    "bot_killed",
    "killed_by_storm"
]

def generate_map_heatmaps(
    journeys: List[Dict[str, Any]],
    grid_size: int = 64
) -> Dict[str, Dict[str, Any]]:
    print(f"[HeatmapGenerator] Generating {grid_size}x{grid_size} spatial heatmaps for each map...")

    # Initialize 3D numpy arrays per map: (num_layers, grid_size, grid_size)
    maps = ["AmbroseValley", "GrandRift", "Lockdown"]
    layer_idx = {name: idx for idx, name in enumerate(LAYER_NAMES)}

    grids: Dict[str, np.ndarray] = {
        m: np.zeros((len(LAYER_NAMES), grid_size, grid_size), dtype=np.int32)
        for m in maps
    }

    # Populate grids from journeys
    for j in journeys:
        map_id = j["map_id"]
        if map_id not in grids:
            continue
        grid_stack = grids[map_id]
        is_human = (j["entity_type"] == "human")
        traffic_layer = layer_idx["human_traffic"] if is_human else layer_idx["bot_traffic"]

        # 1. Traffic from position samples
        for p in j["positions"]:
            u, v = p["u"], p["v"]
            col = min(int(u * grid_size), grid_size - 1)
            row = min(int((1.0 - v) * grid_size), grid_size - 1)
            if 0 <= col < grid_size and 0 <= row < grid_size:
                grid_stack[traffic_layer, row, col] += 1

        # 2. Discrete events
        for ev in j["events"]:
            ev_name = ev["event"]
            u, v = ev["u"], ev["v"]
            col = min(int(u * grid_size), grid_size - 1)
            row = min(int((1.0 - v) * grid_size), grid_size - 1)
            if not (0 <= col < grid_size and 0 <= row < grid_size):
                continue

            if ev_name == "Loot":
                grid_stack[layer_idx["loot"], row, col] += 1
            elif ev_name in ("BotKill", "Kill"):
                grid_stack[layer_idx["bot_kill"], row, col] += 1
            elif ev_name in ("BotKilled", "Killed"):
                grid_stack[layer_idx["bot_killed"], row, col] += 1
            elif ev_name == "KilledByStorm":
                grid_stack[layer_idx["killed_by_storm"], row, col] += 1

    # Format output dictionary per map
    result: Dict[str, Dict[str, Any]] = {}
    for map_name in maps:
        grid_stack = grids[map_name]
        layers_data: Dict[str, Any] = {}

        for l_name, l_i in layer_idx.items():
            l_grid = grid_stack[l_i]
            total_pts = int(np.sum(l_grid))
            max_c = int(np.max(l_grid)) if total_pts > 0 else 0
            active_c = int(np.count_nonzero(l_grid))

            layers_data[l_name] = {
                "name": l_name,
                "total_points": total_pts,
                "max_cell_count": max_c,
                "active_cells_count": active_c,
                "grid": l_grid.tolist()
            }

        result[map_name] = {
            "map_id": map_name,
            "grid_size": grid_size,
            "coordinate_system": "UV_normalized (0.0 to 1.0)",
            "row_orientation": "row 0 is North (v=1.0), row N-1 is South (v=0.0)",
            "col_orientation": "col 0 is West (u=0.0), col N-1 is East (u=1.0)",
            "layers": layers_data
        }
        print(f"[HeatmapGenerator] Map '{map_name}' heatmaps: Human traffic={layers_data['human_traffic']['total_points']:,} pts, Bot traffic={layers_data['bot_traffic']['total_points']:,} pts, Loot={layers_data['loot']['total_points']:,} pts, BotKill={layers_data['bot_kill']['total_points']:,} pts, BotKilled={layers_data['bot_killed']['total_points']:,} pts, StormDeaths={layers_data['killed_by_storm']['total_points']:,} pts.")

    return result
