import os
import glob
import hashlib
from typing import List, Dict, Tuple, Any
import pyarrow.parquet as pq
import pyarrow as pa
import pandas as pd
from datetime import datetime, timezone

def compute_file_hash(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_all_telemetry(raw_dir: str = "data/raw/player_data") -> Tuple[pd.DataFrame, Dict[str, Any]]:
    pattern = os.path.join(raw_dir, "*", "*.nakama-0")
    filepaths = sorted(glob.glob(pattern))

    seen_hashes: Dict[str, str] = {}
    accepted_files: List[str] = []
    duplicate_files: List[Dict[str, str]] = []
    rejected_files: List[Dict[str, str]] = []

    print(f"[DataLoader] Found {len(filepaths)} total files matching {pattern}")

    # Step 1: Filter duplicate files by SHA-256
    for fp in filepaths:
        try:
            f_hash = compute_file_hash(fp)
            if f_hash in seen_hashes:
                duplicate_files.append({
                    "duplicate_path": fp,
                    "original_path": seen_hashes[f_hash],
                    "sha256": f_hash
                })
            else:
                seen_hashes[f_hash] = fp
                accepted_files.append(fp)
        except Exception as ex:
            rejected_files.append({
                "path": fp,
                "reason": f"Hash computation error: {str(ex)}"
            })

    print(f"[DataLoader] Unique files: {len(accepted_files)} | Duplicate files skipped: {len(duplicate_files)}")

    # Step 2: Read Parquet files
    dfs = []
    total_raw_rows = 0
    duplicate_file_rows = 0

    # Count rows in duplicate files for audit trail
    for dup in duplicate_files:
        try:
            tbl_dup = pq.read_table(dup["duplicate_path"])
            duplicate_file_rows += len(tbl_dup)
        except Exception:
            pass

    for fp in accepted_files:
        try:
            tbl = pq.read_table(fp)
            df = tbl.to_pandas()
            total_raw_rows += len(df)

            # Extract raw 64-bit integers for ts
            ts_chunk = tbl.column("ts")
            raw_ts_ints = ts_chunk.cast(pa.int64()).to_pylist()

            df["raw_ts_int"] = raw_ts_ints
            df["ts_sec"] = raw_ts_ints
            df["source_file"] = os.path.basename(fp)
            df["source_day"] = os.path.basename(os.path.dirname(fp))

            dfs.append(df)
        except Exception as ex:
            rejected_files.append({
                "path": fp,
                "reason": f"Parquet read error: {str(ex)}"
            })

    if not dfs:
        raise RuntimeError("No telemetry records loaded from data directory.")

    combined_df = pd.concat(dfs, ignore_index=True)

    # Step 3: Decode byte events to UTF-8
    combined_df["event_str"] = combined_df["event"].apply(
        lambda e: e.decode("utf-8") if isinstance(e, bytes) else str(e)
    )

    # Step 4: Add ISO-8601 UTC string
    combined_df["ts_iso"] = combined_df["ts_sec"].apply(
        lambda s: datetime.fromtimestamp(s, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    combined_df["date"] = combined_df["ts_sec"].apply(
        lambda s: datetime.fromtimestamp(s, tz=timezone.utc).strftime("%Y-%m-%d")
    )

    report = {
        "total_files_discovered": len(filepaths),
        "unique_files_accepted": len(accepted_files),
        "duplicate_files_skipped": len(duplicate_files),
        "duplicate_files_details": duplicate_files,
        "duplicate_file_rows_skipped": duplicate_file_rows,
        "rejected_files_count": len(rejected_files),
        "rejected_files_details": rejected_files,
        "total_raw_rows_loaded": len(combined_df),
        "total_original_raw_rows_with_duplicates": len(combined_df) + duplicate_file_rows
    }

    print(f"[DataLoader] Successfully loaded {len(combined_df):,} records from {len(accepted_files)} files.")
    return combined_df, report
