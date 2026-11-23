import React, { Suspense, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PageLoadingFallback } from "../components/PageLoadingFallback";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Swords,
  Layers,
  Calendar,
  Database,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronRight,
  Crosshair,
} from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "../components/ui/StatWidget";

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { path: "/map-explorer", label: "Map Explorer", icon: <MapPin size={16} /> },
  { path: "/players", label: "Player Intelligence", icon: <Users size={16} /> },
  { path: "/combat", label: "Combat Analysis", icon: <Swords size={16} /> },
  { path: "/regions", label: "Region Intelligence", icon: <Layers size={16} /> },
  { path: "/analyst", label: "AI Map Analyst", icon: <Bot size={16} /> },
];

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentNav =
    NAV_ITEMS.find((item) =>
      item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
    ) || NAV_ITEMS[0];

  return (
    <div className="relative isolate flex h-screen w-screen overflow-hidden bg-[#050505] text-[#F8FAFC]">
      <div className="game-world" aria-hidden="true">
        <span className="game-world__orb game-world__orb--cyan" />
        <span className="game-world__orb game-world__orb--violet" />
        <span className="game-world__horizon" />
        <span className="game-world__ring game-world__ring--one" />
        <span className="game-world__ring game-world__ring--two" />
        <span className="game-world__terrain game-world__terrain--far" />
        <span className="game-world__terrain game-world__terrain--near" />
        <span className="game-world__scanline" />
        <span className="game-world__cube game-world__cube--large">
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="game-world__cube game-world__cube--small">
          <i /><i /><i /><i /><i /><i />
        </span>
      </div>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar (Desktop Collapsible & Mobile Drawer) */}
      <aside
        className={clsx(
          "flex-shrink-0 glass-sidebar flex flex-col justify-between z-50 border-r border-[#292929] transition-all duration-200 shadow-2xl",
          // Mobile drawer positioning
          "fixed inset-y-0 left-0 lg:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64 w-64"
        )}
      >
        <div>
          {/* Brand Header */}
          <div className={clsx("h-14 px-3.5 flex items-center border-b border-[#292929] bg-[#090909]", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-10 rounded bg-black border border-[#292929] p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                <img
                  src="/lila-logo.png"
                  alt="LILA Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <div className="text-sm font-bold tracking-wider font-mono text-[#F8FAFC] flex items-center gap-1.5">
                    <span>LILA</span>
                    <span className="text-[#00D9F5] px-1 py-0.2 text-[9px] rounded bg-cyan-950/60 border border-cyan-500/30 uppercase tracking-widest font-semibold">
                      BLACK
                    </span>
                  </div>
                  <div className="text-[9px] text-[#94A3B8] font-mono tracking-wider uppercase truncate">
                    INTELLIGENCE
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex p-1 rounded text-slate-400 hover:text-[#00D9F5] hover:bg-white/5 transition-colors"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose size={15} />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded text-slate-400 hover:text-white"
              aria-label="Close Navigation"
            >
              <X size={18} />
            </button>
          </div>

          {/* Collapsed Expand Toggle Button */}
          {collapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-[#292929]">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded text-slate-400 hover:text-[#00D9F5] hover:bg-white/5 transition-colors"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen size={15} />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1">
            {!collapsed && (
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
                Navigation
              </div>
            )}
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center rounded-lg text-xs font-mono transition-all duration-150",
                    collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2",
                    isActive
                      ? "bg-cyan-500/10 text-[#00D9F5] font-semibold border-l-2 border-[#00D9F5]"
                      : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 border-l-2 border-transparent"
                  )
                }
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer / Dataset Metadata */}
        {!collapsed ? (
          <div className="p-3 border-t border-[#292929] bg-[#090909] text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[#94A3B8] text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14C995]" />
                <span>Dataset v1.0</span>
              </span>
              <span className="text-[#64748B]">87.6k records</span>
            </div>
            <div className="text-[10px] text-[#64748B] truncate">
              Feb 10 – 14, 2026 UTC
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-[#292929] bg-[#090909] flex justify-center">
            <span className="w-2 h-2 rounded-full bg-[#14C995]" title="Telemetry Dataset v1.0 Loaded" />
          </div>
        )}
      </aside>

      {/* Main Content Shell */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <div key={location.pathname} className="route-progress" aria-hidden="true">
          <span />
        </div>
        {/* Top Navbar */}
        <header className="h-14 glass-header px-4 sm:px-6 flex items-center justify-between z-10 border-b border-[#292929]">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Open Navigation Drawer"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <span className="hidden sm:inline text-slate-400">LILA BLACK</span>
              <ChevronRight size={12} className="hidden sm:inline text-slate-400" />
              <h1 className="text-sm font-bold text-[#F8FAFC]">
                {currentNav.label}
              </h1>
            </div>

            <Badge variant="slate" size="sm" className="hidden sm:inline-flex">
              TELEMETRY DATASET
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#94A3B8] bg-[#111111] border border-[#292929] px-2.5 py-1.5 rounded-lg">
              <Calendar size={13} className="text-[#00D9F5]" />
              <span className="hidden md:inline">Feb 10 – 14, 2026 (UTC)</span>
              <span className="md:hidden">Feb 10–14</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#94A3B8] bg-[#111111] border border-[#292929] px-2.5 py-1.5 rounded-lg">
              <Database size={13} className="text-[#14C995]" />
              <span>87,599 Records</span>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-transparent relative">
          <Suspense fallback={<PageLoadingFallback />}>
            <div key={location.pathname} className="route-screen-enter h-full">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
};
