import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  User,
  Bot,
  Search,
  SlidersHorizontal,
  Route,
  Clock,
  ArrowUpDown,
  Flame,
  Award,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { PlayerSummary, EntityType, MapId } from '../../types/telemetry';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PlayerGameView } from '../player-game/PlayerGamePage';

type SortField = 'matches' | 'distance' | 'duration' | 'loot' | 'bot_kills' | 'deaths';
type SortOrder = 'desc' | 'asc';

export const PlayerIntelligencePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [entityFilter, setEntityFilter] = useState<'all' | EntityType>(
    (searchParams.get('entity') as EntityType) || 'all'
  );
  const [mapFilter, setMapFilter] = useState<string>(searchParams.get('map') || 'all');
  const [dateFilter, setDateFilter] = useState<string>(searchParams.get('date') || 'all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('matches');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal inspection state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);

  // In-page Player Game Replay state
  const [activeReplay, setActiveReplay] = useState<{
    playerId: string;
    matchId: string;
    mapId: MapId;
  } | null>(() => {
    const qMatch = searchParams.get('match');
    const qPlayer = searchParams.get('player') || searchParams.get('user');
    const qMap = (searchParams.get('map') as MapId) || 'AmbroseValley';
    if (qMatch && qPlayer) {
      return { playerId: qPlayer, matchId: qMatch, mapId: qMap };
    }
    return null;
  });

  useEffect(() => {
    setLoading(true);
    dataService.getPlayers()
      .then((data) => {
        setPlayers(data);
        const qPlayer = searchParams.get('player');
        if (qPlayer && !searchParams.get('match')) {
          const found = data.find((p) => p.user_id === qPlayer || p.user_id.includes(qPlayer));
          if (found) setSelectedPlayer(found);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load players'))
      .finally(() => setLoading(false));
  }, []);

  // Summary counts
  const totalEntities = players.length;
  const totalHumans = useMemo(() => players.filter((p) => p.entity_type === 'human').length, [players]);
  const totalBots = useMemo(() => players.filter((p) => p.entity_type === 'bot').length, [players]);
  const totalKm = useMemo(() => {
    const sum = players.reduce((acc, p) => acc + (p.total_distance_travelled_meters || 0), 0);
    return Math.round(sum / 1000);
  }, [players]);

  // Unique available dates
  const allDates = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => (p.dates_active || []).forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [players]);

  // Filtered & sorted players
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        // Search query
        if (searchQuery && !p.user_id.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
          return false;
        }
        // Entity type
        if (entityFilter !== 'all' && p.entity_type !== entityFilter) {
          return false;
        }
        // Map played
        if (mapFilter !== 'all' && !p.maps_played?.[mapFilter]) {
          return false;
        }
        // Date active
        if (dateFilter !== 'all' && !p.dates_active?.includes(dateFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        switch (sortField) {
          case 'matches':
            valA = a.matches_played;
            valB = b.matches_played;
            break;
          case 'distance':
            valA = a.total_distance_travelled_meters;
            valB = b.total_distance_travelled_meters;
            break;
          case 'duration':
            valA = a.total_duration_seconds;
            valB = b.total_duration_seconds;
            break;
          case 'loot':
            valA = a.total_loot_events;
            valB = b.total_loot_events;
            break;
          case 'bot_kills':
            valA = a.total_bot_kill_events;
            valB = b.total_bot_kill_events;
            break;
          case 'deaths':
            valA = a.total_death_events;
            valB = b.total_death_events;
            break;
        }
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [players, searchQuery, entityFilter, mapFilter, dateFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatSeconds = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (activeReplay) {
    return (
      <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden bg-[#080B11]">
        <PlayerGameView
          initialPlayerId={activeReplay.playerId}
          initialMatchId={activeReplay.matchId}
          initialMapId={activeReplay.mapId}
          onBack={() => {
            setActiveReplay(null);
            setSearchParams({});
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080B11] text-[#F8FAFC]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#1E2B3E] bg-[#101925] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-[#00D9F5] border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider font-mono text-slate-100 uppercase">
              Player Intelligence Directory
            </h1>
            <p className="text-xs text-slate-400">
              Session metrics, deployment frequencies, and behavioral spatial summaries.
            </p>
          </div>
        </div>

        {/* Top Summary Stat Widgets */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-[#080D14] border border-[#1E2B3E] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-slate-400">Total Entities:</span>
            <strong className="text-slate-100">{totalEntities}</strong>
          </div>
          <div className="bg-[#080D14] border border-[#1E2B3E] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[#14C995]">Humans:</span>
            <strong className="text-[#14C995]">{totalHumans}</strong>
          </div>
          <div className="bg-[#080D14] border border-[#1E2B3E] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-[#F5A623]">Bots:</span>
            <strong className="text-[#F5A623]">{totalBots}</strong>
          </div>
          <div className="bg-[#080D14] border border-[#1E2B3E] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-slate-400">Total Distance:</span>
            <strong className="text-slate-100">{totalKm.toLocaleString()} km</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="px-6 py-3 border-b border-[#1E2B3E] bg-[#0A101A] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-[#101925] border border-[#1E2B3E] rounded-lg px-3 py-1.5 w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 w-full text-xs font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Type Toggle */}
          <div className="flex items-center bg-[#101925] border border-[#1E2B3E] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setEntityFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                entityFilter === 'all' ? 'bg-[#1E2B3E] text-[#00D9F5] font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter('human')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                entityFilter === 'human' ? 'bg-[#14C995]/20 text-[#14C995] font-bold border border-[#14C995]/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3 h-3" />
              Humans
            </button>
            <button
              type="button"
              onClick={() => setEntityFilter('bot')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                entityFilter === 'bot' ? 'bg-[#F5A623]/20 text-[#F5A623] font-bold border border-[#F5A623]/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3 h-3" />
              Bots
            </button>
          </div>

          {/* Map Filter */}
          <select
            value={mapFilter}
            onChange={(e) => setMapFilter(e.target.value)}
            className="bg-[#121826] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Maps</option>
            <option value="AmbroseValley">Ambrose Valley</option>
            <option value="GrandRift">Grand Rift</option>
            <option value="Lockdown">Lockdown</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-[#121826] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Dates</option>
            {allDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <span className="text-slate-500 ml-1">
            Showing {filteredPlayers.length} of {totalEntities}
          </span>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0E1420] text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-3 py-3">Classification</th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => toggleSort('matches')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Matches</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => toggleSort('distance')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Distance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => toggleSort('duration')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Duration</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => toggleSort('loot')}
                    title="Discrete Loot telemetry emissions"
                  >
                    <div className="flex items-center gap-1">
                      <span>Loot Events</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                    onClick={() => toggleSort('bot_kills')}
                    title="Discrete BotKill telemetry emissions"
                  >
                    <div className="flex items-center gap-1">
                      <span>BotKill Events</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-3 py-3">Outcomes</th>
                  <th className="px-3 py-3">Maps Played</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161F30]">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                      Loading player directory telemetry...
                    </td>
                  </tr>
                ) : filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      No entities found matching active filters.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => {
                    const isH = p.entity_type === 'human';
                    const maps = Object.keys(p.maps_played || {});
                    return (
                      <tr
                        key={p.user_id}
                        className="hover:bg-[#121A2A] transition-colors cursor-pointer"
                        onClick={() => setSelectedPlayer(p)}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-200 truncate max-w-[180px]">
                          {p.user_id}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isH
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}>
                            {isH ? 'Human' : 'Bot'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-100">
                          {p.matches_played}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          {(p.total_distance_travelled_meters / 1000).toFixed(1)} km
                        </td>
                        <td className="px-3 py-2.5 text-slate-300">
                          {formatSeconds(p.total_duration_seconds)}
                        </td>
                        <td className="px-3 py-2.5 text-amber-400 font-semibold">
                          {p.total_loot_events}
                        </td>
                        <td className="px-3 py-2.5 text-rose-400 font-semibold">
                          {p.total_bot_kill_events}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          <span className="text-emerald-400">{p.outcomes?.SURVIVED_PRESUMED || 0}S</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-rose-400">{p.outcomes?.ELIMINATED || 0}E</span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-slate-400 font-sans">
                          {maps.join(', ')}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayer(p);
                            }}
                            className="px-2.5 py-1 rounded bg-[#1A2234] hover:bg-[#26344E] text-cyan-400 hover:text-cyan-300 text-[11px] font-sans font-medium transition-colors border border-[#2D3B55]"
                          >
                            Inspect
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
      </div>

      {/* Slide-over / Modal Profile Inspection */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onViewReplay={(pId, mId, mapId) => {
            setActiveReplay({
              playerId: pId,
              matchId: mId,
              mapId: (mapId as MapId) || 'AmbroseValley',
            });
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
};
