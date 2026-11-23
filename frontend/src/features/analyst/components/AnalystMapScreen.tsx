import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { dataService } from '../../../services/dataService';
import type { MapId, MapHeatmaps } from '../../../types/telemetry';
import type { AnalyticalResult } from '../types/analyst';
import { MapCanvas } from '../../map-explorer/components/MapCanvas';
import type { HeatmapConfig, HeatmapLayerKey } from '../../map-explorer/utils/heatmapRenderer';
import type { ActiveLayers } from '../../../stores/appStore';

const NO_TRAJECTORIES: ActiveLayers = {
  human_trajectories: false, bot_trajectories: false, loot: false, bot_kill: false,
  bot_killed: false, killed_by_storm: false, kill: false, killed: false,
};

function getVisibleLayers(result: AnalyticalResult): HeatmapLayerKey[] {
  switch (result.intent) {
    case 'human_traffic_hotspots': return ['human_traffic'];
    case 'bot_traffic_hotspots': return ['bot_traffic'];
    case 'loot_hotspots': return ['loot'];
    case 'storm_deaths_summary': return ['killed_by_storm'];
    case 'human_vs_bot_traffic': return ['human_traffic', 'bot_traffic'];
    case 'loot_vs_human_traffic': return ['human_traffic', 'loot'];
    case 'combat_event_distribution': {
      const category = result.filtersApplied.category;
      const categoryLayers: Record<string, HeatmapLayerKey> = {
        BotKill: 'bot_kill', BotKilled: 'bot_killed', KilledByStorm: 'killed_by_storm',
      };
      if (category && categoryLayers[category]) return [categoryLayers[category]];
      if (!category || category === 'all_combat') return ['bot_kill', 'bot_killed'];
      return [];
    }
    case 'cross_layer_activity': return ['human_traffic', 'bot_traffic', 'loot', 'bot_kill', 'bot_killed', 'killed_by_storm'];
    default: return [];
  }
}

interface AnalystMapScreenProps {
  result: AnalyticalResult;
  onClose: () => void;
}

export const AnalystMapScreen: React.FC<AnalystMapScreenProps> = ({ result, onClose }) => {
  const mapId: MapId = result.mapId ?? (result.filtersApplied.mapId && result.filtersApplied.mapId !== 'all'
    ? result.filtersApplied.mapId
    : 'AmbroseValley');
  const visibleLayers = useMemo(() => getVisibleLayers(result), [result]);
  const [heatmaps, setHeatmaps] = useState<MapHeatmaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cell, setCell] = useState<{ row: number; col: number } | null>(() => {
    if (result.filtersApplied.row != null && result.filtersApplied.col != null) {
      return { row: result.filtersApplied.row, col: result.filtersApplied.col };
    }
    const peak = result.hotspots?.[0];
    return peak ? { row: peak.row, col: peak.col } : null;
  });

  useEffect(() => {
    let active = true;
    setHeatmaps(null);
    setError(null);
    dataService.getMapHeatmaps(mapId)
      .then((data) => { if (active) setHeatmaps(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load map telemetry.'); });
    return () => { active = false; };
  }, [mapId]);

  useEffect(() => {
    if (result.filtersApplied.row != null && result.filtersApplied.col != null) {
      setCell({ row: result.filtersApplied.row, col: result.filtersApplied.col });
    } else {
      const peak = result.hotspots?.[0];
      setCell(peak ? { row: peak.row, col: peak.col } : null);
    }
  }, [result]);

  const config = useMemo<HeatmapConfig>(() => ({
    enabled: true,
    activeLayers: {
      human_traffic: visibleLayers.includes('human_traffic'),
      bot_traffic: visibleLayers.includes('bot_traffic'),
      loot: visibleLayers.includes('loot'),
      bot_kill: visibleLayers.includes('bot_kill'),
      bot_killed: visibleLayers.includes('bot_killed'),
      killed_by_storm: visibleLayers.includes('killed_by_storm'),
    },
    opacity: 0.88,
    normalizationMode: 'relative',
    renderStyle: 'smooth',
    colorMode: 'tactical_layer',
  }), [visibleLayers]);

  const mapName = mapId === 'GrandRift' ? 'Grand Rift' : mapId === 'Lockdown' ? 'Lockdown' : 'Ambrose Valley';

  return (
    <section className="rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4 space-y-3" aria-label="Question-specific map">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold font-mono text-slate-100">Question Map · {mapName}</h4>
          <p className="mt-1 text-[11px] text-slate-400">{result.title} · overlays match the analysis layers</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close question map" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
      {visibleLayers.length === 0 && (
        <p className="text-[11px] text-amber-200 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2">
          This answer has no matching spatial heatmap layer in the supplied data. The map is shown for location context; no unrelated overlay is applied.
        </p>
      )}
      {error ? (
        <div className="h-[420px] rounded-xl border border-red-500/20 bg-black/50 flex items-center justify-center text-sm text-red-300">{error}</div>
      ) : !heatmaps ? (
        <div className="h-[420px] rounded-xl border border-white/10 bg-black/50 flex items-center justify-center text-xs text-cyan-200">Loading question-specific map data…</div>
      ) : (
        <div className="h-[min(62vh,640px)] min-h-[360px] rounded-xl overflow-hidden border border-white/10 bg-black">
          <MapCanvas
            mapId={mapId}
            journeys={[]}
            activeLayers={NO_TRAJECTORIES}
            entityFilter="all"
            selectedMatchId={null}
            selectedJourneyId={null}
            onSelectJourney={() => undefined}
            heatmaps={heatmaps}
            heatmapConfig={config}
            selectedCell={cell}
            onSelectCell={setCell}
          />
        </div>
      )}
      {cell && <p className="text-[10px] text-cyan-200 font-mono">Highlighted sector: R{cell.row}, C{cell.col} · click a sector to inspect another location.</p>}
    </section>
  );
};
