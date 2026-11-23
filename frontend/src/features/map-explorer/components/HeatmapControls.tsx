import React from 'react';
import {
  Flame,
  Layers,
  Sliders,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MapHeatmaps } from '../../../types/telemetry';
import {
  HeatmapConfig,
  HeatmapLayerKey,
  LAYER_THEME_COLORS,
} from '../utils/heatmapRenderer';

interface HeatmapControlsProps {
  heatmaps: MapHeatmaps | null;
  config: HeatmapConfig;
  onChangeConfig: (newConfig: HeatmapConfig) => void;
  onOpenAnalytics: () => void;
}

export const HeatmapControls: React.FC<HeatmapControlsProps> = ({
  heatmaps,
  config,
  onChangeConfig,
  onOpenAnalytics,
}) => {
  const toggleEnabled = () => {
    onChangeConfig({ ...config, enabled: !config.enabled });
  };

  const toggleLayer = (layer: HeatmapLayerKey) => {
    const updated = {
      ...config.activeLayers,
      [layer]: !config.activeLayers[layer],
    };
    onChangeConfig({ ...config, activeLayers: updated });
  };

  const setAllLayers = (enable: boolean) => {
    const updated = {
      human_traffic:   enable,
      bot_traffic:     enable,
      loot:            enable,
      bot_kill:        enable,
      bot_killed:      enable,
      killed_by_storm: enable,
    };
    onChangeConfig({ ...config, activeLayers: updated });
  };

  const setOpacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({ ...config, opacity: parseFloat(e.target.value) });
  };

  const activeLayerKeys = (Object.keys(config.activeLayers) as HeatmapLayerKey[]).filter(
    (k) => config.activeLayers[k]
  );

  // Compute highest cell count among active layers for legend
  let maxActiveCount = 0;
  if (heatmaps) {
    for (const key of activeLayerKeys) {
      const layer = heatmaps.layers[key];
      if (layer && layer.max_cell_count > maxActiveCount) {
        maxActiveCount = layer.max_cell_count;
      }
    }
  }

  return (
    <div className="bg-[#111111] border border-[#292929] rounded-xl p-3.5 space-y-3.5">
      {/* Header and Master Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "p-1.5 rounded-lg transition-colors",
            config.enabled ? "bg-amber-500/20 text-amber-400" : "bg-[#292929] text-slate-400"
          )}>
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Spatial Heatmap
            </h3>
            <span className="text-[10px] text-slate-400">64×64 Telemetry Density</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="px-2 py-1 text-[10px] font-medium bg-[#292929] hover:bg-[#383838] text-cyan-400 hover:text-cyan-300 rounded border border-[#334155] transition-colors"
            title="Open comprehensive spatial metrics dashboard"
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={toggleEnabled}
            className={clsx(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border",
              config.enabled
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-[#191919] border-[#383838] text-slate-400 hover:text-slate-200"
            )}
          >
            {config.enabled ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Active
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Disabled
              </>
            )}
          </button>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Layer Selection Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Density Layers ({activeLayerKeys.length}/6)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllLayers(true)}
                  className="text-[10px] hover:text-cyan-400 transition-colors"
                >
                  All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setAllLayers(false)}
                  className="text-[10px] hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(LAYER_THEME_COLORS) as HeatmapLayerKey[]).map((key) => {
                const info = LAYER_THEME_COLORS[key];
                const isActive = Boolean(config.activeLayers[key]);
                const layerData = heatmaps?.layers[key];
                const totalPoints = layerData?.total_points ?? 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLayer(key)}
                    className={clsx(
                      "flex items-center justify-between px-2 py-1.5 rounded-lg border text-left transition-all",
                      isActive
                        ? "bg-[#191919] border-cyan-500/30 text-slate-100 shadow-sm"
                        : "bg-[#090909] border-[#292929] text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: info.hex }}
                      />
                      <span className="text-[11px] font-medium truncate">
                        {info.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 ml-1">
                      {totalPoints > 999 ? `${(totalPoints / 1000).toFixed(1)}k` : totalPoints}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Opacity & Style */}
          <div className="space-y-2 pt-1 border-t border-[#292929]">
            {/* Opacity slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  Overlay Opacity
                </span>
                <span className="font-mono text-amber-400 text-[10px]">
                  {Math.round(config.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.opacity}
                onChange={setOpacity}
                className="w-full h-1 bg-[#292929] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Render Style & Normalization Toggles */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {/* Style */}
              <div className="bg-[#090909] border border-[#292929] rounded-lg p-1.5 flex items-center justify-between">
                <span className="text-slate-400">Style</span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      renderStyle: config.renderStyle === 'smooth' ? 'grid' : 'smooth',
                    })
                  }
                  className="px-1.5 py-0.5 rounded bg-[#191919] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {config.renderStyle === 'smooth' ? 'Thermal' : 'Grid'}
                </button>
              </div>

              {/* Normalization */}
              <div className="bg-[#090909] border border-[#292929] rounded-lg p-1.5 flex items-center justify-between">
                <span className="text-slate-400">Scale</span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      normalizationMode:
                        config.normalizationMode === 'relative' ? 'absolute' : 'relative',
                    })
                  }
                  className="px-1.5 py-0.5 rounded bg-[#191919] text-amber-400 hover:text-amber-300 font-medium"
                  title={
                    config.normalizationMode === 'relative'
                      ? 'Relative: Normalized to active layer max (highlights rare events)'
                      : 'Absolute: Normalized to dataset peak max'
                  }
                >
                  {config.normalizationMode === 'relative' ? 'Relative' : 'Absolute'}
                </button>
              </div>
            </div>
          </div>

          {/* Visual Heatmap Intensity Legend */}
          <div className="bg-[#090909] border border-[#292929] rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Heatmap Intensity</span>
              <span className="font-mono text-slate-300">
                Peak: {maxActiveCount.toLocaleString()} pts
              </span>
            </div>
            {/* Color ramp gradient */}
            <div
              className="h-2 rounded-full w-full"
              style={{
                background:
                  activeLayerKeys.length === 1
                    ? `linear-gradient(to right, transparent, ${LAYER_THEME_COLORS[activeLayerKeys[0]].hex})`
                    : 'linear-gradient(to right, rgba(0,229,255,0.2), #00E5FF, #10B981, #FBBF24, #EF4444)',
              }}
            />
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>0 (Faint)</span>
              <span>Med (~{Math.round(maxActiveCount * 0.4).toLocaleString()})</span>
              <span>Max ({maxActiveCount.toLocaleString()})</span>
            </div>
          </div>

          {/* Granularity & Scope Disclaimer Notice */}
          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-cyan-950/20 border border-cyan-800/30 text-[10px] text-cyan-300/80">
            <Info className="w-3.5 h-3.5 shrink-0 text-cyan-400 mt-0.5" />
            <p className="leading-tight">
              <strong>Dataset Scope:</strong> 5-day aggregate telemetry. Timeline scrubber applies to replay journeys.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
