import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useTimelinePlayback } from '../features/map-explorer/hooks/useTimelinePlayback';
import { TimelineControls } from '../features/map-explorer/components/TimelineControls';
import { DiscreteEvent } from '../types/telemetry';

describe('useTimelinePlayback Hook', () => {
  const range = { minTs: 1000, maxTs: 1100, durationSeconds: 100 };

  it('initializes with paused state at minTs', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));
    expect(result.current.currentTs).toBe(1000);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.speed).toBe(1);
    expect(result.current.isCompleted).toBe(false);
  });

  it('updates playing state on play and pause', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));

    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('toggles playback with togglePlay', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('seeks to target timestamp and clamps within bounds', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));

    act(() => {
      result.current.seek(1050);
    });
    expect(result.current.currentTs).toBe(1050);

    act(() => {
      result.current.seek(900); // Below minTs
    });
    expect(result.current.currentTs).toBe(1000);

    act(() => {
      result.current.seek(1200); // Above maxTs
    });
    expect(result.current.currentTs).toBe(1100);
    expect(result.current.isCompleted).toBe(true);
  });

  it('restarts to minTs', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));

    act(() => {
      result.current.seek(1070);
    });
    expect(result.current.currentTs).toBe(1070);

    act(() => {
      result.current.restart();
    });
    expect(result.current.currentTs).toBe(1000);
    expect(result.current.isPlaying).toBe(false);
  });

  it('changes playback speed multiplier', () => {
    const { result } = renderHook(() => useTimelinePlayback(range));

    act(() => {
      result.current.setSpeed(2);
    });
    expect(result.current.speed).toBe(2);

    act(() => {
      result.current.setSpeed(4);
    });
    expect(result.current.speed).toBe(4);
  });
});

describe('TimelineControls Component', () => {
  const range = { minTs: 1000, maxTs: 1100, durationSeconds: 100 };
  const mockEvents: DiscreteEvent[] = [
    { event: 'Loot', ts: 1020, x: 0, y: 0, z: 0, u: 0.2, v: 0.2 },
    { event: 'BotKill', ts: 1060, x: 0, y: 0, z: 0, u: 0.6, v: 0.6 },
  ];

  it('renders time displays and total duration', () => {
    render(
      <TimelineControls
        range={range}
        currentTs={1030}
        isPlaying={false}
        speed={1}
        isCompleted={false}
        events={mockEvents}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    // Elapsed: 1030 - 1000 = 30s -> 00:30
    // Total duration: 100s -> 01:40
    expect(screen.getByText('00:30')).toBeInTheDocument();
    expect(screen.getByText('01:40')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('triggers onPlay when Play button is clicked', () => {
    const onPlay = vi.fn();
    render(
      <TimelineControls
        range={range}
        currentTs={1000}
        isPlaying={false}
        speed={1}
        isCompleted={false}
        events={mockEvents}
        onPlay={onPlay}
        onPause={vi.fn()}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Play Timeline'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('triggers onPause when Pause button is clicked while playing', () => {
    const onPause = vi.fn();
    render(
      <TimelineControls
        range={range}
        currentTs={1050}
        isPlaying={true}
        speed={1}
        isCompleted={false}
        events={mockEvents}
        onPlay={vi.fn()}
        onPause={onPause}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Pause Playback'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('triggers onRestart when Restart button is clicked', () => {
    const onRestart = vi.fn();
    render(
      <TimelineControls
        range={range}
        currentTs={1080}
        isPlaying={false}
        speed={1}
        isCompleted={false}
        events={mockEvents}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRestart={onRestart}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Restart from beginning'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('triggers onSetSpeed when speed pills are clicked', () => {
    const onSetSpeed = vi.fn();
    render(
      <TimelineControls
        range={range}
        currentTs={1000}
        isPlaying={false}
        speed={1}
        isCompleted={false}
        events={mockEvents}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={onSetSpeed}
      />
    );

    fireEvent.click(screen.getByText('2×'));
    expect(onSetSpeed).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByText('4×'));
    expect(onSetSpeed).toHaveBeenCalledWith(4);
  });

  it('renders completed badge when isCompleted is true', () => {
    render(
      <TimelineControls
        range={range}
        currentTs={1100}
        isPlaying={false}
        speed={1}
        isCompleted={true}
        events={mockEvents}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRestart={vi.fn()}
        onSeek={vi.fn()}
        onSeekProgress={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    expect(screen.getByText('Replay Complete')).toBeInTheDocument();
  });
});
