import os
import glob
import json
import pyarrow.parquet as pq
import pyarrow as pa
import pandas as pd
import numpy as np
from PIL import Image
from collections import Counter, defaultdict

RAW_DIR = "data/raw/player_data"
DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]

def investigate_dataset():
    print("=== STARTING COMPREHENSIVE TELEMETRY INVESTIGATION ===")
    
    # 1. File discovery
    all_files = []
    day_file_counts = {}
    for day in DAYS:
        day_dir = os.path.join(RAW_DIR, day)
        if os.path.exists(day_dir):
            files = [os.path.join(day_dir, f) for f in os.listdir(day_dir) if not f.startswith('.')]
            day_file_counts[day] = len(files)
            all_files.extend(files)
        else:
            day_file_counts[day] = 0
            
    print(f"Total files found across {len(DAYS)} days: {len(all_files)}")
    for d, c in day_file_counts.items():
        print(f"  {d}: {c} files")
        
    other_items = [f for f in os.listdir(RAW_DIR) if f not in DAYS]
    print(f"Other items in {RAW_DIR}: {other_items}")
    
    # 2. Schema inspection across all files
    schemas = Counter()
    schema_details = {}
    
    total_rows = 0
    day_rows = defaultdict(int)
    
    all_user_ids = set()
    all_match_ids = set()
    all_map_ids = set()
    all_events = Counter()
    events_by_user_type = {"human": Counter(), "bot": Counter()}
    
    null_counts = defaultdict(int)
    total_rows_by_user_type = {"human": 0, "bot": 0}
    
    coord_stats = defaultdict(lambda: {
        "count": 0,
        "x_min": float("inf"), "x_max": float("-inf"),
        "y_min": float("inf"), "y_max": float("-inf"),
        "z_min": float("inf"), "z_max": float("-inf"),
        "x_nulls": 0, "y_nulls": 0, "z_nulls": 0,
        "x_nan": 0, "y_nan": 0, "z_nan": 0
    })
    
    map_configs = {
        "AmbroseValley": {"scale": 900.0, "origin_x": -370.0, "origin_z": -473.0},
        "GrandRift": {"scale": 581.0, "origin_x": -290.0, "origin_z": -290.0},
        "Lockdown": {"scale": 1000.0, "origin_x": -500.0, "origin_z": -500.0}
    }
    
    out_of_bounds_counts = defaultdict(int)
    
    min_ts_overall = None
    max_ts_overall = None
    ts_samples = []
    
    exact_duplicates = 0
    duplicate_user_ts = 0
    sample_records = []
    
    print("\nReading all parquet files and verifying schemas...")
    
    for idx, filepath in enumerate(all_files):
        try:
            parquet_file = pq.ParquetFile(filepath)
            schema = parquet_file.schema_arrow
            schema_str = str(schema)
            schemas[schema_str] += 1
            if schema_str not in schema_details:
                schema_details[schema_str] = {
                    "names": schema.names,
                    "types": [str(t) for t in schema.types],
                    "metadata": {k.decode('utf-8') if isinstance(k, bytes) else str(k): v.decode('utf-8') if isinstance(v, bytes) else str(v) for k, v in (schema.metadata or {}).items()}
                }
                
            tbl = parquet_file.read()
            df = tbl.to_pandas()
            
            day = os.path.basename(os.path.dirname(filepath))
            rows = len(df)
            total_rows += rows
            day_rows[day] += rows
            
            dup_count = df.duplicated().sum()
            exact_duplicates += dup_count
            
            if 'user_id' in df.columns and 'ts' in df.columns:
                dup_u_ts = df.duplicated(subset=['user_id', 'ts']).sum()
                duplicate_user_ts += dup_u_ts
                
            fname = os.path.basename(filepath)
            u_part = fname.split('_')[0]
            is_bot = u_part.isdigit()
            user_type = "bot" if is_bot else "human"
            total_rows_by_user_type[user_type] += rows
            
            if idx < 3:
                sample_records.append({
                    "file": fname,
                    "user_type": user_type,
                    "head": [{k: (v.decode('utf-8') if isinstance(v, bytes) else str(v)) for k, v in rec.items()} for rec in df.head(3).to_dict(orient='records')]
                })
                
            for col in df.columns:
                null_counts[col] += int(df[col].isnull().sum())
                
            if 'user_id' in df.columns:
                all_user_ids.update(df['user_id'].dropna().unique())
            if 'match_id' in df.columns:
                all_match_ids.update(df['match_id'].dropna().unique())
            if 'map_id' in df.columns:
                unique_maps = df['map_id'].dropna().unique()
                all_map_ids.update(unique_maps)
                
            if 'event' in df.columns:
                decoded_events = df['event'].apply(
                    lambda e: e.decode('utf-8') if isinstance(e, bytes) else str(e)
                )
                ev_counts = decoded_events.value_counts().to_dict()
                for ev, count in ev_counts.items():
                    all_events[ev] += int(count)
                    events_by_user_type[user_type][ev] += int(count)
                    
            if 'map_id' in df.columns and 'x' in df.columns and 'z' in df.columns:
                for map_name, group in df.groupby('map_id'):
                    st = coord_stats[map_name]
                    st["count"] += len(group)
                    
                    x_s = group['x']
                    y_s = group['y']
                    z_s = group['z']
                    
                    st["x_nulls"] += int(x_s.isnull().sum())
                    st["y_nulls"] += int(y_s.isnull().sum())
                    st["z_nulls"] += int(z_s.isnull().sum())
                    
                    st["x_nan"] += int(np.isnan(x_s).sum())
                    st["y_nan"] += int(np.isnan(y_s).sum())
                    st["z_nan"] += int(np.isnan(z_s).sum())
                    
                    valid_x = x_s.dropna()
                    valid_y = y_s.dropna()
                    valid_z = z_s.dropna()
                    
                    if len(valid_x) > 0:
                        st["x_min"] = min(st["x_min"], float(valid_x.min()))
                        st["x_max"] = max(st["x_max"], float(valid_x.max()))
                    if len(valid_y) > 0:
                        st["y_min"] = min(st["y_min"], float(valid_y.min()))
                        st["y_max"] = max(st["y_max"], float(valid_y.max()))
                    if len(valid_z) > 0:
                        st["z_min"] = min(st["z_min"], float(valid_z.min()))
                        st["z_max"] = max(st["z_max"], float(valid_z.max()))
                        
                    cfg = map_configs.get(map_name)
                    if cfg:
                        u = (valid_x - cfg["origin_x"]) / cfg["scale"]
                        v = (valid_z - cfg["origin_z"]) / cfg["scale"]
                        oob = int(((u < 0) | (u > 1) | (v < 0) | (v > 1)).sum())
                        out_of_bounds_counts[map_name] += oob
                        
            if 'ts' in df.columns:
                ts_col = df['ts']
                valid_ts = ts_col.dropna()
                if len(valid_ts) > 0:
                    ts_min = valid_ts.min()
                    ts_max = valid_ts.max()
                    if min_ts_overall is None or ts_min < min_ts_overall:
                        min_ts_overall = ts_min
                    if max_ts_overall is None or ts_max > max_ts_overall:
                        max_ts_overall = ts_max
                if idx == 0:
                    ts_samples.extend([str(t) for t in valid_ts.head(5).tolist()])
                    
        except Exception as ex:
            print(f"Error reading file {filepath}: {ex}")
            
    print(f"\nCompleted reading {len(all_files)} files.")
    print(f"Total Rows: {total_rows}")
    print(f"Rows by day: {dict(day_rows)}")
    print(f"Human rows: {total_rows_by_user_type['human']}, Bot rows: {total_rows_by_user_type['bot']}")
    print(f"Unique Users: {len(all_user_ids)} (Human: {sum(1 for u in all_user_ids if not u.isdigit())}, Bot: {sum(1 for u in all_user_ids if u.isdigit())})")
    print(f"Unique Matches: {len(all_match_ids)}")
    print(f"Unique Maps: {all_map_ids}")
    
    print("\n--- SCHEMA FINDINGS ---")
    print(f"Unique Schemas count: {len(schemas)}")
    for s_str, cnt in schemas.items():
        print(f"Schema count {cnt}:")
        print(s_str)
        
    print("\n--- NULL VALUES ---")
    for col, n_cnt in null_counts.items():
        print(f"  {col}: {n_cnt} nulls ({n_cnt / total_rows * 100:.4f}%)")
        
    print("\n--- DUPLICATES ---")
    print(f"Exact row duplicates: {exact_duplicates}")
    print(f"Duplicate (user_id, ts): {duplicate_user_ts}")
    
    print("\n--- EVENT DISTRIBUTION ---")
    for ev, c in all_events.most_common():
        print(f"  {ev}: {c} ({c / total_rows * 100:.2f}%)")
        
    print("\n--- EVENTS BY USER TYPE ---")
    print("Human Events:")
    for ev, c in events_by_user_type["human"].most_common():
        print(f"  {ev}: {c}")
    print("Bot Events:")
    for ev, c in events_by_user_type["bot"].most_common():
        print(f"  {ev}: {c}")
        
    print("\n--- COORDINATE RANGES BY MAP ---")
    for m, st in coord_stats.items():
        print(f"Map: {m} (rows: {st['count']})")
        print(f"  X: [{st['x_min']:.2f}, {st['x_max']:.2f}], nulls: {st['x_nulls']}, NaNs: {st['x_nan']}")
        print(f"  Y: [{st['y_min']:.2f}, {st['y_max']:.2f}], nulls: {st['y_nulls']}, NaNs: {st['y_nan']}")
        print(f"  Z: [{st['z_min']:.2f}, {st['z_max']:.2f}], nulls: {st['z_nulls']}, NaNs: {st['z_nan']}")
        print(f"  Points out of UV [0,1] bounds: {out_of_bounds_counts[m]} ({out_of_bounds_counts[m]/st['count']*100:.2f}%)")
        
    print("\n--- TIMESTAMPS ---")
    print(f"Min TS overall: {min_ts_overall}")
    print(f"Max TS overall: {max_ts_overall}")
    print(f"Sample TS values: {ts_samples}")
    
    print("\n--- MINIMAP IMAGES INVESTIGATION ---")
    minimap_dir = os.path.join(RAW_DIR, "minimaps")
    minimap_info = {}
    if os.path.exists(minimap_dir):
        for img_name in sorted(os.listdir(minimap_dir)):
            img_path = os.path.join(minimap_dir, img_name)
            try:
                with Image.open(img_path) as im:
                    print(f"Image: {img_name}")
                    print(f"  Dimensions: {im.size} (Width x Height)")
                    print(f"  Format: {im.format}")
                    print(f"  Mode: {im.mode}")
                    print(f"  Aspect Ratio: {im.size[0] / im.size[1]:.4f}")
                    minimap_info[img_name] = {
                        "dimensions": im.size,
                        "format": im.format,
                        "mode": im.mode,
                        "aspect_ratio": im.size[0] / im.size[1]
                    }
            except Exception as e:
                print(f"Error reading image {img_name}: {e}")
                
    results = {
        "total_files": len(all_files),
        "day_file_counts": day_file_counts,
        "total_rows": total_rows,
        "day_rows": dict(day_rows),
        "total_rows_by_user_type": total_rows_by_user_type,
        "unique_users_count": len(all_user_ids),
        "unique_matches_count": len(all_match_ids),
        "maps": list(all_map_ids),
        "schema_details": schema_details,
        "null_counts": dict(null_counts),
        "exact_duplicates": exact_duplicates,
        "duplicate_user_ts": duplicate_user_ts,
        "event_counts": dict(all_events),
        "events_by_user_type": {
            "human": dict(events_by_user_type["human"]),
            "bot": dict(events_by_user_type["bot"])
        },
        "coord_stats": dict(coord_stats),
        "out_of_bounds_counts": dict(out_of_bounds_counts),
        "min_ts": str(min_ts_overall),
        "max_ts": str(max_ts_overall),
        "sample_records": sample_records,
        "minimap_info": minimap_info
    }
    
    with open("scripts/investigation_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print("\nInvestigation results saved to scripts/investigation_results.json")

if __name__ == "__main__":
    investigate_dataset()
