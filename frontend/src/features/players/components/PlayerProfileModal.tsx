import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Bot,
  MapPin,
  Clock,
  Route,
  Activity,
  Award,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { PlayerSummary } from '../../../types/telemetry';

interface PlayerProfileModalProps {
  player: PlayerSummary | null;
  onClose: () => void;
  onViewReplay?: (playerId: string, matchId: string, mapId: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  onClose,
  onViewReplay,
}) => {
  const navigate = useNavigate();

  if (!player) return null;

  const isHuman = player.entity_type === 'human';
  const totalOutcomes = (player.outcomes?.ELIMINATED || 0) + (player.outcomes?.SURVIVED_PRESUMED || 0);
  const elimPercent = totalOutcomes > 0 ? (((player.outcomes?.ELIMINATED || 0) / totalOutcomes) * 100).toFixed(1) : '0.0';
  const survPercent = totalOutcomes > 0 ? (((player.outcomes?.SURVIVED_PRESUMED || 0) / totalOutcomes) * 100).toFixed(1) : '0.0';

  // Find most played map
  const mapEntries = Object.entries(player.maps_played || {});
  mapEntries.sort((a, b) => b[1] - a[1]);
  const primaryMap = mapEntries.length > 0 ? mapEntries[0][0] : 'AmbroseValley';

  const formatSeconds = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    return `${mins}m ${s}s`;
  };

  const handleInspectMatch = (matchId: string) => {
    if (onViewReplay) {
      onViewReplay(player.user_id, matchId, primaryMap);
      onClose();
    } else {
      navigate(`/players?player=${player.user_id}&match=${matchId}&map=${primaryMap}&view=replay`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#101623] border border-[#1E293B] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0D121D]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl border ${
              isHuman
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
            }`}>
              {isHuman ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-mono font-bold text-slate-100 truncate">
                  {player.user_id}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold border ${
                  isHuman
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                }`}>
                  {isHuman ? 'Human Player' : 'AI Bot'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>Active: {player.dates_active?.join(', ') || 'N/A'}</span>
                <span>•</span>
                <span>{player.matches_played} matches recorded</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Route className="w-3 h-3 text-cyan-400" />
                Total Distance
              </span>
              <div className="text-lg font-bold font-mono text-slate-100">
                {(player.total_distance_travelled_meters / 1000).toFixed(2)} km
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Avg: {Math.round(player.avg_distance_travelled_meters)} m / match
              </span>
            </div>

            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Total Duration
              </span>
              <div className="text-lg font-bold font-mono text-slate-100">
                {formatSeconds(player.total_duration_seconds)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Avg: {Math.round(player.avg_duration_seconds)}s / match
              </span>
            </div>

            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                BotKill Events
              </span>
              <div className="text-lg font-bold font-mono text-rose-400">
                {player.total_bot_kill_events}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Recorded telemetry logs
              </span>
            </div>

            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                Loot Events
              </span>
              <div className="text-lg font-bold font-mono text-amber-400">
                {player.total_loot_events}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Recorded telemetry logs
              </span>
            </div>
          </div>

          {/* Outcome & Map Distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Terminal Outcomes */}
            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                Recorded Terminal Outcomes
              </h3>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-emerald-400">SURVIVED_PRESUMED</span>
                    <span className="text-slate-200 font-bold">
                      {player.outcomes?.SURVIVED_PRESUMED || 0} ({survPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#1A2234] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${survPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-rose-400">ELIMINATED</span>
                    <span className="text-slate-200 font-bold">
                      {player.outcomes?.ELIMINATED || 0} ({elimPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#1A2234] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${elimPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span title="Sum of BotKilled, Killed, and KilledByStorm events">
                  Elimination Events: <strong className="text-slate-200">{player.total_death_events}</strong>
                </span>
                <span title="KilledByStorm zone death events">
                  Storm Deaths: <strong className="text-slate-200">{player.total_storm_deaths}</strong>
                </span>
              </div>
            </div>

            {/* Maps Played */}
            <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Map Deployment Frequency
              </h3>

              <div className="space-y-2">
                {mapEntries.map(([mId, count]) => {
                  const pct = player.matches_played > 0
                    ? ((count / player.matches_played) * 100).toFixed(1)
                    : '0';
                  return (
                    <div key={mId}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-300">{mId}</span>
                        <span className="text-slate-400">
                          {count} matches ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#1A2234] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recorded Match Sessions List */}
          <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E293B] bg-[#0E1420] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Distinct Match Participations ({new Set(player.matches || []).size})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Primary: {primaryMap}
              </span>
            </div>

            <div className="divide-y divide-[#1A2333] max-h-52 overflow-y-auto font-mono text-xs">
              {(player.matches || []).map((mItem, idx) => {
                const mId = typeof mItem === 'string' ? mItem : (mItem as any)?.match_id || `match-${idx + 1}`;
                return (
                  <div
                    key={mId}
                    className="px-4 py-2 flex items-center justify-between hover:bg-[#151D2C] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-6">#{idx + 1}</span>
                      <span className="text-slate-300 truncate max-w-sm">{mId}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInspectMatch(mId)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00D9F5]/10 text-[#00D9F5] hover:bg-[#00D9F5]/20 text-[11px] font-sans font-medium transition-colors border border-[#00D9F5]/30 shadow-sm"
                      title="Inspect game on tactical map in Player Game View"
                    >
                      <span>View Replay</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Integrity Disclosure */}
          <div className="text-[10px] text-slate-500 leading-relaxed bg-[#0A0D15] p-3 rounded-lg border border-[#1A2333]">
            <strong>Telemetry Integrity Notice:</strong> All metrics are derived from Nakama server logs. Match counts reflect distinct match IDs. Event counts (BotKill, Loot) reflect unilateral client emissions without killer-victim linkage. Survival status is defined as <code>SURVIVED_PRESUMED</code> because telemetry stops without an explicit extraction confirmation. No player skill, strategy, or personality inferences are made.
          </div>
        </div>
      </div>
    </div>
  );
};
