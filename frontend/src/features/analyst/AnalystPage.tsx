import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapId } from '../../types/telemetry';
import { ChatMessage, AnalyticalResult } from './types/analyst';
import { insightEngine } from './services/insightEngine';
import { classifyQuery } from './services/queryClassifier';
import { llmAdapter } from './services/llmAdapter';
import { AnalystOverviewBar } from './components/AnalystOverviewBar';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { MessageItem } from './components/MessageItem';
import { AnalystInput } from './components/AnalystInput';
import { Bot, Loader2, Sparkles } from 'lucide-react';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'analyst',
  timestamp: Date.now(),
  text: 'Welcome to the LILA BLACK AI Map Analyst. I operate as a data-grounded telemetry intelligence assistant. All responses are calculated deterministically from processed gameplay datasets (64×64 thermal density grids, discrete event logs, and participant movement trajectories) with strict semantic boundaries and explicit percentage denominators. Select a suggested inquiry below or submit a custom query.',
};

export const AnalystPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [selectedMap, setSelectedMap] = useState<MapId | 'all'>('AmbroseValley');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialRunRef = useRef(false);

  // Auto-scroll when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam && !initialRunRef.current) {
      initialRunRef.current = true;
      handleSendMessage(qParam);
    }
  }, [searchParams]);

  const handleSendMessage = async (queryText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: Date.now(),
      text: queryText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const activeMap: MapId = selectedMap === 'all' ? 'AmbroseValley' : selectedMap;
      const classification = classifyQuery(queryText, activeMap);
      const mapForIntent: MapId =
        classification.filters.mapId && classification.filters.mapId !== 'all'
          ? classification.filters.mapId
          : activeMap;

      let result: AnalyticalResult;

      switch (classification.intent) {
        case 'human_traffic_hotspots':
          result = await insightEngine.getHumanTrafficHotspots(
            mapForIntent,
            classification.filters.topN || 5
          );
          break;

        case 'bot_traffic_hotspots':
          result = await insightEngine.getBotTrafficHotspots(
            mapForIntent,
            classification.filters.topN || 5
          );
          break;

        case 'map_coverage_comparison':
          result = await insightEngine.getMapCoverageComparison();
          break;

        case 'combat_event_distribution':
          result = await insightEngine.getCombatEventDistribution(
            classification.filters.mapId,
            classification.filters.category
          );
          break;

        case 'loot_hotspots':
          result = await insightEngine.getLootHotspots(
            mapForIntent,
            classification.filters.topN || 5
          );
          break;

        case 'human_vs_bot_traffic':
          result = await insightEngine.compareHumanVsBotTraffic(
            mapForIntent
          );
          break;

        case 'loot_vs_human_traffic':
          result = await insightEngine.compareLootVsHumanTraffic(
            mapForIntent
          );
          break;

        case 'cross_layer_activity':
          result = await insightEngine.getCrossLayerActivity(
            mapForIntent,
            3
          );
          break;

        case 'storm_deaths_summary':
          result = await insightEngine.getStormDeathsSummary();
          break;

        case 'sector_comparison':
          result = await insightEngine.inspectSector(
            mapForIntent,
            classification.filters.row ?? 25,
            classification.filters.col ?? 6
          );
          break;

        case 'dataset_overview':
          result = await insightEngine.getDatasetOverview();
          break;

        case 'analytical_insights':
          result = await insightEngine.getAnalyticalInsights(
            classification.filters.findingId
          );
          break;

        case 'map_intelligence':
          result = await insightEngine.getMapIntelligence(mapForIntent);
          break;

        case 'player_intelligence':
          result = await insightEngine.getPlayerIntelligence(
            classification.filters.userId,
            classification.filters.entityType,
            classification.filters.topN || 5
          );
          break;

        case 'temporal_analysis':
          result = await insightEngine.getTemporalAnalysis(
            classification.filters.date
          );
          break;

        case 'coordinate_system':
          result = await insightEngine.getCoordinateSystemIntelligence(
            mapForIntent
          );
          break;

        case 'unsupported':
        default:
          result = insightEngine.getUnsupportedAnalysis(queryText);
          break;
      }

      // Check for optional auxiliary LLM narrative explanation
      // Preserves result.conclusion as immutable deterministic source of truth
      try {
        const explanation = await llmAdapter.generateExplanation(result);
        if (explanation && explanation !== result.conclusion) {
          result.llmCommentary = explanation;
        }
      } catch (err) {
        console.warn('[AnalystPage] LLM explanation generation failed; relying strictly on deterministic insights', err);
      }

      const analystMsg: ChatMessage = {
        id: `analyst-${Date.now()}`,
        sender: 'analyst',
        timestamp: Date.now(),
        result,
      };

      setMessages((prev) => [...prev, analystMsg]);
    } catch (err: any) {
      console.error('[AnalystPage] Query error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'analyst',
        timestamp: Date.now(),
        text: `Unable to compute analytical query: ${err.message || 'Telemetry data unavailable'}. Please verify dataset integrity.`,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'analyst',
        timestamp: Date.now(),
        text: 'Conversation history cleared. Telemetry datasets remain loaded and grounded. Select an inquiry or enter a question to start a new analysis session.',
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#080D14] text-[#F8FAFC] relative">
      {/* Ambient background glows for glassmorphism */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#00D9F5]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Scope & Integrity Overview */}
      <AnalystOverviewBar
        selectedMap={selectedMap}
        onSelectMap={setSelectedMap}
        recordCount={14750}
      />

      {/* Main Content Area: Scrollable Chat Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative z-10">
        {/* Suggested Inquiries Drawer */}
        <SuggestedQuestions onSelectQuestion={handleSendMessage} />

        {/* Conversation History */}
        <div className="mt-4 space-y-4">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onSelectFollowUp={handleSendMessage}
            />
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 text-xs font-mono text-slate-300 p-4 glass-panel rounded-2xl w-fit shadow-lg animate-message-enter">
              <Loader2 size={16} className="text-[#00D9F5] animate-spin" />
              <span>Calculating deterministic telemetry metrics...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Query Input Form */}
      <AnalystInput
        onSendMessage={handleSendMessage}
        onClearConversation={handleClearConversation}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AnalystPage;
