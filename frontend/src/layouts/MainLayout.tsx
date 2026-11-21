import React, { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PageLoadingFallback } from "../components/PageLoadingFallback";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Swords,
  Layers,
  Activity,
  Calendar,
  Database,
  Crosshair,
  Server,
  Bot
} from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "../components/ui/StatWidget";

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { path: "/map-explorer", label: "Map Explorer", icon: <MapPin size={16} /> },
  { path: "/players", label: "Player Intelligence", icon: <Users size={16} /> },
  { path: "/combat", label: "Combat Analysis", icon: <Swords size={16} /> },
  { path: "/regions", label: "Region Intelligence", icon: <Layers size={16} /> },
  { path: "/analyst", label: "AI Map Analyst", icon: <Bot size={16} /> }
];

export const MainLayout: React.FC = () => {
  const location = useLocation();

  const currentNav = NAV_ITEMS.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
  ) || NAV_ITEMS[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080B11] text-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0E131F] border-r border-[#1E293B] flex flex-col justify-between z-20">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#1E293B]">
            <div className="w-7 h-7 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
              <Crosshair size={18} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider font-mono text-[#F8FAFC]">
                LILA <span className="text-[#00E5FF]">BLACK</span>
              </div>
              <div className="text-[10px] text-[#94A3B8] font-mono tracking-widest uppercase">
                PLAYER INTELLIGENCE
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
              Core Telemetry
            </div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center justify-between px-3 py-2 rounded text-xs font-mono tracking-wide transition-colors",
                    isActive
                      ? "bg-[#151D2E] text-[#00E5FF] font-semibold border-l-2 border-[#00E5FF]"
                      : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D2E]/60 border-l-2 border-transparent"
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer / System Health */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0A0E17] text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <Server size={12} className="text-[#10B981]" />
              <span>Nakama Cluster</span>
            </span>
            <Badge variant="green" size="sm">ONLINE</Badge>
          </div>
          <div className="flex items-center justify-between text-[#64748B] text-[10px]">
            <span>Build v1.0.0 (Audited)</span>
            <span>5 Days Telemetry</span>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-[#0E131F]/90 backdrop-blur border-b border-[#1E293B] px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold font-mono tracking-wide text-[#F8FAFC]">
              {currentNav.label}
            </h1>
            <Badge variant="cyan" size="sm">
              <Activity size={10} className="inline mr-1 animate-pulse" />
              LIVE TELEMETRY
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#94A3B8] bg-[#151D2E] px-3 py-1 rounded border border-[#1E293B]">
              <Calendar size={13} className="text-[#00E5FF]" />
              <span>Feb 10 – 14, 2026 (UTC)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#94A3B8] bg-[#151D2E] px-3 py-1 rounded border border-[#1E293B]">
              <Database size={13} className="text-[#10B981]" />
              <span>87,599 Events</span>
            </div>
          </div>
        </header>

        {/* Main Viewport — Suspense is scoped here so the sidebar nav stays
            visible while a lazy route chunk is being fetched. */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080B11]">
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
