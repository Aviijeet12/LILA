import React, { useState } from 'react';
import {
  X,
  Flame,
  Activity,
  Layers,
  MapPin,
  TrendingUp,
  Info,
  ShieldAlert,
  Crosshair,
  ExternalLink,
} from 'lucide-react';
import { MapId, MapHeatmaps } from '../../../types/telemetry';
import {
  calculateCoverage,
  extractTopHotspots,
  HotspotCell,
} from '../utils/heatmapMath';
import {
  HeatmapLayerKey,
  LAYER_THEME_COLORS,
} from '../utils/heatmapRenderer';

interface SpatialAnalyticsModalProps {
  mapId: MapId;
  heatmaps: MapHeatmaps | null;
  onClose: () => void;
  onSelectCell: (cell: { row: number; col: number }) => void;
}

export const SpatialAnalyticsModal: React.FC<SpatialAnalyticsModalProps> = ({
  mapId,
  heatmaps,
  onClose,
  onSelectCell,
}) => {
  const [selectedLayer, setSelectedLayer] = useState<HeatmapLayerKey>('human_traffic');

  if (!heatmaps) return null;

  const layer = heatmaps.layers[selectedLayer];
  const coverage = calculateCoverage(layer?.grid || [], heatmaps.grid_size || 64);
  const hotspots: HotspotCell[] = extractTopHotspots(
    layer?.grid || [],
    mapId,
    8,
    heatmaps.grid_size || 64
  );

  const layerKeys: HeatmapLayerKey[] = [
    'human_traffic',
    'bot_traffic',
    'loot',
    'bot_kill',
    'bot_killed',
    'killed_by_storm',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111111] border border-[#292929] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#292929] bg-[#090909]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Spatial Intelligence & Telemetry Analytics
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#292929] text-amber-400 font-mono">
                  {mapId}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Density distributions, sector coverage, and high-frequency hotspot rankings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#292929] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Metric Cards: 6 Layers Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {layerKeys.map((key) => {
              const info = LAYER_THEME_COLORS[key];
              const lData = heatmaps.layers[key];
              const isSelected = selectedLayer === key;
              const pts = lData?.total_points ?? 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedLayer(key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#191919] border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-[#090909] border-[#292929] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: info.hex }}
                    />
                    <span className="text-[11px] font-medium text-slate-300 truncate">
                      {info.label}
                    </span>
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-100">
                    {pts.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Peak: {lData?.max_cell_count ?? 0} in cell
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Layer Deep Dive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Cells Coverage Card */}
            <div className="bg-[#090909] border border-[#292929] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                Spatial Coverage
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {coverage.coveragePercent}%
              </div>
              <p className="text-xs text-slate-400">
                <strong className="text-slate-200">{coverage.activeCells.toLocaleString()}</strong> of {coverage.totalCells.toLocaleString()} sectors recorded {LAYER_THEME_COLORS[selectedLayer].label.toLowerCase()}.
              </p>
              <div className="w-full bg-[#191919] h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, coverage.coveragePercent)}%` }}
                />
              </div>
            </div>

            {/* Mean Sector Intensity */}
            <div className="bg-[#090909] border border-[#292929] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <Activity className="w-4 h-4 text-purple-400" />
                Active Sector Average
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {coverage.meanActiveCount}
              </div>
              <p className="text-xs text-slate-400">
                Average pings per occupied grid sector. Peak sector reached{' '}
                <strong className="text-slate-200">{coverage.maxCellCount.toLocaleString()}</strong> events.
              </p>
            </div>

            {/* Density Concentration Ratio */}
            <div className="bg-[#090909] border border-[#292929] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Peak Concentration
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {coverage.totalPoints > 0
                  ? ((coverage.maxCellCount / coverage.totalPoints) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-slate-400">
                Share of all {LAYER_THEME_COLORS[selectedLayer].label.toLowerCase()} concentrated in the single highest-density sector.
              </p>
            </div>
          </div>

          {/* Top 8 Hotspot Sectors Table */}
          <div className="bg-[#090909] border border-[#292929] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#292929] bg-[#090909] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Highest-Density Sectors — {LAYER_THEME_COLORS[selectedLayer].label}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Click row to inspect sector on minimap
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#292929] text-[10px] uppercase font-semibold text-slate-400 bg-[#090909]">
                    <th className="px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Sector (Grid)</th>
                    <th className="px-4 py-2.5">World Coords [X, Z]</th>
                    <th className="px-4 py-2.5">UV Bounds</th>
                    <th className="px-4 py-2.5 text-right">Event Count</th>
                    <th className="px-4 py-2.5 text-right">% of Layer</th>
                    <th className="px-4 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#191919] font-mono">
                  {hotspots.map((h) => {
                    const share = layer?.total_points
                      ? ((h.count / layer.total_points) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <tr
                        key={`${h.row}-${h.col}`}
                        className="hover:bg-[#191919] transition-colors cursor-pointer"
                        onClick={() => {
                          onSelectCell({ row: h.row, col: h.col });
                          onClose();
                        }}
                      >
                        <td className="px-4 py-2 font-bold text-amber-400">
                          #{h.rank}
                        </td>
                        <td className="px-4 py-2 text-slate-300 font-sans">
                          Sector [{h.row}, {h.col}]
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-[11px]">
                          [{h.worldBounds.xMin}, {h.worldBounds.zMin}]
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-[11px]">
                          [{h.uvBounds.uMin.toFixed(2)}, {h.uvBounds.vMin.toFixed(2)}]
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-100">
                          {h.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">
                          {share}%
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/60 text-[10px] font-sans font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metric Definitions and Telemetry Sample Sizes */}
          <div className="bg-[#090909] border border-[#292929] rounded-xl p-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
              <Info className="w-4 h-4 text-cyan-400" />
              Metric Definitions & Telemetry Methodology
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] list-disc list-inside leading-relaxed text-slate-400">
              <li>
                <strong className="text-slate-300">Movement Samples:</strong> Periodic GPS telemetry coordinates logged during match runtime. These represent spatial sample pings, not unique concurrent players.
              </li>
              <li>
                <strong className="text-slate-300">Loot Pickups:</strong> Discrete item grab interactions logged when players or bots acquire gear in compounds.
              </li>
              <li>
                <strong className="text-slate-300">Bot Kill vs Bot Killed:</strong> Preserved from Nakama telemetry logs without inferring unrecorded killer-victim correlations.
              </li>
              <li>
                <strong className="text-slate-300">Grid Resolution:</strong> Uniform 64×64 spatial partition calibrated against the verified map bounds.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
