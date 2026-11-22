import React, { useState } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';

interface AnalystInputProps {
  onSendMessage: (query: string) => void;
  onClearConversation: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const AnalystInput: React.FC<AnalystInputProps> = ({
  onSendMessage,
  onClearConversation,
  isLoading,
  disabled = false,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="glass-panel border-t border-white/10 p-4 text-xs font-mono shadow-[0_-8px_30px_rgba(0,0,0,0.4)] z-20">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-7xl mx-auto">
        {/* Clear Conversation Action */}
        <button
          type="button"
          onClick={onClearConversation}
          title="Clear Conversation History"
          className="p-3 rounded-xl glass-card text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all flex-shrink-0"
        >
          <Trash2 size={16} />
        </button>

        {/* Query Input Field */}
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || disabled}
            placeholder="Ask about movement hotspots, combat distributions, loot density, or map coverage..."
            className="w-full glass-input rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 text-xs font-sans focus:outline-none focus:border-cyan-400/60 transition-all disabled:opacity-50 shadow-inner"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500/25 via-blue-600/25 to-cyan-500/25 border border-cyan-400/40 text-[#00E5FF] hover:bg-cyan-500/35 hover:border-cyan-400/60 font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2 flex-shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.2)] font-mono"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin text-cyan-400" />
              <span>Inquiring...</span>
            </>
          ) : (
            <>
              <span>Inquire</span>
              <Send size={15} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
