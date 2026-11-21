import pandas as pd
from typing import Tuple, Dict, Any

def clean_telemetry(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    initial_count = len(df)
    print(f"[DataCleaner] Starting cleaning with {initial_count:,} records.")

    # 1. Exact duplicate identification and removal
    dedup_cols = ["user_id", "match_id", "map_id", "x", "y", "z", "ts_sec", "event_str"]
    exact_duplicates_mask = df.duplicated(subset=dedup_cols, keep="first")
    exact_duplicates_count = int(exact_duplicates_mask.sum())

    df_cleaned = df[~exact_duplicates_mask].copy()
    post_dedup_count = len(df_cleaned)

    print(f"[DataCleaner] Removed {exact_duplicates_count:,} exact duplicate rows. Remaining: {post_dedup_count:,}")

    # 2. Check and log preserved same-timestamp events
    # (Same user_id, match_id, ts_sec, but different event_str)
    ts_collisions_mask = df_cleaned.duplicated(subset=["user_id", "match_id", "ts_sec"], keep=False)
    ts_collision_count = int(ts_collisions_mask.sum())
    print(f"[DataCleaner] Preserved {ts_collision_count:,} legitimate same-tick event collision records.")

    # 3. Check for invalid or missing values
    null_counts = {col: int(df_cleaned[col].isnull().sum()) for col in ["user_id", "match_id", "map_id", "x", "z", "ts_sec", "event_str"]}
    has_nulls = any(v > 0 for v in null_counts.values())
    if has_nulls:
        print(f"[DataCleaner] WARNING: Nulls detected: {null_counts}")
        df_cleaned = df_cleaned.dropna(subset=["user_id", "match_id", "map_id", "x", "z", "ts_sec", "event_str"])

    # 4. Chronological sorting
    # Stable sort: match_id -> user_id -> ts_sec
    df_cleaned = df_cleaned.sort_values(
        by=["match_id", "user_id", "ts_sec"],
        ascending=[True, True, True],
        kind="mergesort"
    ).reset_index(drop=True)

    cleaning_report = {
        "records_input": initial_count,
        "exact_duplicates_removed": exact_duplicates_count,
        "records_output": len(df_cleaned),
        "same_timestamp_collisions_preserved": ts_collision_count,
        "null_counts": null_counts,
        "event_distribution_clean": df_cleaned["event_str"].value_counts().to_dict()
    }

    print(f"[DataCleaner] Cleaned dataset ready with {len(df_cleaned):,} records.")
    return df_cleaned, cleaning_report
