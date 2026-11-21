import React, { useState } from 'react';
import { SuggestedQuestion } from '../types/analyst';
import { Navigation, Swords, Package, Compass, ChevronRight } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

const QUESTIONS: SuggestedQuestion[] = [
  // Player Movement
  {
    category: 'Player Movement',
    question: 'Which areas have the highest human movement activity?',
    intent: 'human_traffic_hotspots',
  },
  {
    category: 'Player Movement',
    question: 'How does human traffic compare with bot traffic?',
    intent: 'human_vs_bot_traffic',
  },
  {
    category: 'Player Movement',
    question: 'Which map has the widest recorded human movement footprint?',
    intent: 'map_coverage_comparison',
  },

  // Combat Telemetry
  {
    category: 'Combat Telemetry',
    question: 'Where are BotKill events most concentrated?',
    intent: 'combat_event_distribution',
  },
  {
    category: 'Combat Telemetry',
    question: 'How do BotKill and BotKilled event distributions differ?',
    intent: 'combat_event_distribution',
  },
  {
    category: 'Combat Telemetry',
    question: 'How many storm-related death events were recorded on each map?',
    intent: 'storm_deaths_summary',
  },

  // Loot Activity
  {
    category: 'Loot Activity',
    question: 'Which regions have the highest recorded Loot event counts?',
    intent: 'loot_hotspots',
  },
  {
    category: 'Loot Activity',
    question: 'How does loot activity overlap with human traffic hotspots?',
    intent: 'loot_vs_human_traffic',
  },

  // Spatial Analysis
  {
    category: 'Spatial Analysis',
    question: 'Which sectors have the highest activity across multiple telemetry layers?',
    intent: 'cross_layer_activity',
  },
  {
    category: 'Spatial Analysis',
    question: 'Which areas have high human traffic but relatively low bot traffic?',
    intent: 'human_vs_bot_traffic',
  },
  {
    category: 'Spatial Analysis',
    question: 'Which regions have activity across several different event categories?',
    intent: 'cross_layer_activity',
  },
];

const CATEGORIES: Array<{ key: SuggestedQuestion['category']; icon: React.ReactNode }> = [
  { key: 'Player Movement', icon: <Navigation size={13} className="text-[#00E5FF]" /> },
  { key: 'Combat Telemetry', icon: <Swords size={13} className="text-[#F43F5E]" /> },
  { key: 'Loot Activity', icon: <Package size={13} className="text-[#F59E0B]" /> },
  { key: 'Spatial Analysis', icon: <Compass size={13} className="text-[#A855F7]" /> },
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion }) => {
  const [activeCategory, setActiveCategory] = useState<SuggestedQuestion['category']>('Player Movement');

  const filteredQuestions = QUESTIONS.filter((q) => q.category === activeCategory);

  return (
    <div className="bg-[#0E131F]/90 border border-[#1E293B] rounded-xl p-4 text-xs font-mono">
      <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2.5 flex items-center justify-between">
        <span>Suggested Analytical Inquiries</span>
        <span className="text-[10px] text-slate-500 font-normal">Click any question to analyze</span>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        {CATEGORIES.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap text-xs ${
              activeCategory === key
                ? 'bg-[#151D2E] text-slate-100 border-[#00E5FF]/40 font-semibold shadow-sm'
                : 'bg-transparent text-slate-400 border-transparent hover:bg-[#151D2E]/50 hover:text-slate-300'
            }`}
          >
            {icon}
            <span>{key}</span>
          </button>
        ))}
      </div>

      {/* Question Pills */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(q.question)}
            className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#151D2E]/80 border border-[#1E293B] text-slate-300 hover:text-[#00E5FF] hover:border-[#00E5FF]/40 hover:bg-[#151D2E] text-left transition-all group"
          >
            <span className="leading-snug">{q.question}</span>
            <ChevronRight size={13} className="text-slate-500 group-hover:text-[#00E5FF] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
