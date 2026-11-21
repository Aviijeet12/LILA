import os
import json
import pytest
import pandas as pd
import numpy as np

from scripts.data_loader import compute_file_hash, load_all_telemetry
from scripts.data_cleaner import clean_telemetry
from scripts.journey_builder import build_journeys
from scripts.analytics import compute_analytics
from scripts.heatmap_generator import generate_map_heatmaps

@pytest.fixture(scope="module")
def pipeline_data():
    raw_df, loader_rep = load_all_telemetry()
    clean_df, cleaner_rep = clean_telemetry(raw_df)
    journeys, journey_rep = build_journeys(clean_df)
    global_stats, matches, players, maps_meta, events = compute_analytics(
        journeys=journeys,
        cleaning_report=cleaner_rep,
        loader_report=loader_rep
    )
    heatmaps = generate_map_heatmaps(journeys=journeys, grid_size=64)
    return {
        "raw_df": raw_df,
        "clean_df": clean_df,
        "loader_rep": loader_rep,
        "cleaner_rep": cleaner_rep,
        "journeys": journeys,
        "journey_rep": journey_rep,
        "global_stats": global_stats,
        "matches": matches,
        "players": players,
        "maps_meta": maps_meta,
        "events": events,
        "heatmaps": heatmaps
    }

class TestIngestionAndDeduplication:
    def test_original_record_counts(self, pipeline_data):
        rep = pipeline_data["loader_rep"]
        assert rep["total_files_discovered"] == 1243
        assert rep["unique_files_accepted"] == 1242
        assert rep["duplicate_files_skipped"] == 1
        assert rep["duplicate_file_rows_skipped"] == 88
        assert rep["total_original_raw_rows_with_duplicates"] == 89104
        assert rep["total_raw_rows_loaded"] == 89016

    def test_exact_duplicate_rows_removed(self, pipeline_data):
        clean_rep = pipeline_data["cleaner_rep"]
        assert clean_rep["exact_duplicates_removed"] == 1417
        assert clean_rep["records_output"] == 87599
        # Total removed = 88 from duplicate file + 1417 from exact duplicates = 1505
        assert 89104 - clean_rep["records_output"] == 1505

    def test_same_timestamp_collisions_preserved(self, pipeline_data):
        clean_rep = pipeline_data["cleaner_rep"]
        assert clean_rep["same_timestamp_collisions_preserved"] > 0
        # Specifically verify there exist rows with identical (user_id, match_id, ts_sec) but different events
        clean_df = pipeline_data["clean_df"]
        dups = clean_df[clean_df.duplicated(subset=["user_id", "match_id", "ts_sec"], keep=False)]
        assert len(dups) == clean_rep["same_timestamp_collisions_preserved"]

    def test_byte_event_decoding(self, pipeline_data):
        clean_df = pipeline_data["clean_df"]
        assert "event_str" in clean_df.columns
        assert not clean_df["event_str"].apply(lambda e: isinstance(e, bytes)).any()
        expected_events = {"Position", "BotPosition", "Loot", "BotKill", "BotKilled", "KilledByStorm", "Kill", "Killed"}
        assert set(clean_df["event_str"].unique()) == expected_events

    def test_timestamp_conversion_to_seconds(self, pipeline_data):
        clean_df = pipeline_data["clean_df"]
        # Raw ts should be between Feb 9 23:58:55 2026 (1770681535) and Feb 14 15:01:40 2026 (1771081300)
        assert clean_df["ts_sec"].min() >= 1770681535
        assert clean_df["ts_sec"].max() <= 1771081300
        # Check ISO string formatting
        sample_iso = clean_df["ts_iso"].iloc[0]
        assert "T" in sample_iso and sample_iso.endswith("Z")

