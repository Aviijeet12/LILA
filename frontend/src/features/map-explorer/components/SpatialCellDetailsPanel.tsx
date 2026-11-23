import React from 'react';
import {
  MapPin,
  X,
  Compass,
  Layers,
  Activity,
  Flame,
  Award,
} from 'lucide-react';
import { MapId, MapHeatmaps } from '../../../types/telemetry';
import {
  gridCellToUVBounds,
  gridCellToWorldBounds,
} from '../utils/heatmapMath';
import {
  LAYER_THEME_COLORS,
  HeatmapLayerKey,
} from '../utils/heatmapRenderer';

interface SpatialCellDetailsPanelProps {
  mapId: MapId;
  cell: { row: number; col: number } | null;
  heatmaps: MapHeatmaps | null;
  onClose: () => void;
}

export const SpatialCellDetailsPanel: React.FC<SpatialCellDetailsPanelProps> = ({
  mapId,
  cell,
  heatmaps,
  onClose,
}) => {
  if (!cell || !heatmaps) return null;

  const { row, col } = cell;
  const uv = gridCellToUVBounds(row, col, heatmaps.grid_size || 64);
  const world = gridCellToWorldBounds(row, col, mapId, heatmaps.grid_size || 64);

  // Collect counts per layer
  const layerKeys: HeatmapLayerKey[] = [
    'human_traffic',
    'bot_traffic',
    'loot',
    'bot_kill',
    'bot_killed',
    'killed_by_storm',
  ];

  let totalCellPoints = 0;
  const breakdown = layerKeys.map((key) => {
    const layer = heatmaps.layers[key];
    const count = layer?.grid[row]?.[col] || 0;
    const totalInMap = layer?.total_points || 1;
    const shareOfMap = Number(((count / totalInMap) * 100).toFixed(2));
    totalCellPoints += count;

    return {
      key,
      info: LAYER_THEME_COLORS[key],
      count,
      totalInMap,
      shareOfMap,
      maxInMap: layer?.max_cell_count || 0,
    };
  });

  return (
    <div className="bg-[#111111]/95 backdrop-blur-md border border-[#292929] rounded-xl p-4 shadow-2xl space-y-3.5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#292929] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Spatial Sector Inspection
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Cell [Row {row}, Col {col}] • {mapId}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#292929] transition-colors"
          title="Close cell inspection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinate Readouts */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* World Bounding Box */}
        <div className="bg-[#090909] border border-[#292929] rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>World Bounding Box (m)</span>
          </div>
          <div className="font-mono text-slate-200 space-y-0.5">
            <div>X: [{world.xMin}, {world.xMax}]</div>
            <div>Z: [{world.zMin}, {world.zMax}]</div>
          </div>
        </div>

        {/* UV Range */}
        <div className="bg-[#090909] border border-[#292929] rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Normalized UV Bounds</span>
          </div>
          <div className="font-mono text-slate-200 space-y-0.5">
            <div>U: [{uv.uMin.toFixed(3)}, {uv.uMax.toFixed(3)}]</div>
            <div>V: [{uv.vMin.toFixed(3)}, {uv.vMax.toFixed(3)}]</div>
          </div>
        </div>
      </div>

      {/* Layer Metrics Breakdown Table */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            Layer Activity in Sector
          </span>
          <span className="font-mono text-[10px] text-slate-300">
            Total: {totalCellPoints.toLocaleString()} pings
          </span>
        </div>

        <div className="divide-y divide-[#292929] border border-[#292929] rounded-lg overflow-hidden bg-[#090909]">
          {breakdown.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between px-2.5 py-1.5 text-[11px] hover:bg-[#191919] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.info.hex }}
                />
                <span className="font-medium text-slate-300">{item.info.label}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-100 font-semibold">
                  {item.count.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 w-12 text-right">
                  {item.shareOfMap}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Note */}
      <div className="text-[10px] text-slate-500 leading-tight">
        * Sector area is ~{(
          ((world.xMax - world.xMin) * (world.zMax - world.zMin))
        ).toFixed(0)} m². Counts reflect all samples across 5 days of recorded telemetry.
      </div>
    </div>
  );
};
