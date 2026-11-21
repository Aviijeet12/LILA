import React from "react";
import { Activity } from "lucide-react";

/**
 * Shown while a lazy-loaded route chunk is being fetched.
 * Exported from its own module so it can be imported by both
 * App.tsx (outer Suspense safety net) and MainLayout.tsx
 * (inner Suspense that wraps only the <Outlet />) without creating
 * a circular dependency.
 */
export const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3 text-[#64748B]">
      <Activity size={28} className="text-[#3B82F6] animate-pulse" />
      <span className="text-sm font-medium tracking-wide">Loading Module...</span>
    </div>
  </div>
);

export default PageLoadingFallback;
