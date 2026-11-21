import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OverviewPage } from "../features/overview/OverviewPage";
import { dataService } from "../services/dataService";

vi.mock("../services/dataService", () => ({
  dataService: {
    getGlobalStats: vi.fn(),
  },
}));

const mockStats = {
  dataset_name: "LILA BLACK ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Production Gameplay Telemetry",
  date_range: "2026-02-10 to 2026-02-14",
  total_matches: 796,
  total_unique_players: 339,
  total_unique_humans: 245,
  total_unique_bots: 94,
  total_journeys: 1242,
  total_raw_records: 89104,
  total_clean_records: 87599,
  total_movement_samples: 72849,
  total_discrete_events: 14750,
  total_distance_travelled_km: 1024.37,
  matches_per_map: { Lockdown: 171, AmbroseValley: 566, GrandRift: 59 },
  journeys_per_map: { Lockdown: 295, AmbroseValley: 836, GrandRift: 111 },
  matches_per_day: { "2026-02-10": 287, "2026-02-11": 197 },
  journeys_per_day: { "2026-02-10": 445, "2026-02-11": 283 },
  event_distribution_overall: { Position: 51137, BotPosition: 21712 },
  event_distribution_human: { Position: 50501 },
  event_distribution_bot: { BotPosition: 21712 },
  outcomes_overall: { ELIMINATED: 533, SURVIVED_PRESUMED: 709 },
};

describe("OverviewPage", () => {
  beforeEach(() => {
    vi.mocked(dataService.getGlobalStats).mockResolvedValue(mockStats as any);
  });

  it("renders loading state initially", () => {
    render(<OverviewPage />);
    // Skeletons should be present before data loads
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders KPI values after data loads", async () => {
    render(<OverviewPage />);
    await waitFor(() => {
      expect(screen.getAllByText("796").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("245")).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("1,242")).toBeInTheDocument();
  });

  it("renders SURVIVED_PRESUMED label (not extracted)", async () => {
    render(<OverviewPage />);
    await waitFor(() => {
      const labels = screen.getAllByText(/SURVIVED_PRESUMED/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  it("renders dataset limitations section", async () => {
    render(<OverviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Dataset Limitations/i)).toBeInTheDocument();
    });
  });

  it("renders error state when fetch fails", async () => {
    vi.mocked(dataService.getGlobalStats).mockRejectedValueOnce(new Error("Network error"));
    render(<OverviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load dataset/)).toBeInTheDocument();
    });
  });
});
