import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderHumanEmote,
  renderBotEmote,
  renderJourneyPath,
  isEventLayerActive,
} from '../features/map-explorer/utils/canvasRenderer';
import { Journey } from '../types/telemetry';

describe('canvasRenderer - Human vs Bot Visual Distinction', () => {
  let ctx: any;
  let strokeStylesSet: string[] = [];

  beforeEach(() => {
    strokeStylesSet = [];
    const stack: any[] = [];
    let curR = '', curG = '';

    ctx = {
      save: vi.fn(() => {
        stack.push({ strokeStyle: ctx.strokeStyle, fillStyle: ctx.fillStyle, globalAlpha: ctx.globalAlpha });
      }),
      restore: vi.fn(() => {
        const p = stack.pop();
        if (p) {
          ctx.strokeStyle = p.strokeStyle;
          ctx.fillStyle = p.fillStyle;
          ctx.globalAlpha = p.globalAlpha;
        }
      }),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      setLineDash: vi.fn(),
      roundRect: vi.fn(),
      fillStyle: '',
      get strokeStyle() { return curR; },
      set strokeStyle(val) { curR = val; strokeStylesSet.push(val); },
      lineWidth: 1,
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      lineCap: 'butt',
      lineJoin: 'miter',
    };
  });

  it('renders Human Operative Emote (Cyan Diamond / Visor Badge)', () => {
    renderHumanEmote(ctx, 100, 200, 10, { isSelected: true, isHead: true, zoom: 1.5 });

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(strokeStylesSet).toContain('#00D9F5');
    expect(ctx.moveTo).toHaveBeenCalledWith(100, 190);
    expect(ctx.lineTo).toHaveBeenCalledWith(110, 200);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 210);
    expect(ctx.lineTo).toHaveBeenCalledWith(90, 200);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders Bot Mech Emote (Amber Robot Box with Antenna & Sensor Eyes)', () => {
    renderBotEmote(ctx, 300, 400, 12, { isSelected: false, isHead: false, zoom: 1.0 });

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(strokeStylesSet).toContain('#FF9F1C');
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders Human Journey with solid Cyan high-contrast stroke', () => {
    const humanJourney: Journey = {
      journey_id: 'j-human-1',
      user_id: 'user-1',
      match_id: 'm-1',
      map_id: 'AmbroseValley',
      date: '2026-02-10',
      entity_type: 'human',
      start_ts: 100,
      end_ts: 200,
      duration_seconds: 100,
      distance_travelled_meters: 500,
      starting_position: { x: 0, y: 0, z: 0, u: 0.2, v: 0.3 },
      ending_position: { x: 10, y: 0, z: 10, u: 0.4, v: 0.5 },
      terminal_event: 'Survive',
      outcome: 'SURVIVED_PRESUMED',
      event_counts: {},
      positions_count: 2,
      discrete_events_count: 0,
      positions: [
        { ts: 100, x: 0, y: 0, z: 0, u: 0.2, v: 0.3 },
        { ts: 200, x: 10, y: 0, z: 10, u: 0.4, v: 0.5 },
      ],
      events: [],
    };

    renderJourneyPath(ctx, humanJourney, 2048, 2048, false, false, 1.0, null, true);

    expect(ctx.save).toHaveBeenCalled();
    expect(strokeStylesSet).toContain('#00D9F5');
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('renders Bot Journey with dashed high-contrast Amber stroke and dark casing', () => {
    const botJourney: Journey = {
      journey_id: 'j-bot-2',
      user_id: '1440',
      match_id: 'm-1',
      map_id: 'AmbroseValley',
      date: '2026-02-10',
      entity_type: 'bot',
      start_ts: 100,
      end_ts: 200,
      duration_seconds: 100,
      distance_travelled_meters: 300,
      starting_position: { x: 0, y: 0, z: 0, u: 0.5, v: 0.5 },
      ending_position: { x: 10, y: 0, z: 10, u: 0.6, v: 0.6 },
      terminal_event: 'BotKilled',
      outcome: 'ELIMINATED',
      event_counts: {},
      positions_count: 2,
      discrete_events_count: 0,
      positions: [
        { ts: 100, x: 0, y: 0, z: 0, u: 0.5, v: 0.5 },
        { ts: 200, x: 10, y: 0, z: 10, u: 0.6, v: 0.6 },
      ],
      events: [],
    };

    renderJourneyPath(ctx, botJourney, 2048, 2048, false, false, 1.0, null, true);

    expect(ctx.save).toHaveBeenCalled();
    expect(strokeStylesSet).toContain('#FF9F1C');
    expect(ctx.setLineDash).toHaveBeenCalledWith([8, 4]);
  });

  it('renders live head emote during timeline playback progression', () => {
    const botJourney: Journey = {
      journey_id: 'j-bot-3',
      user_id: '1440',
      match_id: 'm-1',
      map_id: 'AmbroseValley',
      date: '2026-02-10',
      entity_type: 'bot',
      start_ts: 100,
      end_ts: 200,
      duration_seconds: 100,
      distance_travelled_meters: 300,
      starting_position: { x: 0, y: 0, z: 0, u: 0.1, v: 0.1 },
      ending_position: { x: 10, y: 0, z: 10, u: 0.9, v: 0.9 },
      terminal_event: 'BotKilled',
      outcome: 'ELIMINATED',
      event_counts: {},
      positions_count: 2,
      discrete_events_count: 0,
      positions: [
        { ts: 100, x: 0, y: 0, z: 0, u: 0.1, v: 0.1 },
        { ts: 200, x: 10, y: 0, z: 10, u: 0.9, v: 0.9 },
      ],
      events: [],
    };

    renderJourneyPath(ctx, botJourney, 1000, 1000, true, false, 1.0, 150);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('filters active event layers correctly', () => {
    const layers = {
      human_trajectories: true,
      bot_trajectories: true,
      loot: true,
      bot_kill: false,
      bot_killed: true,
      killed_by_storm: false,
      kill: true,
      killed: false,
    };

    expect(isEventLayerActive('Loot', layers)).toBe(true);
    expect(isEventLayerActive('BotKill', layers)).toBe(false);
    expect(isEventLayerActive('BotKilled', layers)).toBe(true);
    expect(isEventLayerActive('KilledByStorm', layers)).toBe(false);
  });
});
