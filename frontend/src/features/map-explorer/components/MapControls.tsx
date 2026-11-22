import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitMap: () => void;
  onReset: () => void;
  cursorCoords: { x: number; z: number; u: number; v: number } | null;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitMap,
  onReset,
  cursorCoords,
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* Coordinate Readout HUD */}
      {cursorCoords && (
        <div className="bg-[#101925]/90 backdrop-blur-md border border-[#1E2B3E] rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 shadow-lg pointer-events-auto flex items-center gap-2">
          <span>X: <strong className="text-white">{cursorCoords.x.toFixed(1)}</strong></span>
          <span>Z: <strong className="text-white">{cursorCoords.z.toFixed(1)}</strong></span>
          <span className="text-slate-500">UV ({cursorCoords.u.toFixed(3)}, {cursorCoords.v.toFixed(3)})</span>
        </div>
      )}

      {/* Tactical Zoom & Navigation HUD Cluster */}
      <div className="bg-[#101925]/95 backdrop-blur-md border border-[#1E2B3E] rounded-lg shadow-2xl p-1 flex items-center gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="flex items-center gap-1 px-2 py-1.5 rounded text-slate-300 hover:text-[#00D9F5] hover:bg-[#172435] transition-colors font-mono text-xs font-semibold"
        >
          <ZoomIn size={14} className="text-[#00D9F5]" />
          <span>Zoom In</span>
        </button>

        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          className="flex items-center gap-1 px-2 py-1.5 rounded text-slate-300 hover:text-[#00D9F5] hover:bg-[#172435] transition-colors font-mono text-xs font-semibold"
        >
          <ZoomOut size={14} className="text-[#00D9F5]" />
          <span>Zoom Out</span>
        </button>

        <div className="px-2 py-1 text-[11px] font-mono text-slate-400 select-none min-w-[48px] text-center border-x border-[#1E2B3E]">
          {Math.round(zoom * 100)}%
        </div>

        <button
          type="button"
          onClick={onFitMap}
          title="Fit Map to View"
          aria-label="Fit Map to View"
          className="p-1.5 rounded text-slate-400 hover:text-[#00D9F5] hover:bg-[#172435] transition-colors"
        >
          <Maximize2 size={14} />
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset View"
          aria-label="Reset View"
          className="p-1.5 rounded text-slate-400 hover:text-[#00D9F5] hover:bg-[#172435] transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
