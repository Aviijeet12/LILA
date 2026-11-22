import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Bot,
  MapPin,
  Clock,
  Route,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Flame,
  Award,
  Calendar,
  Layers,
  Crosshair,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { clsx } from 'clsx';
import { dataService } from '../../services/dataService';
import {
  PlayerSummary,
  Journey,
  DiscreteEvent,
  MapId,
  PositionSample,
} from '../../types/telemetry';
import {
  formatDuration,
  formatTimestampUTC,
  timestampToProgress,
  progressToTimestamp,
  interpolatePosition,
} from '../map-explorer/utils/timelineMath';
import { EVENT_STYLES, renderHumanEmote, renderBotEmote } from '../map-explorer/utils/canvasRenderer';
import { mapPixelToWorld } from '../map-explorer/utils/spatialMath';

const MAP_DIMS: Record<MapId, { w: number; h: number }> = {
  AmbroseValley: { w: 2048, h: 2048 },
  GrandRift:     { w: 2048, h: 2046 },
  Lockdown:      { w: 2048, h: 2048 },
};

export interface PlayerGameViewProps {
  initialPlayerId?: string;
  initialMatchId?: string;
  initialMapId?: MapId;
  onBack?: () => void;
}

export const PlayerGameView: React.FC<PlayerGameViewProps> = ({
  initialPlayerId,
  initialMatchId,
  initialMapId,
  onBack,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    initialPlayerId || searchParams.get('player') || searchParams.get('user') || ''
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialMatchId || searchParams.get('match') || ''
  );
  const [selectedMapId, setSelectedMapId] = useState<MapId>(
    initialMapId || (searchParams.get('map') as MapId) || 'AmbroseValley'
  );

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatchContext, setShowMatchContext] = useState<boolean>(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTs, setCurrentTs] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Canvas viewport state & ResizeObserver
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorCoord, setCursorCoord] = useState<{
    x: number;
    z: number;
    u: number;
    v: number;
  } | null>(null);

  const dims = MAP_DIMS[selectedMapId] || { w: 2048, h: 2048 };

  // Observe container size smoothly
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ w: Math.round(width), h: Math.round(height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // 1. Load players list on mount
  useEffect(() => {
    dataService
      .getPlayers()
      .then((data) => {
        setPlayers(data);
        if (!selectedPlayerId && data.length > 0) {
          setSelectedPlayerId(data[0].user_id);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load players'));
  }, []);

  // Active player object
  const activePlayer = useMemo(() => {
    return players.find((p) => p.user_id === selectedPlayerId) ?? null;
  }, [players, selectedPlayerId]);

  // When active player changes, determine primary map & match if not explicitly set
  useEffect(() => {
    if (!activePlayer) return;

    // Detect primary map
    const mapEntries = Object.entries(activePlayer.maps_played || {});
    mapEntries.sort((a, b) => b[1] - a[1]);
    const detectedMap = (mapEntries.length > 0 ? mapEntries[0][0] : 'AmbroseValley') as MapId;

    if (!initialMapId && !searchParams.get('map')) {
      setSelectedMapId(detectedMap);
    }

    // Detect match
    const pMatches = activePlayer.matches || [];
    if (pMatches.length > 0) {
      const firstMatchId =
        typeof pMatches[0] === 'string'
          ? pMatches[0]
          : (pMatches[0] as any)?.match_id || '';
      if (!selectedMatchId || !pMatches.some((m) => (typeof m === 'string' ? m : (m as any)?.match_id) === selectedMatchId)) {
        setSelectedMatchId(firstMatchId);
      }
    }
  }, [activePlayer]);

  // 2. Load map journeys when selectedMapId changes
  useEffect(() => {
    setLoading(true);
    dataService
      .getMapJourneys(selectedMapId)
      .then((data) => {
        setJourneys(data);
      })
      .catch((err) => setError(err.message || 'Failed to load map trajectories'))
      .finally(() => setLoading(false));
  }, [selectedMapId]);

  // 3. Find this player's journey for this game
  const playerJourney = useMemo(() => {
    if (!selectedPlayerId) return null;
    if (selectedMatchId) {
      const matchJ = journeys.find(
        (j) => j.user_id === selectedPlayerId && j.match_id === selectedMatchId
      );
      if (matchJ) return matchJ;
    }
    // Fallback: any journey of this player in this map
    return journeys.find((j) => j.user_id === selectedPlayerId) ?? null;
  }, [journeys, selectedPlayerId, selectedMatchId]);

  // Other journeys in the same match for context
  const otherMatchJourneys = useMemo(() => {
    if (!playerJourney) return [];
    return journeys.filter(
      (j) => j.match_id === playerJourney.match_id && j.journey_id !== playerJourney.journey_id
    );
  }, [journeys, playerJourney]);

  // Sync timeline bounds to the player's journey
  const minTs = playerJourney?.start_ts || 0;
  const maxTs = playerJourney?.end_ts || 0;
  const durationSeconds = Math.max(1, maxTs - minTs);

  useEffect(() => {
    setCurrentTs(minTs);
    setIsPlaying(false);
    setIsCompleted(false);
  }, [minTs, maxTs, selectedMatchId, selectedPlayerId]);

  // Timeline playback animation frame loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const currentTsRef = useRef<number>(minTs);
  currentTsRef.current = currentTs;

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const nextTs = currentTsRef.current + deltaSec * speed;
      if (nextTs >= maxTs) {
        setCurrentTs(maxTs);
        setIsPlaying(false);
        setIsCompleted(true);
      } else {
        setCurrentTs(nextTs);
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, maxTs, speed]);

  // Load minimap WebP
  useEffect(() => {
    const img = new Image();
    img.src = dataService.getMinimapUrl(selectedMapId);
    img.onload = () => {
      imgRef.current = img;
      renderScene();
    };
    img.onerror = () => {
      imgRef.current = null;
      renderScene();
    };
  }, [selectedMapId]);

  // Camera initial fit & auto-frame on player's trajectory
  const fitToPlayer = useCallback(() => {
    const cW = containerSize.w > 0 ? containerSize.w : containerRef.current?.getBoundingClientRect().width || 0;
    const cH = containerSize.h > 0 ? containerSize.h : containerRef.current?.getBoundingClientRect().height || 0;
    if (cW === 0 || cH === 0) return;

    if (!playerJourney || !playerJourney.positions || playerJourney.positions.length === 0) {
      // Fit entire theater map into viewport
      const fitZoom = Math.min(cW / dims.w, cH / dims.h) * 0.95;
      setZoom(fitZoom);
      setPan({
        x: (cW - dims.w * fitZoom) / 2,
        y: (cH - dims.h * fitZoom) / 2,
      });
      return;
    }

    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of playerJourney.positions) {
      if (p.u < minU) minU = p.u;
      if (p.u > maxU) maxU = p.u;
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }

    const pixelMinX = minU * dims.w;
    const pixelMaxX = maxU * dims.w;
    const pixelMinY = (1 - maxV) * dims.h;
    const pixelMaxY = (1 - minV) * dims.h;

    const boxW = Math.max(100, pixelMaxX - pixelMinX);
    const boxH = Math.max(100, pixelMaxY - pixelMinY);
    const centerX = (pixelMinX + pixelMaxX) / 2;
    const centerY = (pixelMinY + pixelMaxY) / 2;

    const scaleX = (cW * 0.70) / boxW;
    const scaleY = (cH * 0.70) / boxH;
    const targetZoom = Math.max(0.35, Math.min(3.5, Math.min(scaleX, scaleY)));

    setZoom(targetZoom);
    setPan({
      x: cW / 2 - centerX * targetZoom,
      y: cH / 2 - centerY * targetZoom,
    });
  }, [containerSize, playerJourney, dims.w, dims.h]);

  // Re-fit whenever journey, match, map, or container size changes
  useLayoutEffect(() => {
    fitToPlayer();
  }, [fitToPlayer]);

  // Canvas drawing
  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cW = containerSize.w > 0 ? containerSize.w : containerRef.current?.getBoundingClientRect().width || 0;
    const cH = containerSize.h > 0 ? containerSize.h : containerRef.current?.getBoundingClientRect().height || 0;
    if (cW === 0 || cH === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cW * dpr;
    canvas.height = cH * dpr;
    canvas.style.width = `${cW}px`;
    canvas.style.height = `${cH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cW, cH);

    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw minimap image
    const img = imgRef.current;
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, dims.w, dims.h);
    } else {
      ctx.fillStyle = '#080D14';
      ctx.fillRect(0, 0, dims.w, dims.h);
    }

    // 2. Draw match context (other participants in this game)
    if (showMatchContext && otherMatchJourneys.length > 0) {
      for (const oj of otherMatchJourneys) {
        if (!oj.positions || oj.positions.length < 2) continue;
        const isOHuman = oj.entity_type === 'human';

        ctx.save();
        // Dark contrast casing
        ctx.beginPath();
        const p0 = oj.positions[0];
        ctx.moveTo(p0.u * dims.w, (1 - p0.v) * dims.h);
        for (let i = 1; i < oj.positions.length; i++) {
          const pt = oj.positions[i];
          ctx.lineTo(pt.u * dims.w, (1 - pt.v) * dims.h);
        }
        ctx.strokeStyle = 'rgba(5, 10, 18, 0.6)';
        ctx.lineWidth = 3.0 / zoom;
        ctx.setLineDash([]);
        ctx.stroke();

        // Main participant dashed line
        ctx.strokeStyle = isOHuman ? 'rgba(0, 217, 245, 0.45)' : 'rgba(255, 159, 28, 0.6)';
        ctx.lineWidth = 1.8 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.restore();

        // If playing back or scrubbing, draw other participant live emote
        if ((isPlaying || currentTs > minTs) && currentTs >= oj.start_ts && currentTs <= oj.end_ts) {
          const oInterp = interpolatePosition(oj.positions, currentTs);
          if (oInterp) {
            const oX = oInterp.u * dims.w;
            const oY = (1 - oInterp.v) * dims.h;
            const oSize = Math.max(4.0, 6.5 / zoom);
            if (isOHuman) {
              renderHumanEmote(ctx, oX, oY, oSize, { isHead: true, zoom });
            } else {
              renderBotEmote(ctx, oX, oY, oSize, { isHead: true, zoom });
            }
          }
        }
      }
    }

    // 3. Draw active player's trajectory
    if (playerJourney && playerJourney.positions && playerJourney.positions.length > 0) {
      const isHuman = playerJourney.entity_type === 'human';
      const mainColor = isHuman ? '#00D9F5' : '#FF9F1C';

      // Past path up to currentTs
      const visiblePositions =
        isPlaying || currentTs > minTs
          ? playerJourney.positions.filter((p) => p.ts <= currentTs)
          : playerJourney.positions;

      // Glow behind path
      if (visiblePositions.length >= 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(visiblePositions[0].u * dims.w, (1 - visiblePositions[0].v) * dims.h);
        for (let i = 1; i < visiblePositions.length; i++) {
          const pt = visiblePositions[i];
          ctx.lineTo(pt.u * dims.w, (1 - pt.v) * dims.h);
        }
        // Dark contrast casing
        ctx.strokeStyle = 'rgba(5, 10, 18, 0.85)';
        ctx.lineWidth = 5.5 / zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Glow
        ctx.shadowColor = isHuman ? 'rgba(0, 217, 245, 0.9)' : 'rgba(255, 159, 28, 0.9)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.8 / zoom;
        if (!isHuman) {
          ctx.setLineDash([8 / zoom, 4 / zoom]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Starting Position Pin - Custom Entity Emote!
      const startP = playerJourney.positions[0];
      const startX = startP.u * dims.w;
      const startY = (1 - startP.v) * dims.h;
      const spawnEmoteSize = Math.max(5.0, 7.5 / zoom);

      if (isHuman) {
        renderHumanEmote(ctx, startX, startY, spawnEmoteSize, { zoom });
      } else {
        renderBotEmote(ctx, startX, startY, spawnEmoteSize, { zoom });
      }

      // Ending Position Pin (if game finished or showing full overview)
      if (!isPlaying && (currentTs >= maxTs || currentTs === minTs)) {
        const endP = playerJourney.positions[playerJourney.positions.length - 1];
        const endX = endP.u * dims.w;
        const endY = (1 - endP.v) * dims.h;
        const isSurvived = playerJourney.outcome === 'SURVIVED_PRESUMED';

        ctx.save();
        ctx.beginPath();
        if (isSurvived) {
          ctx.fillStyle = '#10B981';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.6 / zoom;
          ctx.moveTo(endX, endY - 6 / zoom);
          ctx.lineTo(endX + 6 / zoom, endY);
          ctx.lineTo(endX, endY + 6 / zoom);
          ctx.lineTo(endX - 6 / zoom, endY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#EF4444';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.6 / zoom;
          ctx.rect(endX - 5 / zoom, endY - 5 / zoom, 10 / zoom, 10 / zoom);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Discrete events along the path
      for (const ev of playerJourney.events || []) {
        if (isPlaying && ev.ts > currentTs) continue;
        const evX = ev.u * dims.w;
        const evY = (1 - ev.v) * dims.h;
        const color = EVENT_STYLES[ev.event]?.color || '#00D9F5';

        ctx.save();
        ctx.beginPath();
        ctx.arc(evX, evY, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#080D14';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.restore();
      }

      // Interpolated Live Avatar Position with Custom Emote!
      if (isPlaying || currentTs > minTs) {
        const interp = interpolatePosition(playerJourney.positions, currentTs);
        if (interp) {
          const aX = interp.u * dims.w;
          const aY = (1 - interp.v) * dims.h;
          const headSize = Math.max(6.5, 10 / zoom);

          if (isHuman) {
            renderHumanEmote(ctx, aX, aY, headSize, { isSelected: true, isHead: true, zoom });
          } else {
            renderBotEmote(ctx, aX, aY, headSize, { isSelected: true, isHead: true, zoom });
          }
        }
      }
    }

    ctx.restore();
  }, [containerSize, pan, zoom, dims.w, dims.h, showMatchContext, otherMatchJourneys, playerJourney, isPlaying, currentTs, minTs, maxTs]);

  // Synchronous and RAF rendering
  useEffect(() => {
    renderScene();
  }, [renderScene]);

  // Native non-passive wheel zoom isolation (Prevents webpage from zooming!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(8.0, Math.max(0.2, prevZoom * factor));
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom),
          y: mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom),
        }));
        return nextZoom;
      });
    };

    canvas.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  // Mouse pan handlers
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }

    // Update cursor coordinate readout
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const mapPixelX = (mouseX - pan.x) / zoom;
      const mapPixelY = (mouseY - pan.y) / zoom;
      const u = Math.max(0, Math.min(1, mapPixelX / dims.w));
      const v = Math.max(0, Math.min(1, 1 - mapPixelY / dims.h));
      const world = mapPixelToWorld(mapPixelX, mapPixelY, selectedMapId, dims.w, dims.h);
      setCursorCoord({ x: Math.round(world.x), z: Math.round(world.z), u, v });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Scrubber drag / click
  const scrubberTrackRef = useRef<HTMLDivElement>(null);
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberTrackRef.current || maxTs <= minTs) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = progressToTimestamp(ratio * 100, minTs, maxTs);
    setCurrentTs(target);
    setIsCompleted(false);
  };

  const elapsedSeconds = Math.max(0, currentTs - minTs);
  const progressPercent = timestampToProgress(currentTs, minTs, maxTs);

  return (
    <div className="flex flex-col h-full max-h-full w-full overflow-hidden gap-2 text-[#F8FAFC]">
      {/* Top Tactical Command Header */}
      <div className="flex-shrink-0 bg-[#101925] border border-[#1E2B3E] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                navigate('/players');
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#172435] text-[#94A3B8] hover:text-[#00D9F5] border border-[#1E2B3E] hover:border-[#00D9F5]/40 transition-colors flex items-center gap-1.5 text-xs font-mono font-medium"
            title="Return to Player Intelligence Directory"
          >
            <ArrowLeft size={14} />
            <span>Back to Players</span>
          </button>

          <div className="h-4 w-px bg-[#1E2B3E]" />

          {/* Player Selector */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#00D9F5]/10 text-[#00D9F5] border border-[#00D9F5]/30">
              {activePlayer?.entity_type === 'human' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">
                Inspected Player
              </div>
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  setSelectedMatchId('');
                }}
                className="bg-[#172435] border border-[#1E2B3E] rounded px-2 py-0.5 text-xs font-mono font-bold text-[#F8FAFC] focus:outline-none focus:border-[#00D9F5]"
              >
                {players.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.user_id} ({p.entity_type === 'human' ? 'Human' : 'Bot'}, {p.matches_played}m)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Match, Map Selectors and Context Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Match Dropdown */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">
              Selected Match
            </div>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-[#172435] border border-[#1E2B3E] rounded px-2 py-0.5 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9F5] max-w-[200px] truncate"
            >
              {(activePlayer?.matches || []).map((mItem, idx) => {
                const mId = typeof mItem === 'string' ? mItem : (mItem as any)?.match_id || `match-${idx}`;
                return (
                  <option key={mId} value={mId}>
                    {mId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Map Selector */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">
              Theater Map
            </div>
            <select
              value={selectedMapId}
              onChange={(e) => setSelectedMapId(e.target.value as MapId)}
              className="bg-[#172435] border border-[#1E2B3E] rounded px-2 py-0.5 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9F5]"
            >
              <option value="AmbroseValley">Ambrose Valley</option>
              <option value="GrandRift">Grand Rift</option>
              <option value="Lockdown">Lockdown</option>
            </select>
          </div>

          {/* Ghost Context Toggle */}
          <button
            type="button"
            onClick={() => setShowMatchContext(!showMatchContext)}
            className={clsx(
              'mt-3 px-2 py-1 rounded text-xs font-mono transition-colors border flex items-center gap-1.5',
              showMatchContext
                ? 'bg-[#00D9F5]/15 text-[#00D9F5] border-[#00D9F5]/40'
                : 'bg-[#172435] text-[#64748B] border-[#1E2B3E] hover:text-[#94A3B8]'
            )}
            title="Toggle ghost trajectories of other match participants"
          >
            {showMatchContext ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Match Context</span>
          </button>
        </div>
      </div>

      {/* Player Game Summary Dossier Bar */}
      {playerJourney && (
        <div className="flex-shrink-0 bg-[#101925]/95 border border-[#1E2B3E] rounded-xl px-4 py-2 font-mono text-xs flex items-center justify-between gap-3 flex-wrap shadow-md">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[9px] text-[#64748B] block">Outcome</span>
              <span
                className={clsx(
                  'font-bold px-1.5 py-0.2 rounded text-[10px] border',
                  playerJourney.outcome === 'SURVIVED_PRESUMED'
                    ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40'
                )}
              >
                {playerJourney.outcome} ({playerJourney.terminal_event})
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#64748B] block">Game Duration</span>
              <span className="text-[#F8FAFC] font-semibold text-xs">
                {formatDuration(playerJourney.duration_seconds)}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#64748B] block">Distance Travelled</span>
              <span className="text-[#00D9F5] font-semibold text-xs">
                {(playerJourney.distance_travelled_meters).toFixed(0)} meters
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#64748B] block">Waypoints</span>
              <span className="text-[#F8FAFC] font-semibold text-xs">
                {playerJourney.positions_count} samples (~1 Hz)
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#64748B] block">Loot Events</span>
              <span className="text-[#10B981] font-semibold text-xs">
                {playerJourney.event_counts?.Loot || 0}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#64748B] block">Combat BotKills</span>
              <span className="text-[#F5A623] font-semibold text-xs">
                {playerJourney.event_counts?.BotKill || 0}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#64748B] text-right hidden sm:block">
            <span>Start: [{Math.round(playerJourney.starting_position.x)}, {Math.round(playerJourney.starting_position.z)}]</span>
            <span className="mx-1.5">•</span>
            <span>End: [{Math.round(playerJourney.ending_position.x)}, {Math.round(playerJourney.ending_position.z)}]</span>
          </div>
        </div>
      )}

      {/* Main Middle Section: Map Canvas Viewport + Sidebar Event Log */}
      <div className="flex-1 min-h-0 flex gap-2.5 overflow-hidden">
        {/* Left Map Viewport */}
        <div
          ref={containerRef}
          className="flex-1 min-w-0 min-h-0 relative rounded-xl overflow-hidden border border-[#1E2B3E] bg-[#080D14] shadow-2xl select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ touchAction: 'none' }}
        >
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Quick Zoom Pill HUD */}
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-[#0A0E17]/90 backdrop-blur-md border border-[#1E2B3E] rounded-lg p-1 font-mono text-[11px] shadow-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(8.0, z * 1.25))}
              className="w-6 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#00D9F5] hover:bg-[#101925] transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.2, z / 1.25))}
              className="w-6 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#00D9F5] hover:bg-[#101925] transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut size={13} />
            </button>
            <div className="h-3.5 w-px bg-[#1E2B3E] mx-0.5" />
            <button
              type="button"
              onClick={fitToPlayer}
              className="px-1.5 h-6 flex items-center justify-center rounded text-[#94A3B8] hover:text-[#00D9F5] hover:bg-[#101925] transition-colors text-[10px] font-semibold"
              title="Fit to Player's Path"
            >
              FIT
            </button>
            <span className="text-[10px] text-[#64748B] px-1 font-mono">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Coordinates HUD */}
          {cursorCoord && (
            <div className="absolute bottom-2.5 left-2.5 z-20 bg-[#0A0E17]/90 backdrop-blur-md border border-[#1E2B3E] rounded px-2 py-0.5 font-mono text-[10px] text-[#64748B] flex items-center gap-2">
              <span>World: <strong className="text-[#F8FAFC]">[{cursorCoord.x}, {cursorCoord.z}]</strong></span>
              <span>•</span>
              <span>UV: <strong className="text-[#00D9F5]">[{cursorCoord.u.toFixed(3)}, {cursorCoord.v.toFixed(3)}]</strong></span>
            </div>
          )}
        </div>

        {/* Right Sidebar: Chronological Game Event Feed */}
        <aside className="w-72 flex-shrink-0 flex flex-col min-h-0 bg-[#101925] border border-[#1E2B3E] rounded-xl p-3 shadow-xl overflow-hidden">
          <div className="flex-shrink-0 text-[11px] font-mono uppercase tracking-wider text-[#64748B] border-b border-[#1E2B3E] pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity size={12} className="text-[#00D9F5]" /> Game Event Feed
            </span>
            <span className="text-[#F8FAFC] font-bold">
              {playerJourney?.events?.length || 0}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar font-mono text-xs pt-2">
            {(!playerJourney?.events || playerJourney.events.length === 0) ? (
              <div className="text-center text-[#64748B] py-8 text-[11px]">
                No discrete events recorded in this game session.
              </div>
            ) : (
              playerJourney.events.map((ev, idx) => {
                const color = EVENT_STYLES[ev.event]?.color || '#00D9F5';
                const isPast = ev.ts <= currentTs;
                const offsetSec = ev.ts - minTs;
                return (
                  <div
                    key={`${ev.ts}-${idx}`}
                    onClick={() => {
                      setCurrentTs(ev.ts);
                      setIsCompleted(false);
                    }}
                    className={clsx(
                      'p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between',
                      isPast
                        ? 'bg-[#172435] border-[#00D9F5]/30 text-[#F8FAFC]'
                        : 'bg-[#0A0E17]/60 border-[#1E2B3E] text-[#64748B] hover:bg-[#172435]/60 hover:text-[#94A3B8]'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-[11px]">{ev.event}</div>
                        <div className="text-[10px] text-[#64748B] truncate">
                          [{Math.round(ev.x)}, {Math.round(ev.z)}]
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] text-[#00D9F5] font-semibold">
                        +{formatDuration(offsetSec)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Timeline Playback Bar */}
      <div className="flex-shrink-0 bg-[#0A0E17]/95 backdrop-blur-md border border-[#1E2B3E] rounded-xl px-3.5 py-2 font-mono text-xs select-none shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={clsx(
                'px-2.5 py-1 rounded-lg font-bold flex items-center justify-center transition-colors text-xs',
                isPlaying
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 hover:bg-[#F59E0B]/30'
                  : 'bg-[#00D9F5]/20 text-[#00D9F5] border border-[#00D9F5]/40 hover:bg-[#00D9F5]/30'
              )}
              title={isPlaying ? 'Pause Playback' : 'Play Timeline'}
            >
              {isPlaying ? <Pause size={13} className="mr-1" /> : <Play size={13} className="mr-1" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTs(minTs);
                setIsPlaying(false);
                setIsCompleted(false);
              }}
              className="p-1.5 rounded-lg text-[#94A3B8] border border-[#1E2B3E] hover:text-[#F8FAFC] hover:bg-[#101925] transition-colors"
              title="Restart from beginning"
            >
              <RotateCcw size={12} />
            </button>

            {/* Time Readout */}
            <div className="flex items-center gap-1.5 pl-1 text-xs">
              <span className="text-[#F8FAFC] font-bold min-w-[36px]">
                {formatDuration(elapsedSeconds)}
              </span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#64748B] min-w-[36px]">
                {formatDuration(durationSeconds)}
              </span>
            </div>

            {isCompleted && (
              <span className="ml-2 px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-semibold">
                Completed
              </span>
            )}
          </div>

          {/* Speed & UTC Readout */}
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-[#64748B] hidden sm:flex items-center gap-1.5">
              <Clock size={11} className="text-[#00D9F5]" />
              <span>{formatTimestampUTC(currentTs)}</span>
            </div>

            <div className="text-[10px] text-[#94A3B8] min-w-[32px] text-right font-semibold">
              {Math.round(progressPercent)}%
            </div>

            <div className="flex items-center gap-0.5 bg-[#101925] border border-[#1E2B3E] rounded-lg p-0.5">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors',
                    speed === s
                      ? 'bg-[#00D9F5] text-[#080B11]'
                      : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[#1E2B3E]'
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrubber Track */}
        <div
          ref={scrubberTrackRef}
          onClick={handleScrubberClick}
          className="relative h-2 bg-[#172435] border border-[#1E2B3E] rounded-full cursor-pointer overflow-hidden"
        >
          <div
            className="h-full bg-[#00D9F5] rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const PlayerGamePage: React.FC<PlayerGameViewProps> = (props) => (
  <PlayerGameView {...props} />
);
