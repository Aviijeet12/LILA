# LILA BLACK — Coordinate Mapping & Minimap Calibration
**Project:** LILA BLACK — Player Intelligence  
**Phase:** Phase 1 — Coordinate Mapping and Minimap Calibration  
**Module:** `scripts/coordinate_mapping.py`  
**Tests:** `tests/test_coordinate_mapping.py` (37 automated tests passing)  
**Author:** Senior Data Engineer  
**Status:** Completed & Validated  

---

## 1. Executive Summary

A standalone, deterministic coordinate transformation module has been built and mathematically validated for all three LILA BLACK game maps (`AmbroseValley`, `GrandRift`, and `Lockdown`). 

The coordinate mapping system decouples world coordinate translation from display resolution by establishing an intermediate **normalized UV coordinate space** [0.0, 1.0]. The implementation was validated against **all 89,104 production telemetry points**, confirming **0 out-of-bounds coordinates** and achieving round-trip reconstruction precision within 1.71e-13 meters (machine precision).

Calibration visualizations overlaying real human and bot trajectories with landmark reticles and UV axes have been rendered and saved in `docs/calibration/`.

---

## 2. In-Game Coordinate System Architecture

LILA BLACK uses a 3D Cartesian world space:
- **X-axis (World X):** Horizontal East-West axis. Values increase moving East.
- **Y-axis (World Elevation):** Vertical elevation/height axis (ranges from 8.14m to 162.67m across maps). Represents 3D terrain elevation and is **excluded** from 2D top-down minimap projection.
- **Z-axis (World Z):** Horizontal North-South axis. Values increase moving North.

### Minimap Image Coordinate Space
Minimap raster images and web HTML Canvas viewports follow standard screen graphics conventions:
- **Pixel X:** Increases from Left (West, 0) to Right (East, W).
- **Pixel Y:** Increases from Top (North, 0) to Bottom (South, H).

Because in-game +Z points **North** (Up), but image pixel Y points **South** (Down), a **vertical-axis inversion** (1.0 - v) is strictly required.

---

## 3. Map Configuration Parameters

Origins and scale factors defined in the project configuration and audited against telemetry:

| Map Identifier | Scale (S) | Origin X (X0) | Origin Z (Z0) | World X Extents ([X0, X0 + S]) | World Z Extents ([Z0, Z0 + S]) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | 900.0 | -370.0 | -473.0 | [-370.0, 530.0] | [-473.0, 427.0] |
| **GrandRift** | 581.0 | -290.0 | -290.0 | [-290.0, 291.0] | [-290.0, 291.0] |
| **Lockdown** | 1000.0 | -500.0 | -500.0 | [-500.0, 500.0] | [-500.0, 500.0] |

### Comparison: Stated vs Actual Minimap Assets

The original `README.md` stated that all minimaps are 1024 x 1024 pixels. The audit revealed that raw disk assets are significantly higher resolution:

| Map Identifier | Asset Filename | Format | Mode | Actual Dimensions (W x H) | Aspect Ratio | README Stated Size | Scale Discrepancy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | `AmbroseValley_Minimap.png` | PNG | RGBA | 4320 x 4320 | 1.000000 | 1024 x 1024 | 4.22x native resolution |
| **GrandRift** | `GrandRift_Minimap.png` | PNG | RGBA | 2160 x 2158 | 1.000927 | 1024 x 1024 | Non-square (height is 2px shorter) |
| **Lockdown** | `Lockdown_Minimap.jpg` | JPEG | RGB | 9000 x 9000 | 1.000000 | 1024 x 1024 | 8.79x native resolution |

**Engineering Resolution:**  
The transformation API accepts runtime dimensions `(image_width, image_height)` dynamically. This allows the backend and frontend to render onto arbitrary canvas resolutions (e.g. 1024x1024, 2048x2048, or native image sizes) without distortion or hardcoding.

---

## 4. Mathematical Transformation Formulas

### 4.1 World Coordinates -> Normalized UV
Transforms 3D world (x, z) into unit square u, v in [0.0, 1.0]:

$$u = \frac{x - X_0}{S}$$

$$v = \frac{z - Z_0}{S}$$

Where:
- X0, Z0 is the world origin coordinate of the bottom-left map corner (u=0, v=0).
- S is the map world dimension scale factor.

### 4.2 Normalized UV -> World Coordinates
Inverse mapping to reconstruct physical game coordinates:

$$x = X_0 + u \times S$$

$$z = Z_0 + v \times S$$

### 4.3 World Coordinates -> Image Pixel Space
Projects (x, z) onto a raster image or canvas of width W and height H:

$$\text{pixel}_x = u \times W = \left( \frac{x - X_0}{S} \right) \times W$$

