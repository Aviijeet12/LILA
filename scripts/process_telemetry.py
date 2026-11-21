import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.data_loader import load_all_telemetry
from scripts.data_cleaner import clean_telemetry
from scripts.journey_builder import build_journeys
from scripts.analytics import compute_analytics
from scripts.heatmap_generator import generate_map_heatmaps
from scripts.export_data import export_processed_datasets

def run_pipeline(
    raw_dir: str = "data/raw/player_data",
    output_dir: str = "data/processed",
    heatmap_grid_size: int = 64
):
    start_time = time.time()
    print("================================================================================")
    print("LILA BLACK — TELEMETRY DATA PROCESSING PIPELINE")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("================================================================================")

    # 1. Ingestion
    t0 = time.time()
    raw_df, loader_report = load_all_telemetry(raw_dir=raw_dir)
    t_load = time.time() - t0
    print(f"--> Phase 1 (Ingestion) finished in {t_load:.2f}s\n")

    # 2. Cleaning & Deduplication
    t0 = time.time()
    clean_df, cleaner_report = clean_telemetry(raw_df)
    t_clean = time.time() - t0
    print(f"--> Phase 2 (Cleaning) finished in {t_clean:.2f}s\n")

    # 3. Journey Reconstruction & Coordinate Mapping
    t0 = time.time()
    journeys, journey_report = build_journeys(clean_df)
    t_journey = time.time() - t0
    print(f"--> Phase 3 (Journey Reconstruction) finished in {t_journey:.2f}s\n")

    # 4. Analytics
    t0 = time.time()
    global_stats, matches_list, players_list, maps_metadata, all_discrete_events = compute_analytics(
        journeys=journeys,
        cleaning_report=cleaner_report,
        loader_report=loader_report
    )
    t_analytics = time.time() - t0
    print(f"--> Phase 4 (Analytics) finished in {t_analytics:.2f}s\n")

    # 5. Spatial Heatmaps
    t0 = time.time()
    map_heatmaps = generate_map_heatmaps(journeys=journeys, grid_size=heatmap_grid_size)
    t_heatmaps = time.time() - t0
    print(f"--> Phase 5 (Heatmaps) finished in {t_heatmaps:.2f}s\n")

    # Assemble Quality & Reconciliation Report
    audit_comparison = {
        "original_audit_records": 89104,
        "pipeline_raw_records": loader_report["total_original_raw_rows_with_duplicates"],
        "duplicate_file_rows_removed": loader_report["duplicate_file_rows_skipped"],
        "exact_duplicate_rows_removed": cleaner_report["exact_duplicates_removed"],
        "total_rows_removed": loader_report["duplicate_file_rows_skipped"] + cleaner_report["exact_duplicates_removed"],
        "clean_records_output": cleaner_report["records_output"],
        "reconciliation_check": (
            loader_report["total_original_raw_rows_with_duplicates"]
            - (loader_report["duplicate_file_rows_skipped"] + cleaner_report["exact_duplicates_removed"])
            == cleaner_report["records_output"]
        ),
        "event_reconciliation": {
            "raw_position_events": 51347,
            "clean_position_events": cleaner_report["event_distribution_clean"]["Position"],
            "raw_bot_position_events": 21712,
            "clean_bot_position_events": cleaner_report["event_distribution_clean"]["BotPosition"],
            "raw_loot_events": 12885,
            "clean_loot_events": cleaner_report["event_distribution_clean"]["Loot"],
            "raw_bot_kill_events": 2415,
            "clean_bot_kill_events": cleaner_report["event_distribution_clean"]["BotKill"],
            "raw_bot_killed_events": 700,
            "clean_bot_killed_events": cleaner_report["event_distribution_clean"]["BotKilled"],
            "raw_storm_deaths": 39,
            "clean_storm_deaths": cleaner_report["event_distribution_clean"]["KilledByStorm"],
            "raw_kill_events": 3,
            "clean_kill_events": cleaner_report["event_distribution_clean"]["Kill"],
            "raw_killed_events": 3,
            "clean_killed_events": cleaner_report["event_distribution_clean"]["Killed"]
        }
    }

    quality_report = {
        "pipeline_version": "1.0.0",
        "execution_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "total_runtime_seconds": round(time.time() - start_time, 2),
        "loader_report": loader_report,
        "cleaner_report": cleaner_report,
        "journey_report": journey_report,
        "audit_comparison": audit_comparison
    }

    # 6. Export Datasets
    t0 = time.time()
    manifest = export_processed_datasets(
        output_dir=output_dir,
        global_stats=global_stats,
        matches_list=matches_list,
        players_list=players_list,
        maps_metadata=maps_metadata,
        map_heatmaps=map_heatmaps,
        journeys=journeys,
        all_discrete_events=all_discrete_events,
        quality_report=quality_report
    )
    t_export = time.time() - t0
    print(f"--> Phase 6 (JSON Export) finished in {t_export:.2f}s\n")

    total_time = time.time() - start_time
    print("================================================================================")
    print(f"PIPELINE COMPLETE in {total_time:.2f}s")
    print(f"Total Matches: {len(matches_list)} | Total Players: {len(players_list)} | Total Journeys: {len(journeys)}")
    print(f"Total Output Size: {manifest['total_directory_size_mb']} MB across {manifest['total_exported_files']} files")
    print("================================================================================")
    return manifest, quality_report

if __name__ == "__main__":
    run_pipeline()
