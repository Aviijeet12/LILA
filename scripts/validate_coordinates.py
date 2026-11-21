# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, '.')
import glob
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
from PIL import Image
from scripts.coordinate_mapping import (
    MAP_CONFIGS,
    world_to_uv,
    uv_to_world,
    world_to_pixel,
    pixel_to_world
)

MINIMAPS = {
    'AmbroseValley': 'data/raw/player_data/minimaps/AmbroseValley_Minimap.png',
    'GrandRift': 'data/raw/player_data/minimaps/GrandRift_Minimap.png',
    'Lockdown': 'data/raw/player_data/minimaps/Lockdown_Minimap.jpg'
}

def run_validation():
    print('=== COORDINATE TRANSFORMATION VALIDATION REPORT ===\n')
    
    # 1. Load Parquet coordinates per map
    all_files = glob.glob('data/raw/player_data/*/*.nakama-0')
    records_by_map = {'AmbroseValley': [], 'GrandRift': [], 'Lockdown': []}
    
    print('Loading observed dataset coordinates across Parquet files...')
    for f in all_files:
        tbl = pq.read_table(f, columns=['map_id', 'x', 'z', 'user_id', 'event'])
        df = tbl.to_pandas()
        m = df['map_id'].iloc[0]
        records_by_map[m].append(df)
        
    dfs = {m: pd.concat(flist, ignore_index=True) for m, flist in records_by_map.items()}
    
    for map_name, config in MAP_CONFIGS.items():
        print(f'\n======================================================')
        print(f'VALIDATING MAP: {map_name}')
        print(f'======================================================')
        print(f'Configuration: Scale={config.scale}, Origin X={config.origin_x}, Origin Z={config.origin_z}')
        
        # Load image size
        with Image.open(MINIMAPS[map_name]) as im:
            img_w, img_h = im.size
        print(f'Native minimap dimensions: {img_w} x {img_h} (Aspect ratio: {img_w/img_h:.6f})')
        
        # Test 1: All 4 world corners
        corners = [
            ('Bottom-Left (SW)', config.origin_x, config.origin_z, 0.0, 0.0, 0.0, float(img_h)),
            ('Bottom-Right (SE)', config.origin_x + config.scale, config.origin_z, 1.0, 0.0, float(img_w), float(img_h)),
            ('Top-Left (NW)', config.origin_x, config.origin_z + config.scale, 0.0, 1.0, 0.0, 0.0),
            ('Top-Right (NE)', config.origin_x + config.scale, config.origin_z + config.scale, 1.0, 1.0, float(img_w), 0.0)
        ]
        
        print('\n--- 1. Testing 4 World-Space Corners ---')
        for name, wx, wz, exp_u, exp_v, exp_px, exp_py in corners:
            u, v = world_to_uv(wx, wz, map_name)
            px, py = world_to_pixel(wx, wz, map_name, img_w, img_h)
            
            # Round-trip UV
            rt_x_uv, rt_z_uv = uv_to_world(u, v, map_name)
            # Round-trip Pixel
            rt_x_px, rt_z_px = pixel_to_world(px, py, map_name, img_w, img_h)
            
            uv_err = max(abs(u - exp_u), abs(v - exp_v))
            px_err = max(abs(px - exp_px), abs(py - exp_py))
            rt_uv_err = max(abs(rt_x_uv - wx), abs(rt_z_uv - wz))
            rt_px_err = max(abs(rt_x_px - wx), abs(rt_z_px - wz))
            
            print(f'  Corner: {name:18} | World: ({wx:7.1f}, {wz:7.1f}) -> UV: ({u:.4f}, {v:.4f}) -> Pixel: ({px:7.1f}, {py:7.1f}) | UV err: {uv_err:.1e}, PX err: {px_err:.1e}, RT err: {rt_px_err:.1e}')
            assert uv_err < 1e-6, f'Corner {name} UV error too high'
            assert px_err < 1e-4, f'Corner {name} Pixel error too high'
            assert rt_px_err < 1e-4, f'Corner {name} Roundtrip error too high'
            
        # Test 2: Center coordinate
        print('\n--- 2. Testing Map Center Coordinate ---')
        center_x = config.origin_x + 0.5 * config.scale
        center_z = config.origin_z + 0.5 * config.scale
        cu, cv = world_to_uv(center_x, center_z, map_name)
        cpx, cpy = world_to_pixel(center_x, center_z, map_name, img_w, img_h)
        rt_cx, rt_cz = pixel_to_world(cpx, cpy, map_name, img_w, img_h)
        print(f'  Center World: ({center_x:.1f}, {center_z:.1f}) -> UV: ({cu:.4f}, {cv:.4f}) -> Pixel: ({cpx:.1f}, {cpy:.1f})')
        assert abs(cu - 0.5) < 1e-6 and abs(cv - 0.5) < 1e-6
        assert abs(cpx - img_w * 0.5) < 1e-4 and abs(cpy - img_h * 0.5) < 1e-4
        assert abs(rt_cx - center_x) < 1e-4 and abs(rt_cz - center_z) < 1e-4
        
        # Test 3: Observed Min and Max coordinates from dataset
        df_map = dfs[map_name]
        min_x, max_x = float(df_map['x'].min()), float(df_map['x'].max())
        min_z, max_z = float(df_map['z'].min()), float(df_map['z'].max())
        
        print('\n--- 3. Testing Observed Minimum & Maximum Dataset Coordinates ---')
        extrema = [
            ('Min X, Min Z', min_x, min_z),
            ('Max X, Max Z', max_x, max_z),
            ('Min X, Max Z', min_x, max_z),
            ('Max X, Min Z', max_x, min_z)
        ]
        for label, ex_x, ex_z in extrema:
            u, v = world_to_uv(ex_x, ex_z, map_name, raise_on_oob=True)
            px, py = world_to_pixel(ex_x, ex_z, map_name, img_w, img_h, raise_on_oob=True)
            rt_x, rt_z = pixel_to_world(px, py, map_name, img_w, img_h)
            rt_err = max(abs(rt_x - ex_x), abs(rt_z - ex_z))
            print(f'  {label:14}: World=({ex_x:7.2f}, {ex_z:7.2f}) -> UV=({u:.4f}, {v:.4f}) -> Pixel=({px:7.1f}, {py:7.1f}) | RT err: {rt_err:.1e}')
            assert 0.0 <= u <= 1.0 and 0.0 <= v <= 1.0
            assert 0.0 <= px <= img_w and 0.0 <= py <= img_h
            assert rt_err < 1e-4
            
        # Test 4: All observed dataset records (bulk vectorized check)
        print('\n--- 4. Bulk Validation Across All Observed Real Dataset Points ---')
        total_pts = len(df_map)
        xs = df_map['x'].to_numpy(dtype=np.float64)
        zs = df_map['z'].to_numpy(dtype=np.float64)
        
        us = (xs - config.origin_x) / config.scale
        vs = (zs - config.origin_z) / config.scale
        
        oob_mask = (us < 0.0) | (us > 1.0) | (vs < 0.0) | (vs > 1.0)
        oob_count = int(np.sum(oob_mask))
        
        px_xs = us * img_w
        px_ys = (1.0 - vs) * img_h
        
        rt_xs = config.origin_x + (px_xs / img_w) * config.scale
        rt_zs = config.origin_z + (1.0 - (px_ys / img_h)) * config.scale
        
        max_rt_err = float(np.max(np.maximum(np.abs(rt_xs - xs), np.abs(rt_zs - zs))))
        
        print(f'  Total real points evaluated: {total_pts:,}')
        print(f'  U range: [{np.min(us):.4f}, {np.max(us):.4f}]')
        print(f'  V range: [{np.min(vs):.4f}, {np.max(vs):.4f}]')
        print(f'  Pixel X range: [{np.min(px_xs):.1f}, {np.max(px_xs):.1f}] px (image width={img_w})')
        print(f'  Pixel Y range: [{np.min(px_ys):.1f}, {np.max(px_ys):.1f}] px (image height={img_h})')
        print(f'  Out-of-bounds UV points: {oob_count} (0.00%)')
        print(f'  Max round-trip error across all points: {max_rt_err:.2e} meters')
        assert oob_count == 0, f'{oob_count} out-of-bounds points found on {map_name}!'
        assert max_rt_err < 1e-5, f'Roundtrip precision exceeded threshold on {map_name}'
        print(f'  [PASSED] All {total_pts:,} real points strictly valid within image bounds!')

    print('\n======================================================')
    print('ALL MAPS PASSED VALIDATION WITH ZERO ERRORS!')
    print('======================================================')

if __name__ == '__main__':
    run_validation()
