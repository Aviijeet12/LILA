# -*- coding: utf-8 -*-
import os
import sys
sys.path.insert(0, '.')
import glob
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from scripts.coordinate_mapping import (
    MAP_CONFIGS,
    world_to_uv,
    uv_to_world,
    world_to_pixel,
    pixel_to_world
)

MINIMAP_FILES = {
    'AmbroseValley': 'data/raw/player_data/minimaps/AmbroseValley_Minimap.png',
    'GrandRift': 'data/raw/player_data/minimaps/GrandRift_Minimap.png',
    'Lockdown': 'data/raw/player_data/minimaps/Lockdown_Minimap.jpg'
}

OUTPUT_FILES = {
    'AmbroseValley': 'docs/calibration/ambrose_valley_calibration.png',
    'GrandRift': 'docs/calibration/grand_rift_calibration.png',
    'Lockdown': 'docs/calibration/lockdown_calibration.png'
}

def load_sample_telemetry(map_name, max_human_files=5, max_bot_files=5):
    all_files = glob.glob('data/raw/player_data/*/*.nakama-0')
    human_dfs = []
    bot_dfs = []

    for f in all_files:
        uid = os.path.basename(f).split('_')[0]
        is_bot = uid.isdigit()
        
        df_head = pq.read_table(f, columns=['map_id']).to_pandas()
        if len(df_head) == 0 or df_head['map_id'].iloc[0] != map_name:
            continue
            
        df = pq.read_table(f).to_pandas()
        df['event_str'] = df['event'].apply(lambda e: e.decode('utf-8') if isinstance(e, bytes) else str(e))
        df['file'] = os.path.basename(f)
        df['is_bot'] = is_bot

        if is_bot and len(bot_dfs) < max_bot_files:
            bot_dfs.append(df)
        elif not is_bot and len(human_dfs) < max_human_files:
            human_dfs.append(df)

        if len(human_dfs) >= max_human_files and len(bot_dfs) >= max_bot_files:
            break

    return human_dfs, bot_dfs

