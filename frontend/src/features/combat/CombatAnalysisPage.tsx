import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Swords,
  Search,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
  Flame,
  Skull,
  Crosshair,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { DiscreteEvent, MapId } from '../../types/telemetry';
import { EVENT_STYLES } from '../map-explorer/utils/canvasRenderer';
import { CombatMapPreview } from './components/CombatMapPreview';

export const CombatAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [events, setEvents] = useState<DiscreteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all_combat'
  );
  const [selectedMap, setSelectedMap] = useState<string>(
    searchParams.get('map') || 'AmbroseValley'
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get('date') || 'all'
  );
  const [searchEntity, setSearchEntity] = useState<string>(
    searchParams.get('entity') || ''
  );

  const [selectedEvent, setSelectedEvent] = useState<DiscreteEvent | null>(null);

  useEffect(() => {
    setLoading(true);
    dataService.getEvents()
      .then((data) => {
        setEvents(data);
        const qEvTs = searchParams.get('ts');
        if (qEvTs) {
          const tsNum = parseInt(qEvTs, 10);
          const found = data.find((e) => e.ts === tsNum);
          if (found) setSelectedEvent(found);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load combat events'))
      .finally(() => setLoading(false));
  }, []);

  // Compute exact event category tallies
  const tallies = useMemo(() => {
    let botKill = 0;
    let botKilled = 0;
    let kill = 0;
    let killed = 0;
    let storm = 0;
    let loot = 0;

    for (const e of events) {
      if (e.event === 'BotKill') botKill++;
      else if (e.event === 'BotKilled') botKilled++;
      else if (e.event === 'Kill') kill++;
      else if (e.event === 'Killed') killed++;
      else if (e.event === 'KilledByStorm') storm++;
      else if (e.event === 'Loot') loot++;
    }

    return { botKill, botKilled, kill, killed, storm, loot, totalCombat: botKill + botKilled + kill + killed + storm };
  }, [events]);

  // Unique available dates
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort();
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Map filter
      if (selectedMap !== 'all' && e.map_id !== selectedMap) return false;

      // Category filter
      if (selectedCategory === 'all_combat') {
        if (e.event === 'Loot') return false;
      } else if (selectedCategory !== 'all') {
        if (e.event !== selectedCategory) return false;
      }

      // Date filter
      if (selectedDate !== 'all' && e.date !== selectedDate) return false;

      // Entity search
      if (searchEntity && !e.user_id?.toLowerCase().includes(searchEntity.toLowerCase().trim())) {
        return false;
      }

      return true;
    });
  }, [events, selectedCategory, selectedMap, selectedDate, searchEntity]);

  const handleInspectInReplay = (ev: DiscreteEvent) => {
    navigate(`/map-explorer?map=${ev.map_id}&seek=${ev.ts}`);
  };

  const currentMapId: MapId = (selectedMap === 'all' ? 'AmbroseValley' : selectedMap) as MapId;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080B11] text-[#F8FAFC]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#1E293B] bg-[#0E131F] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wider font-mono text-slate-100 uppercase">
              Combat Telemetry Analysis
            </h1>
            <p className="text-xs text-slate-400">
              Discrete engagement occurrences, elimination logs, and spatial encounter clusters.
            </p>
          </div>
        </div>

        {/* Top Summary Stat Widgets */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-rose-400 font-bold">BotKill:</span>
            <strong className="text-slate-100">{tallies.botKill.toLocaleString()}</strong>
          </div>
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-red-500 font-bold">BotKilled:</span>
            <strong className="text-slate-100">{tallies.botKilled.toLocaleString()}</strong>
          </div>
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-orange-400 font-bold">Kill:</span>
            <strong className="text-slate-100">{tallies.kill}</strong>
          </div>
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-purple-400 font-bold">Killed:</span>
            <strong className="text-slate-100">{tallies.killed}</strong>
          </div>
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold">Storm:</span>
            <strong className="text-slate-100">{tallies.storm}</strong>
          </div>
          <div className="bg-[#151D2E] border border-[#1E293B] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">Loot:</span>
            <strong className="text-slate-100">{tallies.loot.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 border-b border-[#1E293B] bg-[#0B0F17] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Entity Search */}
          <div className="flex items-center gap-2 bg-[#121826] border border-[#1E293B] rounded-lg px-3 py-1.5 w-60">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by entity ID..."
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 w-full text-xs font-mono"
            />
          </div>

          {/* Event Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#121826] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all_combat">All Combat Events (Excl. Loot)</option>
            <option value="BotKill">BotKill Events ({tallies.botKill})</option>
            <option value="BotKilled">BotKilled Events ({tallies.botKilled})</option>
            <option value="Kill">Kill Events ({tallies.kill})</option>
            <option value="Killed">Killed Events ({tallies.killed})</option>
            <option value="KilledByStorm">Storm Death Events ({tallies.storm})</option>
            <option value="Loot">Loot Events ({tallies.loot})</option>
            <option value="all">All Events Including Loot</option>
          </select>

          {/* Map Selector */}
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="bg-[#121826] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Maps</option>
            <option value="AmbroseValley">Ambrose Valley</option>
            <option value="GrandRift">Grand Rift</option>
            <option value="Lockdown">Lockdown</option>
          </select>

          {/* Date Selector */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#121826] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Dates</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500">
          Showing {filteredEvents.length.toLocaleString()} events
        </span>
      </div>

      {/* Main Content: Split Grid with Events Table & Map Preview */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Events Table */}
        <div className="flex-1 flex flex-col bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl min-w-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 bg-[#0E1420] border-b border-[#1E293B] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-3 py-3">Entity ID</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Map</th>
                  <th className="px-3 py-3">UTC Timestamp</th>
                  <th className="px-3 py-3">World [X, Z]</th>
                  <th className="px-3 py-3">UV [U, V]</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161F30]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                      Loading combat events telemetry...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No events match active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 200).map((ev, idx) => {
                    const style = EVENT_STYLES[ev.event] ?? { label: ev.event, color: '#F43F5E' };
                    const isSelected = selectedEvent === ev;
                    return (
                      <tr
                        key={`${ev.match_id}_${ev.ts}_${idx}`}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-950/30 ring-1 ring-cyan-500/50' : 'hover:bg-[#121A2A]'
                        }`}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <td className="px-4 py-2 font-bold flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: style.color }}
                          />
                          <span style={{ color: style.color }}>{style.label}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-200 truncate max-w-[140px]">
                          {ev.user_id}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            ev.entity_type === 'human' ? 'text-cyan-400 bg-cyan-950/40' : 'text-purple-400 bg-purple-950/40'
                          }`}>
                            {ev.entity_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 font-sans text-[11px]">
                          {ev.map_id}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {ev.iso ? ev.iso.replace('T', ' ').slice(0, 19) : `${ev.ts}s`}
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-[11px]">
                          [{ev.x?.toFixed(1) ?? '—'}, {ev.z?.toFixed(1) ?? '—'}]
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">
                          [{ev.u?.toFixed(3) ?? '—'}, {ev.v?.toFixed(3) ?? '—'}]
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectInReplay(ev);
                            }}
                            className="px-2 py-0.5 rounded bg-[#1A2234] hover:bg-[#25324A] text-cyan-400 text-[10px] font-sans font-medium transition-colors border border-[#2D3B55]"
                          >
                            Replay
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 bg-[#0E1420] border-t border-[#1E293B] text-[10px] text-slate-500 flex justify-between items-center">
            <span>Showing top {Math.min(200, filteredEvents.length)} of {filteredEvents.length.toLocaleString()} matching rows</span>
            <span>Click any row to pinpoint on spatial minimap</span>
          </div>
        </div>

        {/* Right: Spatial Combat Preview & Mandatory Disclosures */}
        <div className="w-96 flex flex-col gap-4 shrink-0">
          <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                Spatial Event Plot
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentMapId}
              </span>
            </div>

            <CombatMapPreview
              mapId={currentMapId}
              events={filteredEvents}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />

            {selectedEvent && (
              <div className="bg-[#121826] border border-[#1E293B] rounded-lg p-2.5 text-xs font-mono space-y-1">
                <div className="text-amber-400 font-bold flex justify-between">
                  <span>Selected Event</span>
                  <span>{selectedEvent.event}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>World Coords:</span>
                  <span className="text-slate-200">[{selectedEvent.x?.toFixed(1) ?? '—'}, {selectedEvent.z?.toFixed(1) ?? '—'}]</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-slate-200">{selectedEvent.iso?.slice(11, 19) || selectedEvent.ts}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInspectInReplay(selectedEvent)}
                  className="w-full mt-2 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open In Map Explorer Replay</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mandatory Semantic Restrictions Notice */}
          <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              Combat Telemetry Boundaries
            </div>
            <ul className="text-[11px] leading-relaxed text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Event Semantics & Neutral Naming:</strong> Raw telemetry records discrete event names (<code>BotKill</code>, <code>BotKilled</code>, <code>Kill</code>, <code>Killed</code>, <code>KilledByStorm</code>, <code>Loot</code>) without killer/victim attribution, weapon metadata, or hitpoints. The platform uses exact event names to prevent speculative claims.
              </li>
              <li>
                <strong>BotKill vs BotKilled:</strong> Recorded as separate participant event logs without killer-victim pairing. No killer-victim relationship is inferred.
              </li>
              <li>
                <strong>No Weapon/Damage Data:</strong> The telemetry schema does not contain weapon models, bullet counts, or damage values.
              </li>
              <li>
                <strong>Storm Fatalities:</strong> <code>KilledByStorm</code> events reflect zone boundary constriction and are strictly isolated from combat engagements.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