class TestEntityClassification:
    def test_human_vs_bot_classification(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        for j in journeys:
            uid = j["user_id"]
            if uid.isdigit():
                assert j["entity_type"] == "bot"
            else:
                assert j["entity_type"] == "human"
                assert len(uid) == 36 # Standard UUID length

    def test_bot_position_anomaly_properly_classified(self, pipeline_data):
        # Bot 1429 emitted Position events, but must remain classified as a bot
        journeys = pipeline_data["journeys"]
        bot_1429_journeys = [j for j in journeys if j["user_id"] == "1429"]
        assert len(bot_1429_journeys) > 0
        for j in bot_1429_journeys:
            assert j["entity_type"] == "bot"

class TestJourneyReconstruction:
    def test_total_journeys_and_positions(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        assert len(journeys) == 1242
        total_positions = sum(j["positions_count"] for j in journeys)
        total_events = sum(j["discrete_events_count"] for j in journeys)
        assert total_positions == 72849
        assert total_events == 14750
        assert total_positions + total_events == 87599

    def test_chronological_ordering_in_journeys(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        for j in journeys[:50]:
            ts_list = [p["ts"] for p in j["positions"]]
            assert ts_list == sorted(ts_list), f"Journey {j['journey_id']} positions not sorted"

    def test_outcome_derivation_logic(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        death_events = {"BotKilled", "KilledByStorm", "Killed"}
        for j in journeys:
            term_ev = j["terminal_event"]
            if term_ev in death_events:
                assert j["outcome"] == "ELIMINATED"
            else:
                assert j["outcome"] == "SURVIVED_PRESUMED"

    def test_distance_calculation(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        for j in journeys[:50]:
            dist = j["distance_travelled_meters"]
            assert dist >= 0.0
            if j["positions_count"] <= 1:
                assert dist == 0.0

    def test_uv_coordinates_within_bounds(self, pipeline_data):
        journeys = pipeline_data["journeys"]
        for j in journeys[:50]:
            for p in j["positions"]:
                assert 0.0 <= p["u"] <= 1.0
                assert 0.0 <= p["v"] <= 1.0

class TestAnalyticsAndHeatmaps:
    def test_global_stats_counts(self, pipeline_data):
        stats = pipeline_data["global_stats"]
        assert stats["total_matches"] == 796
        assert stats["total_unique_humans"] == 245
        assert stats["total_unique_bots"] == 94
        assert stats["total_clean_records"] == 87599

    def test_heatmap_layer_dimensions_and_counts(self, pipeline_data):
        heatmaps = pipeline_data["heatmaps"]
        for map_name, map_hm in heatmaps.items():
            assert map_hm["grid_size"] == 64
            layers = map_hm["layers"]
            for layer_name in ["human_traffic", "bot_traffic", "loot", "bot_kill", "bot_killed", "killed_by_storm"]:
                assert layer_name in layers
                grid = np.array(layers[layer_name]["grid"])
                assert grid.shape == (64, 64)
                assert np.min(grid) >= 0

class TestProcessedOutputJSONFiles:
    def test_all_output_files_exist_and_are_valid_json(self):
        output_dir = "data/processed"
        expected_files = [
            "manifest.json",
            "global_stats.json",
            "matches/matches.json",
            "players/players.json",
            "events/events.json",
            "maps/AmbroseValley/metadata.json",
            "maps/AmbroseValley/journeys.json",
            "maps/AmbroseValley/heatmaps.json",
            "maps/GrandRift/metadata.json",
            "maps/GrandRift/journeys.json",
            "maps/GrandRift/heatmaps.json",
            "maps/Lockdown/metadata.json",
            "maps/Lockdown/journeys.json",
            "maps/Lockdown/heatmaps.json",
            "quality/processing_report.json"
        ]
        for rel_path in expected_files:
            fp = os.path.join(output_dir, rel_path)
            assert os.path.exists(fp), f"Missing expected output file: {rel_path}"
            assert os.path.getsize(fp) > 0, f"File {rel_path} is empty"
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
                assert data is not None
