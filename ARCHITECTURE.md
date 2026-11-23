# LILA BLACK — Architecture

**Stack:** Python + PyArrow/Pandas for batch Parquet ETL; React 19, TypeScript, Vite 8, Tailwind 4, and Zustand for the UI; Canvas 2D for dense map rendering. The static frontend has no runtime API or database.

## Data flow

```text
Parquet → load/clean → journeys + events → analytics + 64×64 heatmaps
        → processed JSON/minimaps → dataService → React views + Canvas
```

The ETL hashes files to skip an identical duplicate, normalizes timestamps, removes exact duplicate rows while retaining same-tick events, classifies numeric IDs as bots and UUID IDs as humans, then groups records into journeys. It writes artifacts to `data/processed/` and `frontend/public/data/processed/`; the browser reads the latter. Raw Parquet is excluded from Git because it is supplied source data. Rebuild artifacts with `python scripts/process_telemetry.py` when the raw files and Python dependencies are available.

## World coordinates → minimap

The top-down projection uses world X/Z in metres; Y is elevation and is omitted. For calibrated map scale `S` and origin `(X₀, Z₀)`:

```text
u = (X − X₀) / S       v = (Z − Z₀) / S
pixelX = u × width     pixelY = (1 − v) × height
```

The vertical inversion converts world north/up to Canvas’ downward-positive pixel Y. UV coordinates keep mapping independent of image resolution, including Grand Rift’s non-square minimap. Parameters: Ambrose Valley `(S=900, X₀=−370, Z₀=−473)`; Grand Rift `(581, −290, −290)`; Lockdown `(1000, −500, −500)`. Forward/inverse mapping and bounds are covered by `tests/test_coordinate_mapping.py`; full derivation is in [`docs/COORDINATE_MAPPING.md`](docs/COORDINATE_MAPPING.md).

## Assumptions and limits

- No extraction event exists: non-eliminated journeys end as `SURVIVED_PRESUMED`.
- `BotKill` and `BotKilled` are independent, unpaired events; no killer/victim link is inferred.
- Numeric IDs identify bots and UUID IDs identify humans in the observed data.
- Loot has no item identity/rarity. Heatmaps are five-day aggregates, not match- or time-filterable.

## Tradeoffs

| Considered | Chosen | Tradeoff |
|---|---|---|
| SVG/WebGL | Canvas 2D | Custom hit-testing for lower overhead on dense paths. |
| API/database | Static JSON | Simple hosting; artifacts must be regenerated for new data. |
| Continuous KDE | 64×64 grids | Less granular, but fast and count-auditable. |
| Generative LLM | Deterministic query engine | Narrower language coverage, reproducible metrics. |

## Three observations from the tool

1. Ambrose Valley has 11,266/14,750 events (76.4%); compare maps using per-map rates, not raw totals.
2. Grand Rift has 448/981 human-active cells with no bot samples (45.7%). This shows spatial separation, not its cause.
3. Ambrose Valley’s top 5% of human-active cells contain 5,140/8,988 loot events (57.2%), indicating concentrated loot corridors.

See [`INSIGHTS.md`](INSIGHTS.md) for evidence, design implications, and possible follow-up metrics.
