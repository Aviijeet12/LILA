from dataclasses import dataclass
from typing import Tuple, Union, Optional
import numpy as np

@dataclass(frozen=True)
class MapConfig:
    map_id: str
    scale: float
    origin_x: float
    origin_z: float

MAP_CONFIGS = {
    "AmbroseValley": MapConfig(map_id="AmbroseValley", scale=900.0, origin_x=-370.0, origin_z=-473.0),
    "GrandRift": MapConfig(map_id="GrandRift", scale=581.0, origin_x=-290.0, origin_z=-290.0),
    "Lockdown": MapConfig(map_id="Lockdown", scale=1000.0, origin_x=-500.0, origin_z=-500.0),
}

# Case-insensitive alias map
_ALIAS_MAP = {k.lower(): k for k in MAP_CONFIGS.keys()}

def get_map_config(map_id: str) -> MapConfig:
    if not isinstance(map_id, str):
        raise ValueError(f"map_id must be a string, got {type(map_id).__name__}")
    normalized = _ALIAS_MAP.get(map_id.strip().lower())
    if not normalized:
        raise ValueError(
            f"Invalid map_id: '{map_id}'. Valid maps are: {list(MAP_CONFIGS.keys())}"
        )
    return MAP_CONFIGS[normalized]

def world_to_uv(
    x: float,
    z: float,
    map_id: str,
    raise_on_oob: bool = False,
    clamp: bool = False
) -> Tuple[float, float]:
    config = get_map_config(map_id)
    u = (x - config.origin_x) / config.scale
    v = (z - config.origin_z) / config.scale

    is_oob = u < 0.0 or u > 1.0 or v < 0.0 or v > 1.0
    if raise_on_oob and is_oob:
        raise ValueError(
            f"Coordinates ({x}, {z}) on map '{config.map_id}' yield out-of-bounds UV ({u:.4f}, {v:.4f}). Expected UV in [0, 1]."
        )

    if clamp:
        u = max(0.0, min(1.0, u))
        v = max(0.0, min(1.0, v))

    return u, v

def uv_to_world(u: float, v: float, map_id: str) -> Tuple[float, float]:
    config = get_map_config(map_id)
    x = config.origin_x + u * config.scale
    z = config.origin_z + v * config.scale
    return x, z

def world_to_pixel(
    x: float,
    z: float,
    map_id: str,
    image_width: float,
    image_height: float,
    raise_on_oob: bool = False,
    clamp: bool = False
) -> Tuple[float, float]:
    if image_width <= 0 or image_height <= 0:
        raise ValueError(f"Image dimensions must be positive, got ({image_width}, {image_height})")

    u, v = world_to_uv(x, z, map_id, raise_on_oob=raise_on_oob, clamp=clamp)
    pixel_x = u * image_width
    pixel_y = (1.0 - v) * image_height

    if clamp:
        pixel_x = max(0.0, min(image_width, pixel_x))
        pixel_y = max(0.0, min(image_height, pixel_y))

    return pixel_x, pixel_y

def pixel_to_world(
    pixel_x: float,
    pixel_y: float,
    map_id: str,
    image_width: float,
    image_height: float,
    raise_on_oob: bool = False
) -> Tuple[float, float]:
    if image_width <= 0 or image_height <= 0:
        raise ValueError(f"Image dimensions must be positive, got ({image_width}, {image_height})")

    u = pixel_x / image_width
    v = 1.0 - (pixel_y / image_height)

    is_oob = u < 0.0 or u > 1.0 or v < 0.0 or v > 1.0
    if raise_on_oob and is_oob:
        raise ValueError(
            f"Pixel coordinates ({pixel_x}, {pixel_y}) for image ({image_width}x{image_height}) are out-of-bounds."
        )

    return uv_to_world(u, v, map_id)
