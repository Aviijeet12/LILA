import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Layers,
  MapPin,
  ExternalLink,
  Flame,
  Activity,
  Award,
  TrendingUp,
  Info,
  ShieldAlert,
  Compass,
  Crosshair,
  Grid,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { MapId, MapHeatmaps } from '../../types/telemetry';
import {
  gridCellToUVBounds,
  gridCellToWorldBounds,
  extractTopHotspots,
  calculateCoverage,
  HotspotCell,
} from '../map-explorer/utils/heatmapMath';
import {
  HeatmapLayerKey,
  LAYER_THEME_COLORS,
  getThermalColor,
} from '../map-explorer/utils/heatmapRenderer';

export const RegionIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedMap, setSelectedMap] = useState<MapId>(
    (searchParams.get('map') as MapId) || 'AmbroseValley'
  );
  const [allHeatmaps, setAllHeatmaps] = useState<Record<MapId, MapHeatmaps | null>>({
    AmbroseValley: null,
    GrandRift: null,
    Lockdown: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected cell & hotspot layer
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 25, col: 6 });
  const [activeHotspotLayer, setActiveHotspotLayer] = useState<HeatmapLayerKey>('human_traffic');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dataService.getMapHeatmaps('AmbroseValley'),
      dataService.getMapHeatmaps('GrandRift'),
      dataService.getMapHeatmaps('Lockdown'),
    ])
      .then(([av, gr, ld]) => {
        setAllHeatmaps({
          AmbroseValley: av,
          GrandRift: gr,
          Lockdown: ld,
        });
        const qCell = searchParams.get('cell');
        if (qCell) {
          const [r, c] = qCell.split(',').map(Number);
          if (!isNaN(r) && !isNaN(c)) setSelectedCell({ row: r, col: c });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load heatmap data'))
      .finally(() => setLoading(false));
  }, []);

  const heatmaps = allHeatmaps[selectedMap];
  const gridSize = heatmaps?.grid_size || 64;

  // Selected cell metrics
  const cellUV = useMemo(() => gridCellToUVBounds(selectedCell.row, selectedCell.col, gridSize), [selectedCell, gridSize]);
  const cellWorld = useMemo(() => gridCellToWorldBounds(selectedCell.row, selectedCell.col, selectedMap, gridSize), [selectedCell, selectedMap, gridSize]);

  const layerKeys: HeatmapLayerKey[] = [
    'human_traffic',
    'bot_traffic',
    'loot',
    'bot_kill',
    'bot_killed',
    'killed_by_storm',
  ];

  // Cell metrics across all 6 layers
  const cellBreakdown = useMemo(() => {
    if (!heatmaps) return { items: [], totalActivity: 0 };
    let totalAct = 0;
    const items = layerKeys.map((key) => {
      const layer = heatmaps.layers[key];
      const count = layer?.grid[selectedCell.row]?.[selectedCell.col] || 0;
      const totalInMap = layer?.total_points || 1;
      const shareOfMap = Number(((count / totalInMap) * 100).toFixed(2));
      totalAct += count;
      return {
        key,
        info: LAYER_THEME_COLORS[key],
        count,
        totalInMap,
        shareOfMap,
        isActive: count > 0,
      };
    });
    return { items, totalActivity: totalAct };
  }, [heatmaps, selectedCell]);

  // Ranked hotspots for active hotspot layer
  const hotspots: HotspotCell[] = useMemo(() => {
    if (!heatmaps) return [];
    const layer = heatmaps.layers[activeHotspotLayer];
    return extractTopHotspots(layer?.grid || [], selectedMap, 8, gridSize);
  }, [heatmaps, activeHotspotLayer, selectedMap, gridSize]);

  const activeLayerTotal = heatmaps?.layers[activeHotspotLayer]?.total_points || 1;

  // Jump to Map Explorer with heatmap active on that cell
  const handleFocusOnMap = (row: number, col: number) => {
    navigate(`/map-explorer?map=${selectedMap}&heatmap=1&cell=${row},${col}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080B11] text-[#F8FAFC]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#1E293B] bg-[#0E131F] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider font-mono text-slate-100 uppercase">
              Region Intelligence & Sector Density
            </h1>
            <p className="text-xs text-slate-400">
              Granular 64×64 spatial partition analytics, layer-specific rankings, and cross-map comparisons.
            </p>
          </div>
        </div>

        {/* Map Selector Pills */}
        <div className="flex items-center bg-[#151D2E] border border-[#1E293B] rounded-lg p-0.5 text-xs font-mono">
          {(['AmbroseValley', 'GrandRift', 'Lockdown'] as MapId[]).map((mId) => (
            <button
              key={mId}
              type="button"
              onClick={() => setSelectedMap(mId)}
              className={`px-3 py-1.5 rounded transition-all font-semibold ${
                selectedMap === mId
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mId === 'AmbroseValley' ? 'Ambrose Valley' : mId === 'GrandRift' ? 'Grand Rift' : 'Lockdown'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Top Grid: Interactive Sector Inspector & Cell Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Mini 64x64 Grid Visualizer (Left - 5 Cols) */}
          <div className="lg:col-span-5 bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 space-y-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                <Grid className="w-4 h-4 text-amber-400" />
                64×64 Grid Matrix
              </span>
              <span className="text-slate-400 text-[10px]">
                Click cell to inspect
              </span>
            </div>

            {/* Matrix Viewport Canvas */}
            <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#1E293B] bg-[#0E131F]">
              <canvas
                id="region-grid-canvas"
                width={384}
                height={selectedMap === 'GrandRift' ? 383 : 384}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickY = e.clientY - rect.top;
                  const col = Math.min(63, Math.max(0, Math.floor((clickX / rect.width) * 64)));
                  const row = Math.min(63, Math.max(0, Math.floor((clickY / rect.height) * 64)));
                  setSelectedCell({ row, col });
                }}
                ref={(canvas) => {
                  if (!canvas || !heatmaps) return;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.clearRect(0, 0, canvas.width, canvas.height);

                  const layer = heatmaps.layers[activeHotspotLayer];
                  const maxC = layer?.max_cell_count || 1;
                  const cellW = canvas.width / 64;
                  const cellH = canvas.height / 64;

                  // Render density pixels
                  for (let r = 0; r < 64; r++) {
                    for (let c = 0; c < 64; c++) {
                      const val = layer?.grid[r]?.[c] || 0;
                      if (val > 0) {
                        const intensity = Math.sqrt(val / maxC);
                        const [red, green, blue, alpha] = getThermalColor(intensity, 0.9);
                        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
                        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
                      }
                    }
                  }

                  // Selected cell box
                  ctx.strokeStyle = '#F59E0B';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(selectedCell.col * cellW, selectedCell.row * cellH, cellW * 2, cellH * 2);
                }}
                className="w-full h-full cursor-crosshair block"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-[#0A0D15]/90 border border-[#1E293B] text-[9px] font-mono text-amber-400">
                Active: {LAYER_THEME_COLORS[activeHotspotLayer].label}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
              <span>Selected: [Row {selectedCell.row}, Col {selectedCell.col}]</span>
              <button
                type="button"
                onClick={() => handleFocusOnMap(selectedCell.row, selectedCell.col)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-sans"
              >
                <span>Focus in Map Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Selected Cell Detailed Telemetry Card (Right - 7 Cols) */}
          <div className="lg:col-span-7 bg-[#0B0F17] border border-[#1E293B] rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold font-mono text-slate-100 uppercase">
                      Sector Telemetry [{selectedCell.row}, {selectedCell.col}]
                    </h2>
                    <span className="text-xs text-slate-400 font-sans">
                      {selectedMap} • Uniform 64×64 Grid Partition
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleFocusOnMap(selectedCell.row, selectedCell.col)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-sans font-medium transition-colors flex items-center gap-1.5 shadow"
                >
                  <span>Focus in Map Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Spatial Bounds Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#121826] border border-[#1E293B] rounded-lg p-2.5 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-cyan-400" />
                    World Coordinate Bounds (m)
                  </span>
                  <div className="text-slate-200 space-y-0.5 text-[11px]">
                    <div>X: [{cellWorld.xMin}, {cellWorld.xMax}]</div>
                    <div>Z: [{cellWorld.zMin}, {cellWorld.zMax}]</div>
                  </div>
                </div>

                <div className="bg-[#121826] border border-[#1E293B] rounded-lg p-2.5 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    Normalized UV Bounds
                  </span>
                  <div className="text-slate-200 space-y-0.5 text-[11px]">
                    <div>U: [{cellUV.uMin.toFixed(3)}, {cellUV.uMax.toFixed(3)}]</div>
                    <div>V: [{cellUV.vMin.toFixed(3)}, {cellUV.vMax.toFixed(3)}]</div>
                  </div>
                </div>
              </div>

              {/* 6 Layer Breakdown Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Layer-Specific Activity in Sector</span>
                  <span className="text-amber-400 font-bold">
                    Aggregated Pings: {cellBreakdown.totalActivity?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="divide-y divide-[#1A2333] border border-[#1E293B] rounded-lg overflow-hidden bg-[#121826] text-xs font-mono">
                  {cellBreakdown.items?.map((item) => (
                    <div
                      key={item.key}
                      className="px-3 py-2 flex items-center justify-between hover:bg-[#182338] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.info.hex }}
                        />
                        <span className="text-slate-200 font-sans font-medium">{item.info.label}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                          item.isActive ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-600 bg-slate-900'
                        }`}>
                          {item.isActive ? 'Active' : 'Empty'}
                        </span>
                        <span className="font-bold text-slate-100 min-w-14 text-right">
                          {item.count.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[10px] w-14 text-right">
                          {item.shareOfMap}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono leading-tight bg-[#0A0D15] p-2.5 rounded-lg border border-[#1A2333]">
              * Aggregated pings represent total periodic movement samples and discrete event interaction logs recorded in this 14m × 14m sector across 5 days.
            </div>
          </div>
        </div>

        {/* Layer-Specific Top Hotspots Table */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-3.5 border-b border-[#1E293B] bg-[#0E1420] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Ranked Hotspots Analysis — {selectedMap}
              </h2>
              <p className="text-[11px] text-slate-400">
                Sectors with the highest concentration of telemetry activity.
              </p>
            </div>

            {/* Hotspot Layer Selector Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {layerKeys.map((key) => {
                const info = LAYER_THEME_COLORS[key];
                const isSelected = activeHotspotLayer === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveHotspotLayer(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                        : 'bg-[#121826] border-[#1E293B] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0A0D15] text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-2.5">Rank</th>
                  <th className="px-4 py-2.5">Grid Sector</th>
                  <th className="px-4 py-2.5">World Coordinate Box [X, Z]</th>
                  <th className="px-4 py-2.5">UV Bounds</th>
                  <th className="px-4 py-2.5 text-right">Raw Activity Count</th>
                  <th className="px-4 py-2.5 text-right">% of Map Layer Total</th>
                  <th className="px-6 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161F30]">
                {hotspots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No active hotspots recorded for this layer.
                    </td>
                  </tr>
                ) : (
                  hotspots.map((h) => {
                    const share = ((h.count / activeLayerTotal) * 100).toFixed(2);
                    const isSelected = selectedCell.row === h.row && selectedCell.col === h.col;
                    return (
                      <tr
                        key={`${h.row}-${h.col}`}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-950/20 ring-1 ring-amber-500/40' : 'hover:bg-[#121A2A]'
                        }`}
                        onClick={() => setSelectedCell({ row: h.row, col: h.col })}
                      >
                        <td className="px-6 py-2 font-bold text-amber-400">
                          #{h.rank}
                        </td>
                        <td className="px-4 py-2 text-slate-200 font-sans font-semibold">
                          Sector [{h.row}, {h.col}]
                        </td>
                        <td className="px-4 py-2 text-slate-300 text-[11px]">
                          [{h.worldBounds.xMin}, {h.worldBounds.zMin}]
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-[11px]">
                          [{h.uvBounds.uMin.toFixed(2)}, {h.uvBounds.vMin.toFixed(2)}]
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-100">
                          {h.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-amber-400">
                          {share}%
                        </td>
                        <td className="px-6 py-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFocusOnMap(h.row, h.col);
                            }}
                            className="px-2.5 py-1 rounded bg-[#1A2234] hover:bg-[#25324A] text-cyan-400 text-[11px] font-sans font-medium transition-colors border border-[#2D3B55]"
                          >
                            Focus on Map
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-Map Regional Comparisons Section */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Cross-Map Comparative Territorial Metrics
              </h2>
              <p className="text-[11px] text-slate-400">
                Comparing grid coverage and activity density across Ambrose Valley, Grand Rift, and Lockdown.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {(['AmbroseValley', 'GrandRift', 'Lockdown'] as MapId[]).map((mId) => {
              const hm = allHeatmaps[mId];
              const hLayer = hm?.layers.human_traffic;
              const cov = calculateCoverage(hLayer?.grid || [], hm?.grid_size || 64);

              // Compute multi-layer union active cells
              const gSize = hm?.grid_size || 64;
              let unionActive = 0;
              if (hm?.layers) {
                const layers = Object.values(hm.layers);
                for (let r = 0; r < gSize; r++) {
                  for (let c = 0; c < gSize; c++) {
                    if (layers.some((l) => (l.grid?.[r]?.[c] || 0) > 0)) {
                      unionActive++;
                    }
                  }
                }
              }
              const unionCoveragePercent = Number(((unionActive / (gSize * gSize)) * 100).toFixed(2));

              return (
                <div key={mId} className="bg-[#121826] border border-[#1E293B] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-100 font-sans">{mId}</strong>
                    <span className="text-[10px] text-slate-400">
                      {mId === 'GrandRift' ? '2048×2046 (Non-Square)' : '2048×2048'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between" title="Active sectors with human movement samples (> 0)">
                      <span className="text-slate-400">Human Traffic Coverage:</span>
                      <span className="text-cyan-400 font-bold">{cov.coveragePercent}%</span>
                    </div>
                    <div className="flex justify-between" title="Active sectors with any telemetry across all 6 layers">
                      <span className="text-slate-400">Union Footprint (6 Layers):</span>
                      <span className="text-emerald-400 font-bold">{unionCoveragePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Occupied Sectors:</span>
                      <span>{cov.activeCells.toLocaleString()} / 4,096</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peak Sector Pings:</span>
                      <span className="text-amber-400 font-bold">{cov.maxCellCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Human Traffic Pings:</span>
                      <span>{hLayer?.total_points?.toLocaleString() ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spatial Coverage Mathematical Definition */}
          <div className="text-[11px] text-slate-300 leading-relaxed bg-[#0A0D15] p-4 rounded-xl border border-[#1A2333] space-y-2.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-xs">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              Spatial Coverage Mathematical Definition
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-slate-400">
              <div className="bg-[#121826] p-2.5 rounded-lg border border-[#1E293B]">
                <strong className="text-slate-200 block mb-1">Numerator:</strong>
                Count of grid sectors where recorded event count &gt; 0 in the designated layer(s).
              </div>
              <div className="bg-[#121826] p-2.5 rounded-lg border border-[#1E293B]">
                <strong className="text-slate-200 block mb-1">Denominator:</strong>
                Fixed 4,096 total sectors (64×64 uniform spatial partition matrix).
              </div>
              <div className="bg-[#121826] p-2.5 rounded-lg border border-[#1E293B]">
                <strong className="text-slate-200 block mb-1">Layer Scope:</strong>
                Calculated separately for Human Traffic (movement corridor footprint) and Multi-Layer Union (any telemetry across 6 layers).
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              <strong>Data Traceability Note:</strong> Grid cells do not represent unique players. Counts are cumulative telemetry samples recorded over 5 days of Nakama match sessions. Normalization is strictly visualization-side; all analytical calculations preserve exact source integer counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
