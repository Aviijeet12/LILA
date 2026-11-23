import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { MapId, DiscreteEvent } from '../../../types/telemetry';
import { dataService } from '../../../services/dataService';
import { worldToMapPixel } from '../../map-explorer/utils/spatialMath';
import { EVENT_STYLES } from '../../map-explorer/utils/canvasRenderer';

interface CombatMapPreviewProps {
  mapId: MapId;
  events: DiscreteEvent[];
  selectedEvent: DiscreteEvent | null;
  onSelectEvent: (event: DiscreteEvent) => void;
}

const MAP_DIMS: Record<MapId, { w: number; h: number }> = {
  AmbroseValley: { w: 2048, h: 2048 },
  GrandRift:     { w: 2048, h: 2046 },
  Lockdown:      { w: 2048, h: 2048 },
};

export const CombatMapPreview: React.FC<CombatMapPreviewProps> = ({
  mapId,
  events,
  selectedEvent,
  onSelectEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  const dims = MAP_DIMS[mapId] ?? { w: 2048, h: 2048 };

  // Load minimap background image
  useEffect(() => {
    const img = new Image();
    img.src = dataService.getMinimapUrl(mapId);
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
  }, [mapId]);

  // Reset zoom on map switch
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [mapId]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw minimap raster
    if (imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Subtle dark tint over terrain to make combat dots pop
    ctx.fillStyle = 'rgba(8, 13, 20, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Filter events for this map
    const mapEvents = events.filter((e) => e.map_id === mapId);

    // Plot combat events as luminous dots
    for (const ev of mapEvents) {
      const { px, py } = worldToMapPixel(ev.x, ev.z, mapId, canvas.width, canvas.height);
      const isSelected = selectedEvent === ev;
      const style = EVENT_STYLES[ev.event] ?? { color: '#EF4444', radius: 4 };

      ctx.save();
      if (isSelected) {
        // Glowing halo for selected event
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 10 / zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(px, py, 6 / zoom, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(px, py, 4 / zoom, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = style.color;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.arc(px, py, 3.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [mapId, events, selectedEvent, zoom, pan]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.3, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev / 1.3, 0.8);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Native non-passive wheel and gesture listener to intercept wheel events and prevent browser page zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => {
        const next = Math.min(Math.max(prev * factor, 0.8), 5);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
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

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setHasMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setHasMoved(true);
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (!hasMoved) {
      // Handle click selection on nearest event
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Transform click from screen coordinates to canvas map pixel
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const targetCanvasX = (clickX * scaleX - pan.x) / zoom;
      const targetCanvasY = (clickY * scaleY - pan.y) / zoom;

      const mapEvents = events.filter((ev) => ev.map_id === mapId);
      let nearest: DiscreteEvent | null = null;
      let minDistSq = (14 / zoom) ** 2;

      for (const ev of mapEvents) {
        const { px, py } = worldToMapPixel(ev.x, ev.z, mapId, canvas.width, canvas.height);
        const distSq = (targetCanvasX - px) ** 2 + (targetCanvasY - py) ** 2;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearest = ev;
        }
      }

      if (nearest) {
        onSelectEvent(nearest);
      }
    }
  };

  return (
    <div
      style={{ touchAction: 'none' }}
      className="relative rounded-xl overflow-hidden border border-[#292929] bg-[#111111] flex items-center justify-center select-none shadow-md max-h-60"
    >
      <canvas
        ref={canvasRef}
        width={480}
        height={mapId === 'GrandRift' ? 479 : 480}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        style={{ touchAction: 'none' }}
        className={`w-full max-h-60 object-contain block ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      />

      {/* Floating Tactical Zoom In / Out Buttons */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-[#111111]/90 backdrop-blur-md border border-[#292929] rounded-lg p-1 shadow-xl">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors font-mono text-[11px] font-semibold"
        >
          <ZoomIn size={13} className="text-[#00D9F5]" />
          <span>Zoom In</span>
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors font-mono text-[11px] font-semibold"
        >
          <ZoomOut size={13} className="text-[#00D9F5]" />
          <span>Zoom Out</span>
        </button>

        <div className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 select-none min-w-[38px] text-center border-x border-[#292929]">
          {Math.round(zoom * 100)}%
        </div>

        <button
          type="button"
          onClick={handleResetZoom}
          title="Reset Zoom"
          aria-label="Reset Zoom"
          className="p-1 rounded text-slate-400 hover:text-[#00D9F5] hover:bg-[#191919] transition-colors"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Map Metadata Pill */}
      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-[#050505]/90 border border-[#292929] text-[10px] font-mono text-slate-300 shadow-md">
        <span>{mapId === 'AmbroseValley' ? 'Ambrose Valley' : mapId === 'GrandRift' ? 'Grand Rift' : 'Lockdown'}</span>
        <span className="text-slate-500 mx-1.5">•</span>
        <span className="text-[#00D9F5]">{events.filter((e) => e.map_id === mapId).length} Combat Events</span>
      </div>
    </div>
  );
};
