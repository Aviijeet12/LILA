import os
import json
import pyarrow.parquet as pq
import pyarrow as pa
import pandas as pd
import numpy as np
from datetime import datetime
from collections import Counter, defaultdict

RAW_DIR = "data/raw/player_data"
DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]

def deep_investigate():
    all_files = []
    for day in DAYS:
        day_dir = os.path.join(RAW_DIR, day)
        if os.path.exists(day_dir):
            for f in os.listdir(day_dir):
                if not f.startswith('.'):
                    all_files.append((day, os.path.join(day_dir, f)))

    print(f"Total files: {len(all_files)}")
    
    # 1. Match analysis & Player outcomes / Journey end
    # Let's inspect match composition and end events
    journey_starts = Counter()
    journey_ends = Counter()
    match_file_counts = defaultdict(list)
    match_maps = defaultdict(set)
    file_user_mismatch = 0
    file_match_mismatch = 0
    
    first_last_events = []
    kill_events = []
    bot_loot_events = []
    bot_position_in_human = []
    human_botposition = []
    
    # Track timestamps
    ts_raw_values = []
    
    # Track all rows in memory or chunked for cross-file match reconstruction
    # Let's collect sample matches with multiple players
    match_records = defaultdict(list)
    
    for day, filepath in all_files:
        fname = os.path.basename(filepath)
        # Parse fname: {user_id}_{match_id}.nakama-0
        # Notice match_id in filename might end with .nakama-0 or be before .nakama-0
        # Let's see: user_id is before first underscore
        parts = fname.rsplit('.nakama-0', 1)[0].split('_', 1)
        fname_uid = parts[0]
        fname_mid = parts[1] if len(parts) > 1 else ""
        
        df = pq.read_table(filepath).to_pandas()
        df['event_str'] = df['event'].apply(lambda e: e.decode('utf-8') if isinstance(e, bytes) else str(e))
        
        # Check filename vs row content
        uids_in_df = df['user_id'].unique()
        mids_in_df = df['match_id'].unique()
        
        if len(uids_in_df) != 1 or uids_in_df[0] != fname_uid:
            file_user_mismatch += 1
        # Check match_id in df vs filename
        # In df, match_id has .nakama-0 suffix (e.g. b71aaad8-aa62-4b3a-8534-927d4de18f22.nakama-0)
        df_mid_clean = mids_in_df[0].replace('.nakama-0', '') if len(mids_in_df) > 0 else ""
        if df_mid_clean != fname_mid:
            file_match_mismatch += 1
            
        uid = uids_in_df[0]
        mid = mids_in_df[0]
        map_id = df['map_id'].iloc[0]
        
        match_file_counts[mid].append(fname)
        match_maps[mid].add(map_id)
        
        # Journey start and end
        if len(df) > 0:
            df_sorted = df.sort_values('ts')
            first_ev = df_sorted.iloc[0]['event_str']
            last_ev = df_sorted.iloc[-1]['event_str']
            is_bot = uid.isdigit()
            u_type = "bot" if is_bot else "human"
            
            journey_starts[f"{u_type}_{first_ev}"] += 1
            journey_ends[f"{u_type}_{last_ev}"] += 1
            
            if len(first_last_events) < 10:
                first_last_events.append({
                    "file": fname,
                    "user_type": u_type,
                    "rows": len(df),
                    "first_event": first_ev,
                    "first_ts": str(df_sorted.iloc[0]['ts']),
                    "last_event": last_ev,
                    "last_ts": str(df_sorted.iloc[-1]['ts']),
                    "duration_sec": (df_sorted.iloc[-1]['ts'] - df_sorted.iloc[0]['ts']).total_seconds()
                })
                
        # Check Kill / Killed
        for _, row in df[df['event_str'].isin(['Kill', 'Killed'])].iterrows():
            kill_events.append({
                "file": fname,
                "user_id": row['user_id'],
                "match_id": row['match_id'],
                "ts": str(row['ts']),
                "event": row['event_str'],
                "x": row['x'], "y": row['y'], "z": row['z']
            })
            
        # Check bot loot
        if uid.isdigit() and (df['event_str'] == 'Loot').any():
            bot_loot_events.append(fname)
            
        if len(ts_raw_values) < 5:
            # Let's get raw int64 timestamp value from pyarrow
            tbl = pq.read_table(filepath)
            ts_chunk = tbl.column('ts').chunk(0)
            raw_ints = ts_chunk.cast(pa.int64()).to_pylist()[:5]
            ts_raw_values.append({
                "file": fname,
                "raw_ints": raw_ints,
                "pandas_ts": [str(t) for t in df['ts'].head(5)]
            })

    print("\n--- FILENAME INTEGRITY ---")
    print(f"File user mismatch: {file_user_mismatch}")
    print(f"File match mismatch: {file_match_mismatch}")
    
    print("\n--- MATCH SUMMARY ---")
    print(f"Total Unique Matches: {len(match_file_counts)}")
    files_per_match = [len(v) for v in match_file_counts.values()]
    print(f"Files per match: min={min(files_per_match)}, max={max(files_per_match)}, avg={np.mean(files_per_match):.2f}, median={np.median(files_per_match)}")
    
    # Inconsistent map per match
    map_inconsistent_matches = {m: maps for m, maps in match_maps.items() if len(maps) > 1}
    print(f"Matches with inconsistent map_id: {len(map_inconsistent_matches)}")
    
    print("\n--- JOURNEY START EVENTS ---")
    for k, v in journey_starts.most_common():
        print(f"  {k}: {v}")
        
    print("\n--- JOURNEY END EVENTS (OUTCOMES) ---")
    for k, v in journey_ends.most_common():
        print(f"  {k}: {v}")
        
    print("\n--- KILL & KILLED EVENTS DETAILS ---")
    print(f"Total Kill/Killed records found: {len(kill_events)}")
    for k in kill_events:
        print(f"  {k}")
        
    print("\n--- BOT LOOTING FILES ---")
    print(f"Bot files with loot events: {len(bot_loot_events)}")
    print(f"Sample bot loot files: {bot_loot_events[:5]}")
    
    print("\n--- RAW TIMESTAMP ANALYSIS ---")
    for item in ts_raw_values[:2]:
        print(f"File: {item['file']}")
        print(f"  Raw int64: {item['raw_ints']}")
        print(f"  Pandas TS: {item['pandas_ts']}")
        for raw_val in item['raw_ints'][:2]:
            # Convert if milliseconds:
            dt_as_ms = datetime.utcfromtimestamp(raw_val / 1000.0)
            # Convert if seconds:
            dt_as_sec = datetime.utcfromtimestamp(raw_val)
            print(f"  Raw {raw_val} -> as ms: {dt_as_ms} | as sec: {dt_as_sec}")

if __name__ == "__main__":
    deep_investigate()
