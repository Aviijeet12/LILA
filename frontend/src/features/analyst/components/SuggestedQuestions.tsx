import React, { useState } from 'react';
import { SuggestedQuestion } from '../types/analyst';
import { Navigation, Swords, Package, Compass, ChevronRight, Sparkles, LineChart, Database } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

const QUESTIONS: SuggestedQuestion[] = [
  // Executive Insights
  {
    category: 'Executive Insights',
    question: 'What are the core analytical insights from the dataset?',
    intent: 'analytical_insights',
  },
  {
    category: 'Executive Insights',
    question: 'Why does Ambrose Valley receive disproportionately high activity? (Finding 1)',
    intent: 'analytical_insights',
  },
  {
    category: 'Executive Insights',
    question: 'How do human and bot paths diverge on Grand Rift? (Finding 2)',
    intent: 'analytical_insights',
  },
  {
    category: 'Executive Insights',
    question: 'Where are Loot events concentrated, and do they overlap with human corridors? (Finding 3)',
    intent: 'analytical_insights',
  },

  // Dataset Overview
  {
    category: 'Dataset Overview',
    question: 'Give me an executive overview of the dataset (matches, journeys, entities)',
    intent: 'dataset_overview',
  },
  {
    category: 'Dataset Overview',
    question: 'How were matches and journeys distributed across the 5 operational days?',
    intent: 'temporal_analysis',
  },
  {
    category: 'Dataset Overview',
    question: 'How does the affine coordinate mapping pipeline work for Ambrose Valley?',
    intent: 'coordinate_system',
  },
  {
    category: 'Dataset Overview',
    question: 'Who are the most active human players by distance and matches?',
    intent: 'player_intelligence',
  },

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
];

const CATEGORIES = [
  { id: 'Executive Insights', label: 'Insights', icon: <LineChart size={13} /> },
  { id: 'Dataset Overview', label: 'Overview', icon: <Database size={13} /> },
  { id: 'Player Movement', label: 'Movement', icon: <Navigation size={13} /> },
  { id: 'Combat Telemetry', label: 'Combat', icon: <Swords size={13} /> },
  { id: 'Loot Activity', label: 'Loot', icon: <Package size={13} /> },
  { id: 'Spatial Analysis', label: 'Spatial', icon: <Compass size={13} /> },
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Player Movement');

  const filtered = QUESTIONS.filter((q) => q.category === activeCategory);

  return (
    <div className="glass-panel p-4 rounded-2xl space-y-3.5 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      {/* Category Selection Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
          <Sparkles size={14} className="text-cyan-400" />
          <span>Suggested Analytical Inquiries</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/20 text-[#00E5FF] font-semibold border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'glass-card text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clickable Question Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filtered.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(item.question)}
            className="glass-card hover:border-cyan-500/40 p-3 rounded-xl flex items-center justify-between text-left group transition-all"
          >
            <span className="text-xs text-slate-200 group-hover:text-cyan-300 transition-colors font-sans leading-snug">
              {item.question}
            </span>
            <ChevronRight
              size={14}
              className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
