import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Swords,
  Search,
  Filter,
  Calendar,
  MapPin,
  Flame,
  Skull,
  Crosshair,
  ShieldAlert,
  Info,
  CheckCircle2,
  Activity,
  Layers,
  X,
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

  // Filters state - strictly individual map filters (no "All Maps")
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'all_combat'
  );
  const [selectedMap, setSelectedMap] = useState<MapId>(
    (searchParams.get('map') as MapId) || 'AmbroseValley'
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

  // Filtered events strictly for the selected map
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Individual Map filter only
      if (e.map_id !== selectedMap) return false;

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-[#F8FAFC]">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-[#292929] bg-[#111111] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
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
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-[#EF4444] font-bold">BotKill:</span>
            <strong className="text-slate-100">{tallies.botKill.toLocaleString()}</strong>
          </div>
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-red-400 font-bold">BotKilled:</span>
            <strong className="text-slate-100">{tallies.botKilled.toLocaleString()}</strong>
          </div>
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-orange-400 font-bold">Kill:</span>
            <strong className="text-slate-100">{tallies.kill}</strong>
          </div>
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-purple-400 font-bold">Killed:</span>
            <strong className="text-slate-100">{tallies.killed}</strong>
          </div>
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-indigo-400 font-bold">Storm:</span>
            <strong className="text-slate-100">{tallies.storm}</strong>
          </div>
          <div className="bg-[#050505] border border-[#292929] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="text-[#F5A623] font-bold">Loot:</span>
            <strong className="text-slate-100">{tallies.loot.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 border-b border-[#292929] bg-[#090909] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Individual Map Filter - No "All Maps" */}
          <div className="flex items-center gap-1 bg-[#111111] border border-[#292929] rounded-lg p-0.5">
            {(['AmbroseValley', 'GrandRift', 'Lockdown'] as MapId[]).map((mId) => (
              <button
                key={mId}
                type="button"
                onClick={() => {
                  setSelectedMap(mId);
                  if (selectedEvent && selectedEvent.map_id !== mId) {
                    setSelectedEvent(null);
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  selectedMap === mId
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mId === 'AmbroseValley' ? 'Ambrose Valley' : mId === 'GrandRift' ? 'Grand Rift' : 'Lockdown'}
              </button>
            ))}
          </div>

          {/* Event Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#111111] border border-[#292929] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
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

          {/* Date Selector */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#111111] border border-[#292929] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Dates</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Entity Search */}
          <div className="flex items-center gap-2 bg-[#111111] border border-[#292929] rounded-lg px-3 py-1.5 w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search entity ID..."
              value={searchEntity}
              onChange={(e) => setSearchEntity(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 w-full text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            Showing <strong className="text-slate-200">{filteredEvents.length.toLocaleString()}</strong> events on {selectedMap}
          </span>
        </div>
      </div>

      {/* Main Content: Split Grid with Events Table & Map Preview */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
        {/* Left: Events Table (Action column removed, row selection with active feedback) */}
        <div className="flex-1 flex flex-col bg-[#090909] border border-[#292929] rounded-xl overflow-hidden shadow-xl min-w-0 min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 bg-[#090909] border-b border-[#292929] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-3 py-3">Entity ID</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Map</th>
                  <th className="px-3 py-3">UTC Timestamp</th>
                  <th className="px-3 py-3">World [X, Z]</th>
                  <th className="px-3 py-3">UV [U, V]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#191919]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                      Loading combat events telemetry...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No events match active filter criteria for {selectedMap}.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 200).map((ev, idx) => {
                    const style = EVENT_STYLES[ev.event] ?? { label: ev.event, color: '#F43F5E' };
                    const isSelected = selectedEvent === ev || (selectedEvent?.match_id === ev.match_id && selectedEvent?.ts === ev.ts && selectedEvent?.user_id === ev.user_id);
                    return (
                      <tr
                        key={`${ev.match_id}_${ev.ts}_${idx}`}
                        className={`transition-all duration-200 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-cyan-950/60 ring-2 ring-cyan-400/80 border-l-4 border-l-[#00D9F5] shadow-lg shadow-cyan-950/50'
                            : 'hover:bg-[#111111]'
                        }`}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <td className="px-4 py-2.5 font-bold flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-200 ${
                              isSelected ? 'scale-125 ring-2 ring-white' : ''
                            }`}
                            style={{ backgroundColor: style.color }}
                          />
                          <span style={{ color: style.color }}>{style.label}</span>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00D9F5] uppercase tracking-wider font-semibold border border-cyan-500/40 ml-1">
                              Selected
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-200 font-mono truncate max-w-[150px]">
                          {ev.user_id}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            ev.entity_type === 'human' ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40' : 'text-purple-400 bg-purple-950/40 border border-purple-800/40'
                          }`}>
                            {ev.entity_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-300 font-sans text-[11px]">
                          {ev.map_id}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">
                          {ev.iso ? ev.iso.replace('T', ' ').slice(0, 19) : `${ev.ts}s`}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                          [{ev.x?.toFixed(1) ?? '—'}, {ev.z?.toFixed(1) ?? '—'}]
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                          [{ev.u?.toFixed(3) ?? '—'}, {ev.v?.toFixed(3) ?? '—'}]
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 bg-[#090909] border-t border-[#292929] text-[10px] text-slate-500 flex justify-between items-center">
            <span>Showing top {Math.min(200, filteredEvents.length)} of {filteredEvents.length.toLocaleString()} matching rows</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Click any event row to select and reveal tactical dossier
            </span>
          </div>
        </div>

        {/* Right: Spatial Combat Preview & Animated Selected Event Dossier */}
        <div className="w-96 flex flex-col gap-3.5 shrink-0 overflow-y-auto custom-scrollbar min-h-0 max-h-full pr-1">
          <div className="bg-[#090909] border border-[#292929] rounded-xl p-3.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                Spatial Event Plot
              </span>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded font-mono">
                {selectedMap}
              </span>
            </div>

            <CombatMapPreview
              mapId={selectedMap}
              events={filteredEvents}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />

            {/* Selected Event Card with Transition Animation */}
            {selectedEvent ? (
              <div
                key={`${selectedEvent.match_id}_${selectedEvent.ts}`}
                className="bg-[#111111] border border-cyan-500/40 rounded-xl p-3.5 text-xs font-mono space-y-2.5 shadow-lg shadow-cyan-950/30 transition-all duration-300 ease-out transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between border-b border-[#292929] pb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ backgroundColor: EVENT_STYLES[selectedEvent.event]?.color || '#EF4444' }}
                    />
                    <span className="text-slate-100 font-bold uppercase tracking-wider text-xs">
                      {selectedEvent.event}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-normal">
                      [Selected]
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#191919] transition-colors"
                    title="Deselect event"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#090909] p-2 rounded border border-[#191919] space-y-0.5">
                    <span className="text-slate-500 uppercase text-[9px] block">Entity ID</span>
                    <span className="text-slate-200 font-semibold truncate block" title={selectedEvent.user_id}>
                      {selectedEvent.user_id}
                    </span>
                  </div>
                  <div className="bg-[#090909] p-2 rounded border border-[#191919] space-y-0.5">
                    <span className="text-slate-500 uppercase text-[9px] block">Entity Classification</span>
                    <span className={`font-semibold uppercase text-[10px] block ${
                      selectedEvent.entity_type === 'human' ? 'text-cyan-400' : 'text-purple-400'
                    }`}>
                      {selectedEvent.entity_type}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 bg-[#090909] p-2 rounded border border-[#191919]">
                  <div className="flex justify-between">
                    <span>World [X, Z]:</span>
                    <span className="text-[#00D9F5] font-semibold">
                      [{selectedEvent.x?.toFixed(1) ?? '—'}, {selectedEvent.z?.toFixed(1) ?? '—'}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Normalized UV:</span>
                    <span className="text-slate-200">
                      [{selectedEvent.u?.toFixed(3) ?? '—'}, {selectedEvent.v?.toFixed(3) ?? '—'}]
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>UTC Timestamp:</span>
                    <span className="text-slate-200">
                      {selectedEvent.iso ? selectedEvent.iso.replace('T', ' ').slice(0, 19) : `${selectedEvent.ts}s`}
                    </span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Match ID:</span>
                    <span className="text-slate-400 truncate max-w-[180px]" title={selectedEvent.match_id}>
                      {selectedEvent.match_id}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111111]/60 border border-dashed border-[#292929] rounded-xl p-3 text-center text-xs text-slate-500 font-mono">
                Click any row in the table or dot on the map to inspect discrete event kinetics.
              </div>
            )}
          </div>

          {/* Mandatory Semantic Restrictions Notice */}
          <div className="bg-[#090909] border border-[#292929] rounded-xl p-4 text-xs text-slate-400 space-y-2">
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
