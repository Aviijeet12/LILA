import { useState, useRef, useEffect, useCallback } from 'react';
import { TimelineRange } from '../utils/timelineMath';

export interface UseTimelinePlaybackResult {
  currentTs: number;
  isPlaying: boolean;
  speed: number;
  isCompleted: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  restart: () => void;
  seek: (ts: number) => void;
  seekProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
}

export function useTimelinePlayback(
  range: TimelineRange,
  initialSpeed: number = 1
): UseTimelinePlaybackResult {
  const { minTs, maxTs } = range;

  const [currentTs, setCurrentTs] = useState<number>(minTs);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<number>(initialSpeed);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentTsRef = useRef<number>(minTs);
  const isPlayingRef = useRef<boolean>(false);
  const speedRef = useRef<number>(initialSpeed);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Keep refs in sync
  currentTsRef.current = currentTs;
  isPlayingRef.current = isPlaying;
  speedRef.current = speed;

  // Reset or clamp when timeline range boundaries change
  useEffect(() => {
    if (minTs === 0 && maxTs === 0) {
      setCurrentTs(0);
      setIsPlaying(false);
      setIsCompleted(false);
      return;
    }

    // If current timestamp is outside new bounds, clamp to minTs
    if (currentTsRef.current < minTs || currentTsRef.current > maxTs) {
      setCurrentTs(minTs);
      currentTsRef.current = minTs;
      setIsCompleted(false);
    }
  }, [minTs, maxTs]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const play = useCallback(() => {
    if (maxTs <= minTs) return;

    // If at or past the end, restart from beginning
    if (currentTsRef.current >= maxTs) {
      currentTsRef.current = minTs;
      setCurrentTs(minTs);
      setIsCompleted(false);
    }

    setIsPlaying(true);
    isPlayingRef.current = true;
    lastTimeRef.current = performance.now();
  }, [minTs, maxTs]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const restart = useCallback(() => {
    pause();
    currentTsRef.current = minTs;
    setCurrentTs(minTs);
    setIsCompleted(false);
  }, [minTs, pause]);

  const seek = useCallback((ts: number) => {
    const clamped = Math.max(minTs, Math.min(maxTs, ts));
    currentTsRef.current = clamped;
    setCurrentTs(clamped);
    setIsCompleted(clamped >= maxTs);
  }, [minTs, maxTs]);

  const seekProgress = useCallback((progress: number) => {
    if (maxTs <= minTs) return;
    const ratio = Math.max(0, Math.min(100, progress)) / 100;
    const ts = Math.round(minTs + ratio * (maxTs - minTs));
    seek(ts);
  }, [minTs, maxTs, seek]);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    speedRef.current = newSpeed;
  }, []);

  // Main playback tick via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      if (lastTimeRef.current !== null) {
        const deltaSeconds = (now - lastTimeRef.current) / 1000;
        const advance = deltaSeconds * speedRef.current;
        const nextTs = currentTsRef.current + advance;

        if (nextTs >= maxTs) {
          currentTsRef.current = maxTs;
          setCurrentTs(maxTs);
          setIsPlaying(false);
          isPlayingRef.current = false;
          setIsCompleted(true);
          return;
        } else {
          currentTsRef.current = nextTs;
          setCurrentTs(Math.round(nextTs));
        }
      }

      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, maxTs]);

  return {
    currentTs,
    isPlaying,
    speed,
    isCompleted,
    play,
    pause,
    togglePlay,
    restart,
    seek,
    seekProgress,
    setSpeed,
  };
}
