import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  MapPin,
  Flame,
  Activity,
  Award,
  TrendingUp,
  Info,
  ShieldAlert,
  Compass,
  Crosshair,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { MapId, MapHeatmaps, DiscreteEvent } from '../../types/telemetry';
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
  getOrCreateHeatmapRaster,
} from '../map-explorer/utils/heatmapRenderer';
import { worldToMapPixel } from '../map-explorer/utils/spatialMath';
import { EVENT_STYLES } from '../map-explorer/utils/canvasRenderer';

const MAP_DIMS: Record<MapId, { w: number; h: number }> = {
  AmbroseValley: { w: 2048, h: 2048 },
  GrandRift:     { w: 2048, h: 2046 },
  Lockdown:      { w: 2048, h: 2048 },
};

export const RegionIntelligencePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [selectedMap, setSelectedMap] = useState<MapId>(
    (searchParams.get('map') as MapId) || 'AmbroseValley'
  );
  const [allHeatmaps, setAllHeatmaps] = useState<Record<MapId, MapHeatmaps | null>>({
    AmbroseValley: null,
    GrandRift: null,
    Lockdown: null,
  });
  const [allEvents, setAllEvents] = useState<DiscreteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected cell & layer state
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 25, col: 6 });
  const [activeLayer, setActiveLayer] = useState<HeatmapLayerKey>('human_traffic');
  const [colorMode, setColorMode] = useState<'tactical_layer' | 'thermal_spectrum'>('thermal_spectrum');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.75);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedEventCategory, setSelectedEventCategory] = useState<string>('all');

  // Canvas Viewport pan & zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverCoords, setHoverCoords] = useState<{ row: number; col: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load heatmaps and events data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      dataService.getMapHeatmaps('AmbroseValley'),
      dataService.getMapHeatmaps('GrandRift'),
      dataService.getMapHeatmaps('Lockdown'),
      dataService.getEvents(),
    ])
      .then(([av, gr, ld, evs]) => {
        setAllHeatmaps({
          AmbroseValley: av,
          GrandRift: gr,
          Lockdown: ld,
        });
        setAllEvents(evs);
        const qCell = searchParams.get('cell');
        if (qCell) {
          const [r, c] = qCell.split(',').map(Number);
          if (!isNaN(r) && !isNaN(c)) setSelectedCell({ row: r, col: c });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load spatial telemetry'))
      .finally(() => setLoading(false));
  }, []);

  // Load minimap satellite terrain image
  useEffect(() => {
    const img = new Image();
    img.src = dataService.getMinimapUrl(selectedMap);
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };
  }, [selectedMap]);

  // Reset zoom & pan on map change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedMap]);

  // Native non-passive wheel listener on canvas to prevent full website zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
      setZoom((z) => Math.min(Math.max(1, z * zoomFactor), 4));
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('gesturestart', onGesture, { passive: false });
    canvas.addEventListener('gesturechange', onGesture, { passive: false });
    canvas.addEventListener('gestureend', onGesture, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('gesturestart', onGesture);
      canvas.removeEventListener('gesturechange', onGesture);
      canvas.removeEventListener('gestureend', onGesture);
    };
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
    const layer = heatmaps.layers[activeLayer];
    return extractTopHotspots(layer?.grid || [], selectedMap, 8, gridSize);
  }, [heatmaps, activeLayer, selectedMap, gridSize]);

  const activeLayerTotal = heatmaps?.layers[activeLayer]?.total_points || 1;

  // Filter discrete events for current map and optional category
  const mapEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (e.map_id !== selectedMap) return false;
      if (selectedEventCategory === 'combat') return e.event !== 'Loot';
      if (selectedEventCategory === 'loot') return e.event === 'Loot';
      if (selectedEventCategory !== 'all') return e.event === selectedEventCategory;
      return true;
    });
  }, [allEvents, selectedMap, selectedEventCategory]);

  // Discrete events falling within the selected sector
  const sectorEvents = useMemo(() => {
    return mapEvents.filter((e) => {
      const u = e.u ?? 0;
      const v = e.v ?? 0;
      return u >= cellUV.uMin && u <= cellUV.uMax && v >= cellUV.vMin && v <= cellUV.vMax;
    });
  }, [mapEvents, cellUV]);

  // Check if current selected cell is a ranked hotspot
  const selectedHotspotRank = useMemo(() => {
    const found = hotspots.find((h) => h.row === selectedCell.row && h.col === selectedCell.col);
    return found ? found.rank : null;
  }, [hotspots, selectedCell]);

  // Render canvas with satellite terrain, heatmap raster overlay, and colored events
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw satellite minimap terrain background
    if (imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#080D14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Subtle dark tactical overlay to make heatmap & event points glow
    ctx.fillStyle = 'rgba(8, 13, 20, 0.40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Heatmap Raster Overlay
    if (showHeatmap && heatmaps) {
      const activeLayersConfig = {
        human_traffic: activeLayer === 'human_traffic',
        bot_traffic: activeLayer === 'bot_traffic',
        loot: activeLayer === 'loot',
        bot_kill: activeLayer === 'bot_kill',
        bot_killed: activeLayer === 'bot_killed',
        killed_by_storm: activeLayer === 'killed_by_storm',
      };

      const raster = getOrCreateHeatmapRaster(heatmaps, {
        enabled: true,
        activeLayers: activeLayersConfig,
        opacity: heatmapOpacity,
        normalizationMode: 'relative',
        renderStyle: 'smooth',
        colorMode: colorMode,
      });

      if (raster) {
        ctx.save();
        ctx.globalAlpha = heatmapOpacity;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(raster, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    // 4. Draw Discrete Events with distinct tactical colors
    if (showEvents && mapEvents.length > 0) {
      for (const ev of mapEvents) {
        const { px, py } = worldToMapPixel(ev.x, ev.z, selectedMap, canvas.width, canvas.height);
        const style = EVENT_STYLES[ev.event] ?? { color: '#EF4444' };

        // Check if inside selected cell
        const u = ev.u ?? 0;
        const v = ev.v ?? 0;
        const isInSelected = u >= cellUV.uMin && u <= cellUV.uMax && v >= cellUV.vMin && v <= cellUV.vMax;

        ctx.save();
        if (isInSelected) {
          // Highlighted event inside selected cell
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath();
          ctx.arc(px, py, 5 / zoom, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = style.color;
          ctx.beginPath();
          ctx.arc(px, py, 3.5 / zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = style.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 / zoom, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 5. Draw Selected Sector Highlight Bounding Box
    const cellW = canvas.width / gridSize;
    const cellH = canvas.height / gridSize;
    const selX = selectedCell.col * cellW;
    const selY = selectedCell.row * cellH;

    ctx.save();
    // Fill sector with luminous cyan tint
    ctx.fillStyle = 'rgba(0, 217, 245, 0.22)';
    ctx.fillRect(selX, selY, cellW, cellH);

    // Glowing border
    ctx.strokeStyle = '#00D9F5';
    ctx.lineWidth = Math.max(1.5, 2.2 / zoom);
    ctx.shadowColor = '#00D9F5';
    ctx.shadowBlur = 8;
    ctx.strokeRect(selX, selY, cellW, cellH);

    // Corner reticles for tactical feel
    const cornerSize = Math.min(cellW, cellH) * 0.3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, 1.8 / zoom);

    // Top-left
    ctx.beginPath();
    ctx.moveTo(selX, selY + cornerSize);
    ctx.lineTo(selX, selY);
    ctx.lineTo(selX + cornerSize, selY);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(selX + cellW - cornerSize, selY + cellH);
    ctx.lineTo(selX + cellW, selY + cellH);
    ctx.lineTo(selX + cellW, selY + cellH - cornerSize);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }, [
    selectedMap,
    zoom,
    pan,
    showHeatmap,
    heatmaps,
    activeLayer,
    heatmapOpacity,
    colorMode,
    showEvents,
    mapEvents,
    cellUV,
    gridSize,
    selectedCell,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle map canvas click to select sector
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Invert pan and zoom
    const mapX = (clickX - pan.x) / zoom;
    const mapY = (clickY - pan.y) / zoom;

    const col = Math.min(gridSize - 1, Math.max(0, Math.floor((mapX / canvas.width) * gridSize)));
    const row = Math.min(gridSize - 1, Math.max(0, Math.floor((mapY / canvas.height) * gridSize)));

    setSelectedCell({ row, col });
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const mapX = (clickX - pan.x) / zoom;
      const mapY = (clickY - pan.y) / zoom;
      const col = Math.min(gridSize - 1, Math.max(0, Math.floor((mapX / canvas.width) * gridSize)));
      const row = Math.min(gridSize - 1, Math.max(0, Math.floor((mapY / canvas.height) * gridSize)));
      setHoverCoords({ row, col });
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080B11] text-[#F8FAFC]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#1E293B] bg-[#101925] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider font-mono text-slate-100 uppercase">
              Region Intelligence & Sector Density
            </h1>
            <p className="text-xs text-slate-400">
              Granular 64×64 spatial partition analytics, satellite terrain heatmap overlay, and localized event telemetry.
            </p>
          </div>
        </div>

        {/* Individual Map Selector Pills */}
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
        {/* Top Grid: Interactive Satellite Heatmap Visualizer (Left) + Sector Dossier (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Heatmap Map Canvas (Left - 7 Cols) */}
          <div className="lg:col-span-7 bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 space-y-3 flex flex-col shadow-xl">
            {/* Map Controls Bar */}
            <div className="flex items-center justify-between text-xs font-mono flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Tactical Heatmap Canvas
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-[#162030] px-2 py-0.5 rounded border border-[#1E2B3E]">
                  {selectedMap}
                </span>
              </div>

              {/* Viewport Zoom & Reset Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
                  title="Zoom In"
                  aria-label="Zoom In"
                  className="p-1.5 rounded bg-[#172435] border border-[#1E2B3E] text-slate-300 hover:text-[#00D9F5] hover:bg-[#1E2B3E] transition-colors"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                  className="p-1.5 rounded bg-[#172435] border border-[#1E2B3E] text-slate-300 hover:text-[#00D9F5] hover:bg-[#1E2B3E] transition-colors"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  title="Reset View"
                  aria-label="Reset View"
                  className="p-1.5 rounded bg-[#172435] border border-[#1E2B3E] text-slate-300 hover:text-[#00D9F5] hover:bg-[#1E2B3E] transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
                <span className="text-[10px] text-cyan-400 min-w-[28px] text-center font-mono font-semibold">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Heatmap & Event Overlay Settings Bar */}
            <div className="bg-[#0A101A] border border-[#1A2538] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono flex-wrap gap-2">
              {/* Heatmap Layer Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Layer:</span>
                <select
                  value={activeLayer}
                  onChange={(e) => setActiveLayer(e.target.value as HeatmapLayerKey)}
                  className="bg-[#121A28] border border-[#1E2B3E] rounded px-2 py-1 text-slate-200 text-xs outline-none"
                >
                  {layerKeys.map((k) => (
                    <option key={k} value={k}>
                      {LAYER_THEME_COLORS[k].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thermal Mode Toggle */}
              <div className="flex items-center gap-1 bg-[#121A28] border border-[#1E2B3E] rounded p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setColorMode('thermal_spectrum')}
                  className={`px-2 py-0.5 rounded ${
                    colorMode === 'thermal_spectrum' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  Thermal
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('tactical_layer')}
                  className={`px-2 py-0.5 rounded ${
                    colorMode === 'tactical_layer' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  Monochrome
                </button>
              </div>

              {/* Event Markers Toggle & Category */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEvents(!showEvents)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                    showEvents
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#121A28] text-slate-500 border-[#1E2B3E]'
                  }`}
                >
                  {showEvents ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>Events ({mapEvents.length})</span>
                </button>

                {showEvents && (
                  <select
                    value={selectedEventCategory}
                    onChange={(e) => setSelectedEventCategory(e.target.value)}
                    className="bg-[#121A28] border border-[#1E2B3E] rounded px-2 py-1 text-slate-300 text-xs outline-none"
                  >
                    <option value="all">All Events</option>
                    <option value="combat">Combat Only</option>
                    <option value="loot">Loot Only</option>
                    <option value="BotKill">BotKill</option>
                    <option value="BotKilled">BotKilled</option>
                    <option value="Kill">Kill</option>
                    <option value="KilledByStorm">Storm</option>
                  </select>
                )}
              </div>
            </div>

            {/* Map Canvas Viewport */}
            <div
              style={{ touchAction: 'none' }}
              className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#1E2B3E] bg-[#0A0D15] cursor-crosshair select-none"
            >
              <canvas
                id="region-heatmap-canvas"
                ref={canvasRef}
                width={512}
                height={selectedMap === 'GrandRift' ? 511 : 512}
                style={{ touchAction: 'none' }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full block"
              />

              {/* Hover Coordinates Badge */}
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-[#0A0D15]/90 border border-[#1E293B] text-[10px] font-mono text-slate-300 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">
                  Cursor: [{hoverCoords ? `R${hoverCoords.row}, C${hoverCoords.col}` : 'Hover map'}]
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-amber-400">
                  Selected: [Row {selectedCell.row}, Col {selectedCell.col}]
                </span>
              </div>

              {/* Event Color Legend Overlay */}
              {showEvents && (
                <div className="absolute bottom-2 left-2 bg-[#0A0D15]/95 border border-[#1E2B3E] rounded-lg p-2 text-[10px] font-mono flex items-center gap-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
                    <span className="text-slate-300">Loot</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    <span className="text-slate-300">Kill</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                    <span className="text-slate-300">BotKill</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                    <span className="text-slate-300">BotKilled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#818CF8]" />
                    <span className="text-slate-300">Storm</span>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Footer Status */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1">
              <span>Selected Sector: [Row {selectedCell.row}, Col {selectedCell.col}]</span>
              <span className="text-slate-400">Click anywhere on the map or drag to pan</span>
            </div>
          </div>

          {/* Selected Sector Comprehensive Dossier (Right - 5 Cols) */}
          <div className="lg:col-span-5 bg-[#0B0F17] border border-[#1E293B] rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Sector Header */}
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-[#00D9F5] border border-cyan-500/30">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold font-mono text-slate-100 uppercase">
                        Sector Telemetry [{selectedCell.row}, {selectedCell.col}]
                      </h2>
                      {selectedHotspotRank && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
                          #{selectedHotspotRank} Hotspot
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-sans">
                      {selectedMap} • 64×64 Spatial Partition (~14m² sector)
                    </span>
                  </div>
                </div>
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

              {/* 6 Layer Activity Breakdown Table */}
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

              {/* Local Discrete Events inside Sector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    Discrete Events in Sector
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-[#00D9F5] border border-cyan-800/40 font-bold">
                    {sectorEvents.length} recorded
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                  {sectorEvents.length === 0 ? (
                    <div className="bg-[#0A0D15] p-3 rounded-lg border border-[#1A2333] text-center text-slate-500 text-xs">
                      No discrete interaction events recorded in this 14m² sector.
                    </div>
                  ) : (
                    sectorEvents.slice(0, 8).map((ev, i) => {
                      const style = EVENT_STYLES[ev.event] ?? { color: '#EF4444' };
                      return (
                        <div
                          key={`${ev.match_id}_${ev.ts}_${i}`}
                          className="bg-[#0A0D15] p-2 rounded-lg border border-[#1A2333] flex items-center justify-between hover:border-cyan-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                            <span className="font-bold" style={{ color: style.color }}>
                              {ev.event}
                            </span>
                            <span className="text-slate-400 truncate max-w-[110px]" title={ev.user_id}>
                              {ev.user_id}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px]">
                            {ev.iso ? ev.iso.slice(11, 19) : `${ev.ts}s`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono leading-tight bg-[#0A0D15] p-2.5 rounded-lg border border-[#1A2333]">
              * Aggregated pings represent total periodic movement samples and discrete event interaction logs recorded in this sector across the 5-day deployment.
            </div>
          </div>
        </div>

        {/* Layer-Specific Top Hotspots Table (Clicking row selects sector directly) */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-3.5 border-b border-[#1E293B] bg-[#0E1420] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Ranked Hotspots Analysis — {selectedMap}
              </h2>
              <p className="text-[11px] text-slate-400">
                Sectors with the highest concentration of telemetry activity. Click any row to focus on the map above.
              </p>
            </div>

            {/* Hotspot Layer Selector Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {layerKeys.map((key) => {
                const info = LAYER_THEME_COLORS[key];
                const isSelected = activeLayer === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveLayer(key)}
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
                  <th className="px-6 py-2.5 text-center">Status</th>
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
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected ? 'bg-amber-950/30 ring-1 ring-amber-500/50' : 'hover:bg-[#121A2A]'
                        }`}
                        onClick={() => setSelectedCell({ row: h.row, col: h.col })}
                      >
                        <td className="px-6 py-2.5 font-bold text-amber-400">
                          #{h.rank}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200 font-sans font-semibold">
                          Sector [{h.row}, {h.col}]
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 text-[11px]">
                          [{h.worldBounds.xMin}, {h.worldBounds.zMin}] to [{h.worldBounds.xMax}, {h.worldBounds.zMax}]
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                          [{h.uvBounds.uMin.toFixed(2)}, {h.uvBounds.vMin.toFixed(2)}]
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-100">
                          {h.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">
                          {share}%
                        </td>
                        <td className="px-6 py-2.5 text-center">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[#00D9F5] border border-cyan-500/40 text-[10px] font-semibold">
                              Inspecting
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] hover:text-slate-300">
                              Click to select
                            </span>
                          )}
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