$$\text{pixel}_y = (1.0 - v) \times H = \left( 1.0 - \frac{z - Z_0}{S} \right) \times H$$

### 4.4 Image Pixel Space -> World Coordinates
Reconstructs world coordinates from canvas click or cursor hover:

$$u = \frac{\text{pixel}_x}{W}$$

$$v = 1.0 - \frac{\text{pixel}_y}{H}$$

$$x = X_0 + \left( \frac{\text{pixel}_x}{W} \right) \times S$$

$$z = Z_0 + \left( 1.0 - \frac{\text{pixel}_y}{H} \right) \times S$$

---

## 5. Implementation Architecture (`scripts/coordinate_mapping.py`)

The transformation module exposes four primary pure functions and helper utilities:

```python
# Primary Pure Functions
world_to_uv(x: float, z: float, map_id: str, raise_on_oob: bool = False, clamp: bool = False) -> Tuple[float, float]
uv_to_world(u: float, v: float, map_id: str) -> Tuple[float, float]
world_to_pixel(x: float, z: float, map_id: str, image_width: float, image_height: float, raise_on_oob: bool = False, clamp: bool = False) -> Tuple[float, float]
pixel_to_world(pixel_x: float, pixel_y: float, map_id: str, image_width: float, image_height: float, raise_on_oob: bool = False) -> Tuple[float, float]

# Configuration & Bounds Helpers
get_map_config(map_id: str) -> MapConfig
get_map_bounds(map_id: str) -> Tuple[float, float, float, float]
```

### Safety & Error Handling Features
- **Strict Input Validation:** Non-string or unknown `map_id` values raise descriptive `ValueError` exceptions listing valid map names. Case-insensitive normalization handles variations (`ambrosevalley` vs `AmbroseValley`).
- **Dimension Guards:** Non-positive image width or height (W <= 0 or H <= 0) immediately raises `ValueError`.
- **Out-of-Bounds Control:** Coordinates beyond [0.0, 1.0] are preserved by default for diagnostic fidelity, but can trigger `raise_on_oob=True` (strict auditing) or `clamp=True` (safe canvas rendering).

---

## 6. Empirical Validation Results

### 6.1 Geometric Landmark Validation

| Map | Feature | World Coords (x, z) | Normalized UV (u, v) | Native Pixel Coords (Xp, Yp) | Round-Trip Error | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | SW Corner | (-370.0, -473.0) | (0.0000, 0.0000) | (0.0, 4320.0) | 0.00 | **PASS** |
| | SE Corner | (530.0, -473.0) | (1.0000, 0.0000) | (4320.0, 4320.0) | 0.00 | **PASS** |
| | NW Corner | (-370.0, 427.0) | (0.0000, 1.0000) | (0.0, 0.0) | 0.00 | **PASS** |
| | NE Corner | (530.0, 427.0) | (1.0000, 1.0000) | (4320.0, 0.0) | 0.00 | **PASS** |
| | Map Center | (80.0, -23.0) | (0.5000, 0.5000) | (2160.0, 2160.0) | 0.00 | **PASS** |
| **GrandRift** | SW Corner | (-290.0, -290.0) | (0.0000, 0.0000) | (0.0, 2158.0) | 0.00 | **PASS** |
| | SE Corner | (291.0, -290.0) | (1.0000, 0.0000) | (2160.0, 2158.0) | 0.00 | **PASS** |
| | NW Corner | (-290.0, 291.0) | (0.0000, 1.0000) | (0.0, 0.0) | 0.00 | **PASS** |
| | NE Corner | (291.0, 291.0) | (1.0000, 1.0000) | (2160.0, 0.0) | 0.00 | **PASS** |
| | Map Center | (0.5, 0.5) | (0.5000, 0.5000) | (1080.0, 1079.0) | 0.00 | **PASS** |
| **Lockdown** | SW Corner | (-500.0, -500.0) | (0.0000, 0.0000) | (0.0, 9000.0) | 0.00 | **PASS** |
| | SE Corner | (500.0, -500.0) | (1.0000, 0.0000) | (9000.0, 9000.0) | 0.00 | **PASS** |
| | NW Corner | (-500.0, 500.0) | (0.0000, 1.0000) | (0.0, 0.0) | 0.00 | **PASS** |
| | NE Corner | (500.0, 500.0) | (1.0000, 1.0000) | (9000.0, 0.0) | 0.00 | **PASS** |
| | Map Center | (0.0, 0.0) | (0.5000, 0.5000) | (4500.0, 4500.0) | 0.00 | **PASS** |

### 6.2 Full Telemetry Dataset Validation

All 89,104 production gameplay coordinates were evaluated:

