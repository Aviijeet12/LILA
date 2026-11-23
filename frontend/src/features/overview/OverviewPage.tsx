import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  Bot,
  Footprints,
  Route,
  Trophy,
  AlertTriangle,
  Info,
  Zap,
  MapPin,
} from "lucide-react";
import { dataService } from "../../services/dataService";
import type { GlobalStats } from "../../types/telemetry";
import { StatWidget, Badge } from "../../components/ui/StatWidget";

// â”€â”€â”€ Colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ─── Design Tokens ──────────────────────────────────────────────────────────
const CYAN   = "#00D9F5";
const GREEN  = "#14C995";
const AMBER  = "#F5A623";
const ROSE   = "#EF4444";
const SLATE  = "#64748B";
const PURPLE = "#A855F7";

const MAP_COLOURS: Record<string, string> = {
  AmbroseValley: CYAN,
  GrandRift:     GREEN,
  Lockdown:      AMBER,
};

const OUTCOME_COLOURS: Record<string, string> = {
  ELIMINATED:        ROSE,
  SURVIVED_PRESUMED: GREEN,
};

const EVENT_COLOURS = [CYAN, GREEN, AMBER, ROSE, PURPLE, SLATE, "#6366F1", "#F97316"];

// ─── Custom tooltip shared style ─────────────────────────────────────────────
const TooltipStyle: React.CSSProperties = {
  background:   "#111111",
  border:       "1px solid #292929",
  borderRadius: 6,
  fontSize:     11,
  fontFamily:   "ui-monospace, monospace",
  color:        "#F8FAFC",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle} className="px-3 py-2 shadow-xl">
      <div className="text-slate-400 text-[10px] mb-1 font-sans">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || CYAN }} className="font-mono">
          {p.name}: <span className="font-semibold text-white">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={TooltipStyle} className="px-3 py-2 shadow-xl">
      <div className="text-slate-400 text-[10px] mb-0.5 font-sans">{name}</div>
      <div style={{ color: CYAN }} className="font-semibold font-mono">{value?.toLocaleString()}</div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; sub?: string; children: React.ReactNode; className?: string }> = ({
  title, sub, children, className = ""
}) => (
  <div className={`mb-6 ${className}`}>
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="w-1 h-3.5 bg-[#00D9F5] rounded-sm" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">{title}</span>
      {sub && <span className="text-[10px] text-slate-400 font-mono">({sub})</span>}
      <div className="flex-1 h-px bg-[#292929]" />
    </div>
    {children}
  </div>
);

// ─── Loading skeleton ────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-[#111111] border border-[#292929] ${className}`} />
);