def generate_calibration_chart(map_name):
    print(f'\n--- Generating Calibration Visualization for {map_name} ---')
    img_path = MINIMAP_FILES[map_name]
    out_path = OUTPUT_FILES[map_name]
    config = MAP_CONFIGS[map_name]

    raw_img = Image.open(img_path)
    orig_w, orig_h = raw_img.size
    print(f'Original image size: {orig_w} x {orig_h}')

    target_max_dim = 2160
    if max(orig_w, orig_h) > target_max_dim:
        scale_factor = target_max_dim / max(orig_w, orig_h)
        vis_w = int(orig_w * scale_factor)
        vis_h = int(orig_h * scale_factor)
        display_img = raw_img.resize((vis_w, vis_h), Image.Resampling.LANCZOS)
    else:
        vis_w, vis_h = orig_w, orig_h
        display_img = raw_img

    print(f'Visualization canvas size: {vis_w} x {vis_h}')

    human_dfs, bot_dfs = load_sample_telemetry(map_name, max_human_files=6, max_bot_files=6)
    print(f'Sampled {len(human_dfs)} human files and {len(bot_dfs)} bot files')

    dpi = 150
    fig_w = 12
    fig_h = 12 * (vis_h / vis_w)
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=dpi)

    ax.imshow(display_img, extent=[0, vis_w, vis_h, 0], aspect='auto')

    for uv_val in [0.0, 0.25, 0.5, 0.75, 1.0]:
        grid_px_x = uv_val * vis_w
        ax.axvline(grid_px_x, color='white', linestyle='--', alpha=0.35, linewidth=0.8)

        grid_px_y = (1.0 - uv_val) * vis_h
        ax.axhline(grid_px_y, color='white', linestyle='--', alpha=0.35, linewidth=0.8)

        wx = config.origin_x + uv_val * config.scale
        wz = config.origin_z + uv_val * config.scale

        if uv_val in [0.0, 0.5, 1.0]:
            ax.text(
                grid_px_x + 10, vis_h - 25,
                f'U={uv_val:.1f}\nX={wx:.0f}',
                color='yellow', fontsize=8, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='black', alpha=0.6, edgecolor='none')
            )
            ax.text(
                15, grid_px_y - 10,
                f'V={uv_val:.1f} | Z={wz:.0f}',
                color='yellow', fontsize=8, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='black', alpha=0.6, edgecolor='none')
            )

    human_points_count = 0
    for idx, df in enumerate(human_dfs):
        df_sorted = df.sort_values('ts')
        px_coords = [
            world_to_pixel(row['x'], row['z'], map_name, vis_w, vis_h)
            for _, row in df_sorted.iterrows()
        ]
        xs = [p[0] for p in px_coords]
        ys = [p[1] for p in px_coords]
        human_points_count += len(xs)

        ax.plot(xs, ys, color='#00E5FF', alpha=0.7, linewidth=1.5, zorder=3)
        ax.scatter(xs, ys, color='#00E5FF', s=10, alpha=0.8, zorder=4)

        ax.scatter(xs[0], ys[0], color='#10B981', s=45, marker='o', edgecolors='white', linewidths=1.0, zorder=6)
        last_ev = df_sorted.iloc[-1]['event_str']
        end_color = '#EF4444' if ('Kill' in last_ev or 'Storm' in last_ev) else '#3B82F6'
        ax.scatter(xs[-1], ys[-1], color=end_color, s=50, marker='X', edgecolors='white', linewidths=1.0, zorder=6)

    bot_points_count = 0
    for idx, df in enumerate(bot_dfs):
        df_sorted = df.sort_values('ts')
        px_coords = [
            world_to_pixel(row['x'], row['z'], map_name, vis_w, vis_h)
            for _, row in df_sorted.iterrows()
        ]
        xs = [p[0] for p in px_coords]
        ys = [p[1] for p in px_coords]
        bot_points_count += len(xs)

        ax.plot(xs, ys, color='#FF9100', alpha=0.65, linewidth=1.2, linestyle=':', zorder=3)
        ax.scatter(xs, ys, color='#FF9100', s=8, alpha=0.7, zorder=4)

        ax.scatter(xs[0], ys[0], color='#10B981', s=35, marker='^', edgecolors='black', linewidths=0.8, zorder=5)
        ax.scatter(xs[-1], ys[-1], color='#DC2626', s=45, marker='v', edgecolors='black', linewidths=0.8, zorder=5)

    for df in human_dfs:
        for _, row in df[df['event_str'] == 'Loot'].iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_name, vis_w, vis_h)
            ax.scatter(px, py, color='#FBBF24', s=18, marker='d', alpha=0.85, zorder=5)
        for _, row in df[df['event_str'].isin(['BotKill', 'Kill'])].iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_name, vis_w, vis_h)
            ax.scatter(px, py, color='#A855F7', s=45, marker='*', edgecolors='white', linewidths=0.8, zorder=7)
        for _, row in df[df['event_str'].isin(['BotKilled', 'Killed', 'KilledByStorm'])].iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_name, vis_w, vis_h)
            ax.scatter(px, py, color='#EF4444', s=60, marker='x', linewidths=2.0, zorder=7)

    cx, cy = world_to_pixel(config.origin_x + 0.5 * config.scale, config.origin_z + 0.5 * config.scale, map_name, vis_w, vis_h)
    ax.scatter(cx, cy, color='#F43F5E', s=120, marker='+', linewidths=2.5, zorder=8)
    ax.text(cx + 12, cy - 12, 'MAP CENTER (U=0.5, V=0.5)', color='#F43F5E', fontsize=9, fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='black', alpha=0.7, edgecolor='#F43F5E'))

    rect = patches.Rectangle((0, 0), vis_w, vis_h, linewidth=2.5, edgecolor='#00E5FF', facecolor='none', zorder=9)
    ax.add_patch(rect)

    compass_x = vis_w - 120
    compass_y = 120
    ax.arrow(compass_x, compass_y, 0, -60, head_width=25, head_length=20, fc='#EF4444', ec='white', linewidth=1.5, zorder=10)
    ax.text(compass_x - 7, compass_y - 75, 'N (+Z)', color='white', fontsize=10, fontweight='heavy', zorder=10)
    ax.arrow(compass_x, compass_y, 60, 0, head_width=20, head_length=25, fc='#3B82F6', ec='white', linewidth=1.5, zorder=10)
    ax.text(compass_x + 70, compass_y + 5, 'E (+X)', color='white', fontsize=10, fontweight='heavy', zorder=10)

    title_text = f'LILA BLACK Minimap Calibration -- {map_name}\n' \
                 f'Config: Scale={config.scale:.0f} | Origin=({config.origin_x:.0f}, {config.origin_z:.0f}) | ' \
                 f'Native: {orig_w}x{orig_h}px | Plotted: {vis_w}x{vis_h}px\n' \
                 f'Plotted Data: {len(human_dfs)} Human files ({human_points_count} pts), {len(bot_dfs)} Bot files ({bot_points_count} pts)'
    ax.set_title(title_text, color='white', fontsize=11, fontweight='bold', pad=12, backgroundcolor='#111827')

    legend_elements = [
        plt.Line2D([0], [0], color='#00E5FF', lw=2, label='Human Trajectory (Sampled)'),
        plt.Line2D([0], [0], color='#FF9100', lw=1.5, linestyle=':', label='Bot Trajectory (Sampled)'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='#10B981', markersize=8, label='Spawn Position (First Tick)'),
        plt.Line2D([0], [0], marker='d', color='w', markerfacecolor='#FBBF24', markersize=7, label='Loot Event'),
        plt.Line2D([0], [0], marker='*', color='w', markerfacecolor='#A855F7', markersize=10, label='Kill / BotKill Event'),
        plt.Line2D([0], [0], marker='x', color='#EF4444', markersize=9, markeredgewidth=2, label='Death (Killed / Storm)'),
        plt.Line2D([0], [0], marker='+', color='#F43F5E', markersize=10, markeredgewidth=2, label='World Center (U=0.5, V=0.5)')
    ]
    ax.legend(handles=legend_elements, loc='lower left', facecolor='#111827', edgecolor='#374151',
              labelcolor='white', fontsize=9, framealpha=0.85)

    ax.set_xlim(0, vis_w)
    ax.set_ylim(vis_h, 0)
    ax.set_xlabel('Canvas X (pixels)', color='white', fontsize=9)
    ax.set_ylabel('Canvas Y (pixels, inverted)', color='white', fontsize=9)
    ax.tick_params(colors='white', labelsize=8)

    plt.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig.savefig(out_path, dpi=dpi, facecolor='#0B0F19')
    plt.close(fig)
    print(f'Successfully saved calibration visualization: {out_path}')

if __name__ == '__main__':
    for map_name in ['AmbroseValley', 'GrandRift', 'Lockdown']:
        generate_calibration_chart(map_name)
