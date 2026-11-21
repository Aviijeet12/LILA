# -*- coding: utf-8 -*-
import pytest
import numpy as np
from scripts.coordinate_mapping import (
    MAP_CONFIGS,
    get_map_config,
    world_to_uv,
    uv_to_world,
    world_to_pixel,
    pixel_to_world
)

class TestMapConfigurations:
    def test_all_three_maps_configured(self):
        assert set(MAP_CONFIGS.keys()) == {'AmbroseValley', 'GrandRift', 'Lockdown'}

    @pytest.mark.parametrize('map_id, exp_scale, exp_ox, exp_oz', [
        ('AmbroseValley', 900.0, -370.0, -473.0),
        ('GrandRift', 581.0, -290.0, -290.0),
        ('Lockdown', 1000.0, -500.0, -500.0),
    ])
    def test_map_config_values(self, map_id, exp_scale, exp_ox, exp_oz):
        cfg = get_map_config(map_id)
        assert cfg.scale == exp_scale
        assert cfg.origin_x == exp_ox
        assert cfg.origin_z == exp_oz

    def test_case_insensitive_map_id(self):
        cfg1 = get_map_config('ambrosevalley')
        cfg2 = get_map_config('AMBROSEVALLEY')
        cfg3 = get_map_config('AmbroseValley')
        assert cfg1 == cfg2 == cfg3

    def test_invalid_map_id_raises_value_error(self):
        with pytest.raises(ValueError, match='Invalid map_id'):
            get_map_config('NonExistentMap')

    def test_non_string_map_id_raises_value_error(self):
        with pytest.raises(ValueError, match='must be a string'):
            get_map_config(12345)


class TestWorldToUV:
    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_origin_maps_to_uv_zero(self, map_id):
        cfg = get_map_config(map_id)
        u, v = world_to_uv(cfg.origin_x, cfg.origin_z, map_id)
        assert pytest.approx(u, abs=1e-7) == 0.0
        assert pytest.approx(v, abs=1e-7) == 0.0

    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_opposite_corner_maps_to_uv_one(self, map_id):
        cfg = get_map_config(map_id)
        u, v = world_to_uv(cfg.origin_x + cfg.scale, cfg.origin_z + cfg.scale, map_id)
        assert pytest.approx(u, abs=1e-7) == 1.0
        assert pytest.approx(v, abs=1e-7) == 1.0

    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_center_maps_to_half_uv(self, map_id):
        cfg = get_map_config(map_id)
        u, v = world_to_uv(cfg.origin_x + 0.5 * cfg.scale, cfg.origin_z + 0.5 * cfg.scale, map_id)
        assert pytest.approx(u, abs=1e-7) == 0.5
        assert pytest.approx(v, abs=1e-7) == 0.5

    def test_readme_sample_coordinate(self):
        # AmbroseValley: x=-301.45, z=-355.55
        u, v = world_to_uv(-301.45, -355.55, 'AmbroseValley')
        assert pytest.approx(u, abs=1e-4) == 0.0762
        assert pytest.approx(v, abs=1e-4) == 0.1305


class TestUVToWorld:
    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_uv_corners_to_world(self, map_id):
        cfg = get_map_config(map_id)
        x0, z0 = uv_to_world(0.0, 0.0, map_id)
        assert pytest.approx(x0) == cfg.origin_x
        assert pytest.approx(z0) == cfg.origin_z

        x1, z1 = uv_to_world(1.0, 1.0, map_id)
        assert pytest.approx(x1) == cfg.origin_x + cfg.scale
        assert pytest.approx(z1) == cfg.origin_z + cfg.scale