// ─── Main component ──────────────────────────────────────────────────────────
export const OverviewPage: React.FC = () => {
  const [stats, setStats]     = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    dataService.getGlobalStats()
      .then(setStats)
      .catch((e) => setError(e.message ?? "Failed to load global_stats.json"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 text-sm font-mono text-[#EF4444]">
        <AlertTriangle size={16} />
        <span>Failed to load dataset: {error}</span>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-56 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  // Derived chart data
  const dailyMatchData = Object.entries(stats.matches_per_day)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: date.slice(5),
      matches: count,
      journeys: stats.journeys_per_day[date] ?? 0,
    }));

  const mapMatchData = Object.entries(stats.matches_per_map).map(([map, count]) => ({
    name: map === 'AmbroseValley' ? 'Ambrose Valley' : map === 'GrandRift' ? 'Grand Rift' : 'Lockdown',
    rawName: map,
    matches: count,
    journeys: stats.journeys_per_map[map] ?? 0,
  }));

  const outcomeData = Object.entries(stats.outcomes_overall).map(([name, value]) => ({
    name,
    value,
  }));

  const eventData = Object.entries(stats.event_distribution_overall)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));

  const totalEvents = eventData.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-5">
      {/* Compact Tactical Intelligence Header */}
      <div className="bg-[#111111] border border-[#292929] rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-11 rounded bg-black border border-[#292929] p-1 flex items-center justify-center flex-shrink-0">
            <img src="/lila-logo.png" alt="LILA" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-[#F8FAFC] tracking-wide">
                LILA BLACK <span className="text-[#00D9F5]">INTELLIGENCE</span>
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#292929] text-slate-300">
                DATASET v1.0
              </span>
            </div>
            <div className="text-xs text-slate-400 font-sans flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Timeline: <strong className="text-slate-200 font-mono">Feb 10 – 14, 2026 UTC</strong></span>
              <span className="text-slate-600">•</span>
              <span>Scope: <strong className="text-slate-200 font-mono">3 Maps</strong></span>
              <span className="text-slate-600">•</span>
              <span>Status: <strong className="text-[#14C995] font-mono">Audited & Reconciled</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-[#050505] border border-[#292929] text-slate-300">
            <span className="text-slate-500 mr-1.5">RECORDS:</span>
            <strong className="text-[#F8FAFC]">87,599</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-[#050505] border border-[#292929] text-slate-300">
            <span className="text-slate-500 mr-1.5">EVENTS:</span>
            <strong className="text-[#00D9F5]">14,750</strong>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <Section title="Dataset Summary" sub={`${stats.date_range} • UTC`}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatWidget
            label="Total Matches"
            value={stats.total_matches.toLocaleString()}
            icon={<Trophy size={14} />}
            badge={<Badge variant="cyan">796</Badge>}
            subtext="3 maps covered"
          />
          <StatWidget
            label="Player Journeys"
            value={stats.total_journeys.toLocaleString()}
            icon={<Route size={14} />}
            subtext="1 dup file skipped"
          />
          <StatWidget
            label="Human Players"
            value={stats.total_unique_humans.toLocaleString()}
            icon={<Users size={14} />}
            badge={<Badge variant="green">HUMAN</Badge>}
            subtext="UUID identifiers"
          />
          <StatWidget
            label="Bot Entities"
            value={stats.total_unique_bots.toLocaleString()}
            icon={<Bot size={14} />}
            badge={<Badge variant="amber">BOT</Badge>}
            subtext="Numeric identifiers"
          />
          <StatWidget
            label="Clean Records"
            value={stats.total_clean_records.toLocaleString()}
            icon={<Zap size={14} />}
            subtext="14,750 discrete + 50.5k pos"
          />
          <StatWidget
            label="Recorded Distance"
            value={`${stats.total_distance_travelled_km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`}
            icon={<Footprints size={14} />}
            subtext="Euclidean traversal"
          />
        </div>
      </Section>

      {/* Main Analytical Grid: Velocity (Left) & Geospatial/Outcome Shares (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Match & Journey Velocity (7 cols) */}
        <div className="lg:col-span-7">
          <Section title="Operational Velocity" sub="Matches & Journeys by Day">
            <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dailyMatchData} barGap={4}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#29292933" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: "#94A3B8" }}
                  />
                  <Bar isAnimationActive={false} dataKey="matches" name="Matches" fill={CYAN} radius={[2, 2, 0, 0]} maxBarSize={36} />
                  <Bar isAnimationActive={false} dataKey="journeys" name="Journeys" fill={GREEN} radius={[2, 2, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-[10px] font-mono text-slate-500 mt-2 flex items-center justify-between">
                <span>Feb 09 contains 1 timezone boundary match. Core operation: Feb 10–14.</span>
                <span className="text-slate-400">Total: 796 Matches</span>
              </div>
            </div>
          </Section>
        </div>

        {/* Map & Outcome Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Map Distribution */}
          <Section title="Map Distribution" sub="Matches & Journeys per Map">
            <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={105}>
                <BarChart data={mapMatchData} layout="vertical" barGap={2} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "ui-monospace,monospace" }} axisLine={false} tickLine={false} width={105} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#29292933" }} />
                  <Bar isAnimationActive={false} dataKey="matches" name="Matches" radius={[0, 2, 2, 0]} maxBarSize={12}>
                    {mapMatchData.map((entry) => (
                      <Cell key={entry.rawName} fill={MAP_COLOURS[entry.rawName] ?? SLATE} />
                    ))}
                  </Bar>
                  <Bar isAnimationActive={false} dataKey="journeys" name="Journeys" fill={SLATE} radius={[0, 2, 2, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Outcome Distribution */}
          <Section title="Outcome Distribution" sub="Presumed Survival vs Elimination">
            <div className="bg-[#111111] border border-[#292929] rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="45%" height={100}>
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
                      data={outcomeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={48}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {outcomeData.map((entry) => (
                        <Cell key={entry.name} fill={OUTCOME_COLOURS[entry.name] ?? SLATE} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {outcomeData.map((entry) => {
                    const pct = ((entry.value / stats.total_journeys) * 100).toFixed(1);
                    return (
                      <div key={entry.name} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: OUTCOME_COLOURS[entry.name] ?? SLATE }}
                            />
                            <span className="text-slate-300 text-[11px]">{entry.name}</span>
                          </span>
                          <span className="text-white font-semibold">{entry.value.toLocaleString()}</span>
                        </div>
                        <div className="h-1 rounded-full bg-[#292929]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: OUTCOME_COLOURS[entry.name] ?? SLATE,
                            }}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">{pct}% of journeys</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Discrete Event Distribution */}
      <Section title="Discrete Event Distribution" sub="14,750 discrete events recorded">
        <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={eventData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={44}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#29292933" }} />
                <Bar isAnimationActive={false} dataKey="count" name="Events" radius={[2, 2, 0, 0]} maxBarSize={32}>
                  {eventData.map((entry, i) => (
                    <Cell key={entry.name} fill={EVENT_COLOURS[i % EVENT_COLOURS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-1.5 flex flex-col justify-center">
              {eventData.map((entry, i) => {
                const pct = ((entry.count / totalEvents) * 100).toFixed(1);
                return (
                  <div key={entry.name} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: EVENT_COLOURS[i % EVENT_COLOURS.length] }}
                    />
                    <span className="text-slate-300 w-28 truncate">{entry.name}</span>
                    <div className="flex-1 h-1 rounded-full bg-[#191919]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: EVENT_COLOURS[i % EVENT_COLOURS.length],
                        }}
                      />
                    </div>
                    <span className="text-slate-500 text-[10px] w-10 text-right">{pct}%</span>
                    <span className="text-slate-200 w-14 text-right font-semibold">{entry.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Human vs Bot Participation */}
      <Section title="Entity Participation" sub="Human vs Bot Event Totals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Human Events", data: stats.event_distribution_human, colour: GREEN },
            { label: "Bot Events", data: stats.event_distribution_bot, colour: AMBER },
          ].map(({ label, data, colour }) => {
            const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
            const total = entries.reduce((s, [, v]) => s + v, 0);
            return (
              <div key={label} className="bg-[#111111] border border-[#292929] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-mono text-slate-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                    {label}
                  </span>
                  <span className="text-slate-500">{total.toLocaleString()} records</span>
                </div>
                <div className="space-y-1.5">
                  {entries.map(([name, count]) => {
                    const pct = ((count / total) * 100).toFixed(1);
                    return (
                      <div key={name} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400 w-28 truncate">{name}</span>
                        <div className="flex-1 h-1 rounded-full bg-[#191919]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colour }} />
                        </div>
                        <span className="text-slate-500 text-[10px] w-10 text-right">{pct}%</span>
                        <span className="text-slate-200 w-12 text-right">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Dataset Limitations & Assumptions */}
      <Section title="Dataset Limitations & Assumptions">
        <div className="bg-[#111111] border border-[#292929] rounded-xl p-4 space-y-2">
          {[
            { icon: <Info size={12} className="text-[#00D9F5] mt-0.5 flex-shrink-0" />, text: 'No extraction event exists in the telemetry schema. "SURVIVED_PRESUMED" indicates the journey concluded without an observed Killed or KilledByStorm event.' },
            { icon: <Info size={12} className="text-[#F5A623] mt-0.5 flex-shrink-0" />, text: 'Timestamps are stored as Unix epoch seconds (int64). The Parquet schema declares timestamp[ms] but values are seconds — corrected in the Python ETL pipeline.' },
            { icon: <Info size={12} className="text-[#A855F7] mt-0.5 flex-shrink-0" />, text: '1 duplicate Parquet file detected (February_11/cfa03e9f). Its 88 rows are excluded; the February_10 copy is the canonical record.' },
            { icon: <Info size={12} className="text-[#14C995] mt-0.5 flex-shrink-0" />, text: 'Kill/Killed events (3 each) appear in the same player file — the telemetry server logged both killer and victim events to one client. Cross-player attribution is not possible.' },
            { icon: <Info size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />, text: 'Bots 1379, 1402, 1429 emit Position and Loot events (normally human event types). Classification is strictly by user_id: numeric IDs are bots, UUID strings are humans.' },
            { icon: <Info size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />, text: 'Loot events record spatial coordinates only — item type, rarity, and confirmation cannot be inferred from this dataset.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-[11px] font-mono text-slate-400">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
