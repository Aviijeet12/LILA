import React, { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";

// Re-export so existing imports (e.g. tests) continue to work.
export { PageLoadingFallback } from "./components/PageLoadingFallback";

const OverviewPage = lazy(() =>
  import("./features/overview/OverviewPage").then((m) => ({ default: m.OverviewPage }))
);
const MapExplorerPage = lazy(() =>
  import("./features/map-explorer/MapExplorerPage").then((m) => ({ default: m.MapExplorerPage }))
);
const PlayerIntelligencePage = lazy(() =>
  import("./features/players/PlayerIntelligencePage").then((m) => ({ default: m.PlayerIntelligencePage }))
);
const PlayerGamePage = lazy(() =>
  import("./features/player-game/PlayerGamePage").then((m) => ({ default: m.PlayerGamePage }))
);
const CombatAnalysisPage = lazy(() =>
  import("./features/combat/CombatAnalysisPage").then((m) => ({ default: m.CombatAnalysisPage }))
);
const RegionIntelligencePage = lazy(() =>
  import("./features/regions/RegionIntelligencePage").then((m) => ({ default: m.RegionIntelligencePage }))
);
const AnalystPage = lazy(() =>
  import("./features/analyst/AnalystPage").then((m) => ({ default: m.AnalystPage }))
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* MainLayout renders the sidebar shell and wraps <Outlet /> in its own Suspense,
            so the nav is always visible while a lazy page chunk loads. */}
        <Route element={<MainLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/map-explorer" element={<MapExplorerPage />} />
          <Route path="/players" element={<PlayerIntelligencePage />} />
          <Route path="/player-game" element={<PlayerGamePage />} />
          <Route path="/combat" element={<CombatAnalysisPage />} />
          <Route path="/regions" element={<RegionIntelligencePage />} />
          <Route path="/analyst" element={<AnalystPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
