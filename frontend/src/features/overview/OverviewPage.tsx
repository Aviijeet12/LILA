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
const CYAN   = "#00E5FF";
const GREEN  = "#10B981";
const AMBER  = "#F59E0B";
const ROSE   = "#F43F5E";
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

// â”€â”€â”€ Custom tooltip shared style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TooltipStyle: React.CSSProperties = {
  background:   "#0E131F",
  border:       "1px solid #1E293B",
  borderRadius: 6,
  fontSize:     11,
  fontFamily:   "ui-monospace, monospace",
  color:        "#F8FAFC",
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle} className="px-3 py-2 shadow-lg">
      <div className="text-[#94A3B8] text-[10px] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || CYAN }}>
          {p.name}: <span className="font-semibold">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={TooltipStyle} className="px-3 py-2 shadow-lg">
      <div className="text-[#94A3B8] text-[10px] mb-0.5">{name}</div>
      <div style={{ color: CYAN }} className="font-semibold">{value?.toLocaleString()}</div>
    </div>
  );
}

// â”€â”€â”€ Section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Section: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({
  title, sub, children,
}) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#94A3B8]">{title}</span>
      {sub && <span className="text-[10px] font-mono text-[#334155]">{sub}</span>}
      <div className="flex-1 h-px bg-[#1E293B]" />
    </div>
    {children}
  </div>
);

