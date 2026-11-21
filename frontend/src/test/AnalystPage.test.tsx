import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalystPage } from '../features/analyst/AnalystPage';
import { dataService } from '../services/dataService';

// Mock dataService
vi.mock('../services/dataService', () => ({
  dataService: {
    getMapHeatmaps: vi.fn(),
    getEvents: vi.fn(),
  },
}));

function createMockGrid(size: number = 64, fillVal: number = 0): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row = new Array(size).fill(fillVal);
    grid.push(row);
  }
  return grid;
}

describe('AnalystPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockGrid = createMockGrid(64, 0);
    mockGrid[25][6] = 450;
    mockGrid[10][10] = 200;

    vi.mocked(dataService.getMapHeatmaps).mockResolvedValue({
      map_id: 'AmbroseValley',
      grid_size: 64,
      coordinate_system: 'UV',
      row_orientation: 'N to S',
      col_orientation: 'W to E',
      layers: {
        human_traffic: { name: 'Human Traffic', total_points: 650, max_cell_count: 450, active_cells_count: 2, grid: mockGrid },
        bot_traffic: { name: 'Bot Traffic', total_points: 300, max_cell_count: 100, active_cells_count: 1, grid: createMockGrid(64, 0) },
        loot: { name: 'Loot', total_points: 500, max_cell_count: 50, active_cells_count: 10, grid: createMockGrid(64, 0) },
        bot_kill: { name: 'BotKill', total_points: 40, max_cell_count: 10, active_cells_count: 4, grid: createMockGrid(64, 0) },
        bot_killed: { name: 'BotKilled', total_points: 20, max_cell_count: 5, active_cells_count: 2, grid: createMockGrid(64, 0) },
        killed_by_storm: { name: 'Storm', total_points: 2, max_cell_count: 1, active_cells_count: 2, grid: createMockGrid(64, 0) },
      } as any,
    });

    vi.mocked(dataService.getEvents).mockResolvedValue([
      { event: 'BotKill', ts: 1, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'BotKilled', ts: 2, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
      { event: 'KilledByStorm', ts: 3, x: 0, y: 0, z: 0, u: 0.5, v: 0.5, map_id: 'AmbroseValley' },
    ]);
  });

  it('renders initial analyst greeting, overview bar, and suggested questions', () => {
    render(
      <MemoryRouter>
        <AnalystPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome to the LILA BLACK AI Map Analyst/i)).toBeInTheDocument();
    expect(screen.getByText(/DETERMINISTIC GROUNDING/i)).toBeInTheDocument();
    expect(screen.getByText('Suggested Analytical Inquiries')).toBeInTheDocument();
    expect(screen.getByText('Which areas have the highest human movement activity?')).toBeInTheDocument();
  });

  it('processes a clicked suggested question and renders structured insights', async () => {
    render(
      <MemoryRouter>
        <AnalystPage />
      </MemoryRouter>
    );

    const questionBtn = screen.getByText('Which areas have the highest human movement activity?');
    fireEvent.click(questionBtn);

    await waitFor(() => {
      expect(screen.getByText(/Human Movement Hotspots — Ambrose Valley/i)).toBeInTheDocument();
      expect(screen.getByText('Total Human Pings')).toBeInTheDocument();
      expect(screen.getByText('Sector [R25, C6]')).toBeInTheDocument();
    });
  });

  it('rejects unsupported speculative inquiries with boundary disclosure', async () => {
    render(
      <MemoryRouter>
        <AnalystPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about movement hotspots/i);
    fireEvent.change(input, { target: { value: 'Who is the best player with highest K/D?' } });

    const submitBtn = screen.getByRole('button', { name: /Inquire/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Query Beyond Supported Telemetry Scope')).toBeInTheDocument();
      expect(screen.getByText(/LILA BLACK maintains strict analytical grounding/i)).toBeInTheDocument();
    });
  });

  it('resets conversation history when clear button is clicked', async () => {
    render(
      <MemoryRouter>
        <AnalystPage />
      </MemoryRouter>
    );

    // Ask a question first
    const questionBtn = screen.getByText('Which areas have the highest human movement activity?');
    fireEvent.click(questionBtn);

    await waitFor(() => {
      expect(screen.getByText(/Human Movement Hotspots — Ambrose Valley/i)).toBeInTheDocument();
    });

    // Click clear conversation button
    const clearBtn = screen.getByTitle('Clear Conversation History');
    fireEvent.click(clearBtn);

    expect(screen.getByText(/Conversation history cleared/i)).toBeInTheDocument();
    expect(screen.queryByText(/Human Movement Hotspots — Ambrose Valley/i)).not.toBeInTheDocument();
  });
});