class TestPixelConversions:
    @pytest.mark.parametrize('width, height', [(1024, 1024), (4320, 4320), (2160, 2158), (9000, 9000)])
    def test_world_to_pixel_corners(self, width, height):
        cfg = get_map_config('Lockdown')
        # Bottom-left in world (u=0, v=0) -> pixel_x=0, pixel_y=height (bottom of image)
        px_bl, py_bl = world_to_pixel(cfg.origin_x, cfg.origin_z, 'Lockdown', width, height)
        assert pytest.approx(px_bl) == 0.0
        assert pytest.approx(py_bl) == float(height)

        # Top-right in world (u=1, v=1) -> pixel_x=width, pixel_y=0 (top of image)
        px_tr, py_tr = world_to_pixel(cfg.origin_x + cfg.scale, cfg.origin_z + cfg.scale, 'Lockdown', width, height)
        assert pytest.approx(px_tr) == float(width)
        assert pytest.approx(py_tr) == 0.0

    def test_vertical_axis_inversion(self):
        # North is +Z (higher z). As z increases, v increases, and pixel_y must decrease (move toward top)
        cfg = get_map_config('AmbroseValley')
        px1, py1 = world_to_pixel(0.0, -100.0, 'AmbroseValley', 1024, 1024)
        px2, py2 = world_to_pixel(0.0, 100.0, 'AmbroseValley', 1024, 1024)
        assert py2 < py1  # Northern point has lower Y pixel index

    def test_non_square_dimensions_grand_rift(self):
        # Grand Rift native image is 2160 x 2158
        w, h = 2160, 2158
        cfg = get_map_config('GrandRift')
        px, py = world_to_pixel(0.5, 0.5, 'GrandRift', w, h)
        assert pytest.approx(px) == 1080.0
        assert pytest.approx(py) == 1079.0

        # Roundtrip
        wx, wz = pixel_to_world(px, py, 'GrandRift', w, h)
        assert pytest.approx(wx) == 0.5
        assert pytest.approx(wz) == 0.5

    def test_invalid_image_dimensions_raise(self):
        with pytest.raises(ValueError, match='positive'):
            world_to_pixel(0, 0, 'Lockdown', 0, 1024)
        with pytest.raises(ValueError, match='positive'):
            world_to_pixel(0, 0, 'Lockdown', 1024, -100)
        with pytest.raises(ValueError, match='positive'):
            pixel_to_world(10, 10, 'Lockdown', -10, 1024)


class TestRoundTripPrecision:
    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_world_uv_roundtrip(self, map_id):
        cfg = get_map_config(map_id)
        # Test 100 random points across map bounds
        np.random.seed(42)
        test_x = np.random.uniform(cfg.origin_x, cfg.origin_x + cfg.scale, 100)
        test_z = np.random.uniform(cfg.origin_z, cfg.origin_z + cfg.scale, 100)

        for x, z in zip(test_x, test_z):
            u, v = world_to_uv(x, z, map_id)
            rt_x, rt_z = uv_to_world(u, v, map_id)
            assert pytest.approx(rt_x, abs=1e-10) == x
            assert pytest.approx(rt_z, abs=1e-10) == z

    @pytest.mark.parametrize('map_id', ['AmbroseValley', 'GrandRift', 'Lockdown'])
    def test_world_pixel_roundtrip(self, map_id):
        cfg = get_map_config(map_id)
        np.random.seed(1337)
        test_x = np.random.uniform(cfg.origin_x, cfg.origin_x + cfg.scale, 100)
        test_z = np.random.uniform(cfg.origin_z, cfg.origin_z + cfg.scale, 100)

        w, h = 3840, 2160
        for x, z in zip(test_x, test_z):
            px, py = world_to_pixel(x, z, map_id, w, h)
            rt_x, rt_z = pixel_to_world(px, py, map_id, w, h)
            assert pytest.approx(rt_x, abs=1e-9) == x
            assert pytest.approx(rt_z, abs=1e-9) == z


class TestOutOfBoundsHandling:
    def test_raise_on_oob_uv(self):
        cfg = get_map_config('AmbroseValley')
        # Way beyond right edge
        with pytest.raises(ValueError, match='out-of-bounds UV'):
            world_to_uv(cfg.origin_x + cfg.scale + 100.0, 0.0, 'AmbroseValley', raise_on_oob=True)

        # Way beyond left edge
        with pytest.raises(ValueError, match='out-of-bounds UV'):
            world_to_uv(cfg.origin_x - 50.0, 0.0, 'AmbroseValley', raise_on_oob=True)

    def test_clamp_uv(self):
        cfg = get_map_config('Lockdown')
        u, v = world_to_uv(cfg.origin_x + 2 * cfg.scale, cfg.origin_z - cfg.scale, 'Lockdown', clamp=True)
        assert u == 1.0
        assert v == 0.0

    def test_clamp_pixel(self):
        w, h = 1000, 1000
        px, py = world_to_pixel(10000.0, -10000.0, 'Lockdown', w, h, clamp=True)
        assert px == 1000.0
        assert py == 1000.0

    def test_pixel_to_world_oob(self):
        with pytest.raises(ValueError, match='out-of-bounds'):
            pixel_to_world(-10.0, 500.0, 'Lockdown', 1000, 1000, raise_on_oob=True)