// â”€â”€â”€ Loading skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-[#151D2E] ${className}`} />
);

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const OverviewPage: React.FC = () => {
  const [stats, setStats]   = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    dataService.getGlobalStats()
      .then(setStats)
      .catch((e) => setError(e.message ?? "Failed to load global_stats.json"))
      .finally(() => setLoading(false));
  }, []);

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded border border-[#F43F5E]/30 bg-[#F43F5E]/5 text-sm font-mono text-[#F43F5E]">
        <AlertTriangle size={16} />
        <span>Failed to load dataset: {error}</span>
      </div>
    );
  }

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Derived chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dailyMatchData = Object.entries(stats.matches_per_day)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: date.slice(5),   // "02-10"
      matches: count,
      journeys: stats.journeys_per_day[date] ?? 0,
    }));

  const mapMatchData = Object.entries(stats.matches_per_map).map(([map, count]) => ({
    name: map,
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
    <div className="space-y-6">
      {/*  KPI Row  */}
      <Section title="Dataset Summary" sub={`${stats.date_range}  -  UTC`}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatWidget
            label="Total Matches"
            value={stats.total_matches.toLocaleString()}
            icon={<Trophy size={14} />}
            badge={<Badge variant="cyan">796</Badge>}
          />
          <StatWidget
            label="Human Players"
            value={stats.total_unique_humans.toLocaleString()}
            icon={<Users size={14} />}
            badge={<Badge variant="green">HUMAN</Badge>}
          />
          <StatWidget
            label="Bot Entities"
            value={stats.total_unique_bots.toLocaleString()}
            icon={<Bot size={14} />}
            badge={<Badge variant="amber">BOT</Badge>}
          />
          <StatWidget
            label="Clean Records"
            value={stats.total_clean_records.toLocaleString()}
            subtext={`${(stats.total_raw_records - stats.total_clean_records).toLocaleString()} dupes removed`}
            icon={<Zap size={14} />}
          />
          <StatWidget
            label="Journeys"
            value={stats.total_journeys.toLocaleString()}
            subtext="1 dup file skipped"
            icon={<Route size={14} />}
          />
          <StatWidget
            label="Total Distance"
            value={`${stats.total_distance_travelled_km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`}
            icon={<Footprints size={14} />}
            subtext="Euclidean, all players"
          />
        </div>
      </Section>

      {/*  Daily Activity  */}
      <Section title="Match Distribution by Day">
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyMatchData} barGap={4}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#1E293B55" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: "#94A3B8" }}
              />
              <Bar isAnimationActive={false} dataKey="matches"  name="Matches"  fill={CYAN}  radius={[3,3,0,0]} maxBarSize={40} />
              <Bar isAnimationActive={false} dataKey="journeys" name="Journeys" fill={GREEN} radius={[3,3,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] font-mono text-[#334155] mt-2">
            Note: 1 match recorded on 2026-02-09 â€” likely a timezone boundary event. Core dataset is Feb 10â€“14.
          </p>
        </div>
      </Section>

      {/*  Map + Outcome row  */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Map distribution */}
        <Section title="Map Distribution">
          <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mapMatchData} layout="vertical" barGap={4}>
                <XAxis
                  type="number"
                  tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#1E293B55" }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: "#94A3B8" }}
                />
                <Bar isAnimationActive={false} dataKey="matches"  name="Matches"  radius={[0,3,3,0]} maxBarSize={18}>
                  {mapMatchData.map((entry) => (
                    <Cell key={entry.name} fill={MAP_COLOURS[entry.name] ?? SLATE} />
                  ))}
                </Bar>
                <Bar isAnimationActive={false} dataKey="journeys" name="Journeys" fill={SLATE} radius={[0,3,3,0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Outcome distribution */}
        <Section title="Outcome Distribution" sub="SURVIVED_PRESUMED = no Killed event observed">
          <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-4">
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie isAnimationActive={false} data={outcomeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
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
              <div className="flex-1 space-y-2.5">
                {outcomeData.map((entry) => {
                  const pct = ((entry.value / (stats.total_journeys)) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: OUTCOME_COLOURS[entry.name] ?? SLATE }}
                          />
                          <span className="text-[#94A3B8] text-[11px]">
                            {entry.name === "SURVIVED_PRESUMED" ? "SURVIVED_PRESUMED" : entry.name}
                          </span>
                        </span>
                        <span className="text-[#F8FAFC] font-semibold">{entry.value.toLocaleString()}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#1E293B]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: OUTCOME_COLOURS[entry.name] ?? SLATE,
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B]">{pct}% of journeys</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/*  Event Breakdown  */}
      <Section title="Event Distribution" sub="All 87,599 clean records">
        <div className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eventData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748B", fontSize: 10, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace,monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#1E293B55" }} />
                <Bar isAnimationActive={false} dataKey="count" name="Events" radius={[3,3,0,0]} maxBarSize={36}>
                  {eventData.map((entry, i) => (
                    <Cell key={entry.name} fill={EVENT_COLOURS[i % EVENT_COLOURS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-1.5">
              {eventData.map((entry, i) => {
                const pct = ((entry.count / totalEvents) * 100).toFixed(1);
                return (
                  <div key={entry.name} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: EVENT_COLOURS[i % EVENT_COLOURS.length] }}
                    />
                    <span className="text-[#94A3B8] w-28 truncate">{entry.name}</span>
                    <div className="flex-1 h-1 rounded-full bg-[#151D2E]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: EVENT_COLOURS[i % EVENT_COLOURS.length],
                        }}
                      />
                    </div>
                    <span className="text-[#64748B] text-[10px] w-10 text-right">{pct}%</span>
                    <span className="text-[#F8FAFC] w-14 text-right">{entry.count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/*  Human vs Bot Participation  */}
      <Section title="Human vs Bot Participation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Human Events", data: stats.event_distribution_human, colour: CYAN },
            { label: "Bot Events",   data: stats.event_distribution_bot,   colour: AMBER },
          ].map(({ label, data, colour }) => {
            const entries = Object.entries(data).sort(([,a],[,b]) => b-a);
            const total   = entries.reduce((s,[,v]) => s+v, 0);
            return (
              <div key={label} className="bg-[#0E131F] border border-[#1E293B] rounded-lg p-4">
                <div className="text-xs font-mono text-[#94A3B8] mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                    {label}
                  </span>
                  <span className="text-[#64748B]">{total.toLocaleString()} total</span>
                </div>
                <div className="space-y-1.5">
                  {entries.map(([name, count]) => {
                    const pct = ((count / total) * 100).toFixed(1);
                    return (
                      <div key={name} className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#94A3B8] w-28 truncate">{name}</span>
                        <div className="flex-1 h-1 rounded-full bg-[#151D2E]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colour }} />
                        </div>
                        <span className="text-[#64748B] text-[10px] w-10 text-right">{pct}%</span>
                        <span className="text-[#F8FAFC] w-12 text-right">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/*  Dataset Limitations  */}
      <Section title="Dataset Limitations &amp; Assumptions">
        <div className="bg-[#0A0E17] border border-[#1E293B] rounded-lg p-4 space-y-2">
          {[
            { icon: <Info size={12} className="text-[#00E5FF] mt-0.5 flex-shrink-0" />, text: 'No extraction event exists in the schema. "SURVIVED_PRESUMED" means the journey ended without a Killed or KilledByStorm event â€” survival is inferred, not confirmed.' },
            { icon: <Info size={12} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />, text: 'Timestamps are stored as Unix epoch seconds (int64). The Parquet schema declares timestamp[ms] but values are seconds â€” corrected in the pipeline.' },
            { icon: <Info size={12} className="text-[#A855F7] mt-0.5 flex-shrink-0" />, text: '1 duplicate Parquet file detected (February_11/cfa03e9f). Its 88 rows are excluded; the February_10 copy is the canonical record.' },
            { icon: <Info size={12} className="text-[#10B981] mt-0.5 flex-shrink-0" />, text: 'Kill/Killed events (3 each) appear in the same player file â€” the telemetry server logged both killer and victim events to one client. Cross-player attribution is not possible.' },
            { icon: <Info size={12} className="text-[#64748B] mt-0.5 flex-shrink-0" />, text: 'Bots 1379, 1402, 1429 emit Position and Loot events (normally human event types). Classification is strictly by user_id: numeric IDs are bots, UUID strings are humans.' },
            { icon: <Info size={12} className="text-[#64748B] mt-0.5 flex-shrink-0" />, text: 'No item metadata is available. Loot events record position only â€” item type, rarity, and pickup confirmation cannot be inferred from this dataset.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-2 text-[11px] font-mono text-[#64748B]">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
