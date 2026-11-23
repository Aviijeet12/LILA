import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapId, Journey, DiscreteEvent, HoveredTarget, MapHeatmaps } from '../../../types/telemetry';
import { HeatmapConfig, getOrCreateHeatmapRaster, drawCellHighlight, LAYER_THEME_COLORS, HeatmapLayerKey } from '../utils/heatmapRenderer';
import { mapPixelToGridCell, normalizeIntensity } from '../utils/heatmapMath';
import { ActiveLayers } from '../../../stores/appStore';
import { dataService } from '../../../services/dataService';
import {
  screenToMapPixel,
  mapPixelToWorld,
  findNearbyEvent,
  findNearbyJourney,
} from '../utils/spatialMath';
import {
  renderJourneyPath,
  renderEventMarker,
  isEventLayerActive,
} from '../utils/canvasRenderer';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { TooltipOverlay } from './TooltipOverlay';

const MAP_DIMS: Record<MapId, { w: number; h: number }> = {
  AmbroseValley: { w: 2048, h: 2048 },
  GrandRift:     { w: 2048, h: 2046 },
  Lockdown:      { w: 2048, h: 2048 },
};

interface MapCanvasProps {
  mapId: MapId;
  journeys: Journey[];
  activeLayers: ActiveLayers;
  entityFilter: 'all' | 'human' | 'bot';
  selectedMatchId: string | null;
  selectedJourneyId: string | null;
  playbackTimestamp?: number | null;
  onSelectJourney: (journeyId: string | null) => void;
  heatmaps?: MapHeatmaps | null;
  heatmapConfig?: HeatmapConfig;
  selectedCell?: { row: number; col: number } | null;
  onSelectCell?: (cell: { row: number; col: number } | null) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  mapId,
  journeys,
  activeLayers,
  entityFilter,
  selectedMatchId,
  selectedJourneyId,
  playbackTimestamp,
  onSelectJourney,
  heatmaps,
  heatmapConfig,
  selectedCell,
  onSelectCell,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(0.45);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMoved, setDragMoved] = useState(false);
  const [hovered, setHovered] = useState<HoveredTarget>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; z: number; u: number; v: number } | null>(null);

  const dims = MAP_DIMS[mapId] ?? { w: 2048, h: 2048 };

  // Synchronous camera layout computation: eliminates any 1-second unscaled or misplaced render
  const updateCameraLayout = useCallback((forcedW?: number, forcedH?: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = Math.round(forcedW ?? (rect.width > 0 ? rect.width : 800));
    const h = Math.round(forcedH ?? (rect.height > 0 ? rect.height : 800));
    if (w <= 0 || h <= 0) return;

    setContainerSize({ w, h });

    // 1. If a match is selected and has journey points, frame match bounding box synchronously
    if (selectedMatchId) {
      const matchJourneys = journeys.filter((j) => j.match_id === selectedMatchId);
      if (matchJourneys.length > 0) {
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
        let pointsCount = 0;

        for (const j of matchJourneys) {
          for (const p of j.positions) {
            if (p.u < minU) minU = p.u;
            if (p.u > maxU) maxU = p.u;
            if (p.v < minV) minV = p.v;
            if (p.v > maxV) maxV = p.v;
            pointsCount++;
          }
        }

        if (pointsCount > 0 && isFinite(minU) && isFinite(maxU) && isFinite(minV) && isFinite(maxV)) {
          const pixelMinX = minU * dims.w;
          const pixelMaxX = maxU * dims.w;
          const pixelMinY = (1 - maxV) * dims.h;
          const pixelMaxY = (1 - minV) * dims.h;

          const boxW = Math.max(100, pixelMaxX - pixelMinX);
          const boxH = Math.max(100, pixelMaxY - pixelMinY);
          const centerX = (pixelMinX + pixelMaxX) / 2;
          const centerY = (pixelMinY + pixelMaxY) / 2;

          // Comfortable 18% margin so endpoints, combat emotes, and trajectory lines never clip
          const scaleX = (w * 0.82) / boxW;
          const scaleY = (h * 0.82) / boxH;
          const targetZoom = Math.max(0.05, Math.min(2.5, Math.min(scaleX, scaleY)));

          const targetPanX = w / 2 - centerX * targetZoom;
          const targetPanY = h / 2 - centerY * targetZoom;

          setZoom(targetZoom);
          setPan({ x: targetPanX, y: targetPanY });
          return;
        }
      }
    }

    // 2. Otherwise fit map into container
    const scaleX = w / dims.w;
    const scaleY = h / dims.h;
    const fitZoom = Math.min(scaleX, scaleY) * 0.98;
    const initialPanX = (w - dims.w * fitZoom) / 2;
    const initialPanY = (h - dims.h * fitZoom) / 2;

    setZoom(fitZoom);
    setPan({ x: initialPanX, y: initialPanY });
  }, [dims.w, dims.h, selectedMatchId, journeys]);

  // Synchronous pre-paint camera setup via useLayoutEffect
  useLayoutEffect(() => {
    updateCameraLayout();
  }, [mapId, selectedMatchId, updateCameraLayout]);

  // ResizeObserver on container to maintain camera on window resize
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        updateCameraLayout(width, height);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateCameraLayout]);

  const fitToMap = useCallback(() => {
    updateCameraLayout();
  }, [updateCameraLayout]);

  // Load minimap WebP
  useEffect(() => {
    const img = new Image();
    img.src = dataService.getMinimapUrl(mapId);
    img.onload = () => {
      imgRef.current = img;
      scheduleRender();
    };
    img.onerror = () => {
      imgRef.current = null;
      scheduleRender();
    };
  }, [mapId]);

  // Filtered journeys
  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      if (entityFilter === 'human' && j.entity_type !== 'human') return false;
      if (entityFilter === 'bot' && j.entity_type !== 'bot') return false;
      if (selectedMatchId && j.match_id !== selectedMatchId) return false;
      return true;
    });
  }, [journeys, entityFilter, selectedMatchId]);

  // Selected journey object
  const selectedJourney = useMemo(() => {
    return selectedJourneyId
      ? journeys.find((j) => j.journey_id === selectedJourneyId) ?? null
      : null;
  }, [journeys, selectedJourneyId]);

  // Render loop using requestAnimationFrame
  const animFrameRef = useRef<number | null>(null);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerSize.w <= 0 || containerSize.h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerSize.w * dpr;
    canvas.height = containerSize.h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerSize.w, containerSize.h);

    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw minimap image
    const img = imgRef.current;
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, dims.w, dims.h);
    } else {
      ctx.fillStyle = '#090909';
      ctx.fillRect(0, 0, dims.w, dims.h);
    }

    // 1.5 Draw Heatmap Overlay if enabled
    if (heatmaps && heatmapConfig?.enabled) {
      const raster = getOrCreateHeatmapRaster(heatmaps, heatmapConfig);
      if (raster) {
        ctx.save();
        ctx.imageSmoothingEnabled = heatmapConfig.renderStyle === 'smooth';
        ctx.drawImage(raster, 0, 0, dims.w, dims.h);
        ctx.restore();
      }
    }

    // 1.6 Draw Selected or Hovered Cell Highlights
    if (heatmapConfig?.enabled) {
      if (selectedCell) {
        drawCellHighlight(ctx, selectedCell.row, selectedCell.col, dims.w, dims.h, heatmaps?.grid_size || 64, true);
      }
      if (hovered?.type === 'cell' && (!selectedCell || selectedCell.row !== hovered.row || selectedCell.col !== hovered.col)) {
        drawCellHighlight(ctx, hovered.row, hovered.col, dims.w, dims.h, heatmaps?.grid_size || 64, false);
      }
    }

    // 2. Draw journey trajectory paths
    const hasSelection = Boolean(selectedJourneyId);
    const shouldDrawSpawnPins = selectedMatchId != null || filteredJourneys.length <= 40;

    // Non-selected journeys first
    for (const j of filteredJourneys) {
      if (j.journey_id === selectedJourneyId) continue;
      if (j.entity_type === 'human' && !activeLayers.human_trajectories) continue;
      if (j.entity_type === 'bot' && !activeLayers.bot_trajectories) continue;
      renderJourneyPath(ctx, j, dims.w, dims.h, false, hasSelection, zoom, playbackTimestamp, shouldDrawSpawnPins);
    }

    // Selected journey rendered on top with emphasis
    if (selectedJourney) {
      renderJourneyPath(ctx, selectedJourney, dims.w, dims.h, true, true, zoom, playbackTimestamp, true);
    }

    // 3. Draw discrete events
    // Gather all events to render
    const hoveredEvent = hovered?.type === 'event' ? hovered.event : null;

    for (const j of filteredJourneys) {
      // If a journey is selected, events of other journeys are still rendered but with subdued alpha
      const isThisSelected = j.journey_id === selectedJourneyId;
      if (hasSelection && !isThisSelected) {
        ctx.globalAlpha = 0.25;
      } else {
        ctx.globalAlpha = 1.0;
      }

      for (const ev of j.events ?? []) {
        if (!isEventLayerActive(ev.event, activeLayers)) continue;
        // Temporal filter: hide events that occur in the future relative to playbackTimestamp
        if (playbackTimestamp != null && ev.ts > playbackTimestamp) continue;

        const isHovered = hoveredEvent === ev;
        const isRecent = playbackTimestamp != null && (playbackTimestamp - ev.ts) >= 0 && (playbackTimestamp - ev.ts) <= 4;
        renderEventMarker(ctx, ev, dims.w, dims.h, zoom, isHovered, isRecent);
      }
    }

    ctx.restore();
  }, [
    containerSize,
    pan,
    zoom,
    dims.w,
    dims.h,
    filteredJourneys,
    selectedJourney,
    selectedJourneyId,
    activeLayers,
    hovered,
    playbackTimestamp,
    heatmaps,
    heatmapConfig,
    selectedCell,
  ]);

  const scheduleRender = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(drawScene);
  }, [drawScene]);

  useEffect(() => {
    drawScene();
    scheduleRender();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawScene, scheduleRender]);

  // Native non-passive wheel and gesture listener to intercept wheel events and prevent browser page zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e: WheelEvent) => {
      // Intercept and prevent browser page zoom
      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Detect zoom direction: scroll up / pinch out = zoom in, scroll down / pinch in = zoom out
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoom((prevZoom) => {
        const newZoom = Math.min(14, Math.max(0.6, prevZoom * zoomFactor));
        setPan((prevPan) => {
          const mapX = (mouseX - prevPan.x) / prevZoom;
          const mapY = (mouseY - prevPan.y) / prevZoom;
          return {
            x: mouseX - mapX * newZoom,
            y: mouseY - mapY * newZoom,
          };
        });
        return newZoom;
      });
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    canvas.addEventListener('gesturestart', onGesture, { passive: false });
    canvas.addEventListener('gesturechange', onGesture, { passive: false });
    canvas.addEventListener('gestureend', onGesture, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', onWheelNative);
      canvas.removeEventListener('gesturestart', onGesture);
      canvas.removeEventListener('gesturechange', onGesture);
      canvas.removeEventListener('gestureend', onGesture);
    };
  }, []);

  // Double click to zoom in centered on click position
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const newZoom = Math.min(14, prevZoom * 1.5);
      setPan((prevPan) => {
        const mapX = (clickX - prevPan.x) / prevZoom;
        const mapY = (clickY - prevPan.y) / prevZoom;
        return {
          x: clickX - mapX * newZoom,
          y: clickY - mapY * newZoom,
        };
      });
      return newZoom;
    });
  };

  // Mouse down for pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragMoved(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Mouse move for pan or hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Coordinate readout
    const { mapX, mapY } = screenToMapPixel(mouseX, mouseY, pan.x, pan.y, zoom);
    if (mapX >= 0 && mapX <= dims.w && mapY >= 0 && mapY <= dims.h) {
      const world = mapPixelToWorld(mapX, mapY, mapId, dims.w, dims.h);
      setCursorCoords(world);
    } else {
      setCursorCoords(null);
    }

    if (isDragging) {
      setDragMoved(true);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      setHovered(null);
      return;
    }

    // Hit-testing for hover
    // 1. Check discrete events first
    const activeEvents: DiscreteEvent[] = [];
    for (const j of filteredJourneys) {
      for (const ev of j.events ?? []) {
        if (isEventLayerActive(ev.event, activeLayers)) {
          if (playbackTimestamp == null || ev.ts <= playbackTimestamp) {
            activeEvents.push(ev);
          }
        }
      }
    }

    const nearbyEvent = findNearbyEvent(activeEvents, mapX, mapY, dims.w, dims.h, 9, zoom);
    if (nearbyEvent) {
      setHovered({
        type: 'event',
        event: nearbyEvent,
        screenX: mouseX,
        screenY: mouseY,
        mapX,
        mapY,
      });
      return;
    }

    // 2. Check journeys
    const nearbyJourney = findNearbyJourney(filteredJourneys, mapX, mapY, dims.w, dims.h, 7, zoom);
    if (nearbyJourney) {
      setHovered({
        type: 'journey',
        journey: nearbyJourney.journey,
        point: nearbyJourney.nearestPoint,
        screenX: mouseX,
        screenY: mouseY,
        mapX,
        mapY,
      });
      return;
    }

    // 3. Check heatmap sector hover if heatmap is enabled
    if (heatmapConfig?.enabled && heatmaps && mapX >= 0 && mapX <= dims.w && mapY >= 0 && mapY <= dims.h) {
      const { row, col } = mapPixelToGridCell(mapX, mapY, dims.w, dims.h, heatmaps.grid_size || 64);
      let total = 0;
      let activeCount = 0;
      let maxActive = 0;
      const activeKeys = (Object.keys(heatmapConfig.activeLayers) as HeatmapLayerKey[]).filter(
        (k) => heatmapConfig.activeLayers[k] && heatmaps.layers[k]
      );
      const layerNames: string[] = [];
      for (const k of activeKeys) {
        const l = heatmaps.layers[k];
        const cnt = l?.grid[row]?.[col] || 0;
        if (cnt > 0) {
          total += cnt;
          activeCount += cnt;
          layerNames.push(LAYER_THEME_COLORS[k].label);
        }
        if (l && l.max_cell_count > maxActive) maxActive = l.max_cell_count;
      }

      setHovered({
        type: 'cell',
        row,
        col,
        screenX: mouseX,
        screenY: mouseY,
        mapX,
        mapY,
        mapId,
        cellData: {
          total,
          activeLayerCount: activeCount,
          activeLayerName: layerNames.length > 0 ? layerNames.join(', ') : (activeKeys.length > 0 ? LAYER_THEME_COLORS[activeKeys[0]].label : 'Sector'),
          normalizedIntensity: normalizeIntensity(total, maxActive || 1, 'sqrt'),
        },
      });
      return;
    }

    setHovered(null);
  };

  // Mouse up / click selection
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    if (!dragMoved) {
      // It was a click!
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const { mapX, mapY } = screenToMapPixel(mouseX, mouseY, pan.x, pan.y, zoom);

      // Check event click
      const activeEvents: DiscreteEvent[] = [];
      for (const j of filteredJourneys) {
        for (const ev of j.events ?? []) {
          if (isEventLayerActive(ev.event, activeLayers)) {
            if (playbackTimestamp == null || ev.ts <= playbackTimestamp) {
              activeEvents.push(ev);
            }
          }
        }
      }

      const nearbyEv = findNearbyEvent(activeEvents, mapX, mapY, dims.w, dims.h, 10, zoom);
      if (nearbyEv) {
        // Find journey that owns this event
        const ownerJourney = filteredJourneys.find((j) =>
          j.events?.some((ev) => ev === nearbyEv || (ev.ts === nearbyEv.ts && ev.event === nearbyEv.event))
        );
        if (ownerJourney) {
          onSelectJourney(ownerJourney.journey_id);
          onSelectCell?.(null);
          return;
        }
      }

      // Check journey line click
      const nearbyJ = findNearbyJourney(filteredJourneys, mapX, mapY, dims.w, dims.h, 8, zoom);
      if (nearbyJ) {
        onSelectJourney(nearbyJ.journey.journey_id);
        onSelectCell?.(null);
      } else if (heatmapConfig?.enabled && mapX >= 0 && mapX <= dims.w && mapY >= 0 && mapY <= dims.h) {
        const { row, col } = mapPixelToGridCell(mapX, mapY, dims.w, dims.h, heatmaps?.grid_size || 64);
        onSelectCell?.({ row, col });
        onSelectJourney(null);
      } else {
        // Click on empty space deselects
        onSelectJourney(null);
        onSelectCell?.(null);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHovered(null);
    setCursorCoords(null);
  };

  // Manual zoom buttons
  const handleZoomIn = () => {
    const newZoom = Math.min(14, zoom * 1.3);
    const centerX = containerSize.w / 2;
    const centerY = containerSize.h / 2;
    const mapX = (centerX - pan.x) / zoom;
    const mapY = (centerY - pan.y) / zoom;
    setPan({ x: centerX - mapX * newZoom, y: centerY - mapY * newZoom });
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.6, zoom / 1.3);
    const centerX = containerSize.w / 2;
    const centerY = containerSize.h / 2;
    const mapX = (centerX - pan.x) / zoom;
    const mapY = (centerY - pan.y) / zoom;
    setPan({ x: centerX - mapX * newZoom, y: centerY - mapY * newZoom });
    setZoom(newZoom);
  };

  const handleReset = () => {
    fitToMap();
  };

  return (
    <div
      ref={containerRef}
      style={{ touchAction: 'none' }}
      className="relative w-full h-full min-h-[300px] bg-[#050505] rounded-lg overflow-hidden border border-[#292929] select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'none' }}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : hovered ? 'cursor-pointer' : 'cursor-grab'}`}
      />

      {/* Tactical Quick Zoom Dock (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 bg-[#111111]/95 backdrop-blur-md border border-[#292929] rounded-lg p-1 shadow-2xl">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In (+) - Map Viewport Only"
          aria-label="Zoom In Map"
          className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors font-mono font-bold text-lg select-none"
        >
          +
        </button>
        <div className="w-full h-px bg-[#292929]" />
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out (-) - Map Viewport Only"
          aria-label="Zoom Out Map"
          className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors font-mono font-bold text-lg select-none"
        >
          -
        </button>
        <div className="w-full h-px bg-[#292929]" />
        <button
          type="button"
          onClick={handleReset}
          title="Reset Zoom / Fit Map"
          aria-label="Fit Map"
          className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors font-mono text-[9px] font-bold select-none"
        >
          FIT
        </button>
      </div>

      {/* Floating Legend */}
      <MapLegend />

      {/* Floating Controls */}
      <MapControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitMap={fitToMap}
        onReset={handleReset}
        cursorCoords={cursorCoords}
      />

      {/* Hover Tooltip Overlay */}
      <TooltipOverlay
        hovered={hovered}
        containerWidth={containerSize.w}
        containerHeight={containerSize.h}
      />
    </div>
  );
};