| Map | Records Evaluated | Observed U Range | Observed V Range | Out of Bounds | Max Round-Trip Error | Validation Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AmbroseValley** | 61,013 | [0.0500, 0.7464] | [0.1033, 0.9264] | 0 (0.00%) | 1.71e-13 m | **PASSED** |
| **GrandRift** | 6,853 | [0.1103, 0.9408] | [0.1652, 0.7919] | 0 (0.00%) | 1.14e-13 m | **PASSED** |
| **Lockdown** | 21,238 | [0.0934, 0.8484] | [0.2149, 0.8292] | 0 (0.00%) | 1.71e-13 m | **PASSED** |
| **Total** | **89,104** | — | — | **0 (0.00%)** | **1.71e-13 m** | **100% VALID** |

---

## 7. Automated Test Suite (`tests/test_coordinate_mapping.py`)

The automated test suite contains **37 unit tests** executed with `pytest`:

```
tests/test_coordinate_mapping.py::TestMapConfigurations::test_all_three_maps_configured PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_map_config_values[AmbroseValley] PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_map_config_values[GrandRift] PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_map_config_values[Lockdown] PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_case_insensitive_map_id PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_invalid_map_id_raises_value_error PASSED
tests/test_coordinate_mapping.py::TestMapConfigurations::test_non_string_map_id_raises_value_error PASSED
tests/test_coordinate_mapping.py::TestWorldToUV::test_origin_maps_to_uv_zero[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestWorldToUV::test_opposite_corner_maps_to_uv_one[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestWorldToUV::test_center_maps_to_half_uv[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestWorldToUV::test_readme_sample_coordinate PASSED
tests/test_coordinate_mapping.py::TestUVToWorld::test_uv_corners_to_world[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestPixelConversions::test_world_to_pixel_corners[4 resolutions] PASSED (4)
tests/test_coordinate_mapping.py::TestPixelConversions::test_vertical_axis_inversion PASSED
tests/test_coordinate_mapping.py::TestPixelConversions::test_non_square_dimensions_grand_rift PASSED
tests/test_coordinate_mapping.py::TestPixelConversions::test_invalid_image_dimensions_raise PASSED
tests/test_coordinate_mapping.py::TestRoundTripPrecision::test_world_uv_roundtrip[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestRoundTripPrecision::test_world_pixel_roundtrip[3 maps] PASSED (3)
tests/test_coordinate_mapping.py::TestOutOfBoundsHandling::test_raise_on_oob_uv PASSED
tests/test_coordinate_mapping.py::TestOutOfBoundsHandling::test_clamp_uv PASSED
tests/test_coordinate_mapping.py::TestOutOfBoundsHandling::test_clamp_pixel PASSED
tests/test_coordinate_mapping.py::TestOutOfBoundsHandling::test_pixel_to_world_oob PASSED

============================= 37 passed in 0.30s ==============================
```

---

## 8. Calibration Visualizations

Calibration images with telemetry overlays, landmark reticles, compass rose, and UV calibration lines are available in `docs/calibration/`:

1. **Ambrose Valley:** [`docs/calibration/ambrose_valley_calibration.png`](file:///c:/Users/Avijit%20Singh/Downloads/lila-player/docs/calibration/ambrose_valley_calibration.png)
   - Visualizes 12 sampled journeys (6 human, 6 bot) over `AmbroseValley_Minimap.png`.
   - Confirms player trajectories naturally contour terrain valleys and roads with zero clipping.
2. **Grand Rift:** [`docs/calibration/grand_rift_calibration.png`](file:///c:/Users/Avijit%20Singh/Downloads/lila-player/docs/calibration/grand_rift_calibration.png)
   - Visualizes trajectories over the canyon corridors of `GrandRift_Minimap.png`.
   - Validates non-square coordinate handling (2160 x 2158).
3. **Lockdown:** [`docs/calibration/lockdown_calibration.png`](file:///c:/Users/Avijit%20Singh/Downloads/lila-player/docs/calibration/lockdown_calibration.png)
   - Visualizes urban combat movements over `Lockdown_Minimap.jpg`.
   - Confirms tight building interior/street alignment.

---

## 9. Alignment Findings & Unresolved Assumptions

1. **Resolution Independence:** The README's 1024x1024 assumption is confirmed to be an intended web canvas display size rather than raw asset resolution. Decoupling world space into normalized UV coordinates [0, 1] before scaling by runtime canvas dimensions completely resolves all resolution differences.
2. **Grand Rift Non-Square Dimension:** `GrandRift_Minimap.png` is 2160 pixels wide by 2158 pixels tall (aspect ratio 1.000927). The 2-pixel variance is handled gracefully by runtime (W, H) scaling.
3. **No Coordinate Offset or Rotation Required:** Overlaid telemetry routes align precisely with visible in-game roads, canyon paths, and compound perimeters. There is **no rotation, non-linear distortion, or uncalibrated offset** in the coordinate system.
