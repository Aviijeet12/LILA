import React, { useEffect, useRef } from 'react';
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

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw minimap raster
    if (imgRef.current && imgRef.current.complete) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#0E131F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Subtle dark tint over terrain to make combat dots pop
    ctx.fillStyle = 'rgba(10, 14, 23, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Filter events for this map
    const mapEvents = events.filter((e) => e.map_id === mapId);

    // Plot combat events as luminous dots
    for (const ev of mapEvents) {
      const { px, py } = worldToMapPixel(ev.x, ev.z, mapId, canvas.width, canvas.height);
      const isSelected = selectedEvent === ev;
      const style = EVENT_STYLES[ev.event] ?? { color: '#F43F5E', radius: 4 };

      ctx.save();
      if (isSelected) {
        // Glowing halo for selected event
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = style.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [mapId, events, selectedEvent]);

  // Click handler to select nearest event on preview
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const mapEvents = events.filter((ev) => ev.map_id === mapId);
    let nearest: DiscreteEvent | null = null;
    let minDistSq = 12 * 12; // 12px radius

    for (const ev of mapEvents) {
      const { px, py } = worldToMapPixel(ev.x, ev.z, mapId, canvas.width, canvas.height);
      const distSq = (clickX - px) ** 2 + (clickY - py) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = ev;
      }
    }

    if (nearest) {
      onSelectEvent(nearest);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-[#0E131F] flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={480}
        height={mapId === 'GrandRift' ? 479 : 480}
        onClick={handleClick}
        className="w-full h-auto cursor-crosshair block"
      />
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#0A0D15]/90 border border-[#1E293B] text-[10px] font-mono text-slate-300">
        {mapId} • {events.filter((e) => e.map_id === mapId).length} Combat Events
      </div>
    </div>
  );
};
