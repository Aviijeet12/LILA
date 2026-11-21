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
    <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
      {/* Coordinate Readout */}
      {cursorCoords && (
        <div className="bg-[#0E131F]/90 backdrop-blur-md border border-[#1E293B] rounded px-2.5 py-1 text-[10px] font-mono text-[#94A3B8] shadow-lg pointer-events-auto">
          <span>X: <strong className="text-[#F8FAFC]">{cursorCoords.x.toFixed(1)}</strong> </span>
          <span>Z: <strong className="text-[#F8FAFC]">{cursorCoords.z.toFixed(1)}</strong> </span>
          <span className="text-[#64748B]">· UV ({cursorCoords.u.toFixed(3)}, {cursorCoords.v.toFixed(3)})</span>
        </div>
      )}

      {/* Button Cluster */}
      <div className="bg-[#0E131F]/90 backdrop-blur-md border border-[#1E293B] rounded-lg shadow-xl p-1 flex items-center gap-1 pointer-events-auto">
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1.5 rounded text-[#94A3B8] hover:text-[#00E5FF] hover:bg-[#151D2E] transition-colors"
        >
          <ZoomIn size={15} />
        </button>

        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded text-[#94A3B8] hover:text-[#00E5FF] hover:bg-[#151D2E] transition-colors"
        >
          <ZoomOut size={15} />
        </button>

        <div className="px-1.5 py-0.5 text-[10px] font-mono text-[#64748B] select-none min-w-[42px] text-center border-x border-[#1E293B]">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={onFitMap}
          title="Fit Map to View"
          className="p-1.5 rounded text-[#94A3B8] hover:text-[#00E5FF] hover:bg-[#151D2E] transition-colors"
        >
          <Maximize2 size={15} />
        </button>

        <button
          onClick={onReset}
          title="Reset View"
          className="p-1.5 rounded text-[#94A3B8] hover:text-[#00E5FF] hover:bg-[#151D2E] transition-colors"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
};
