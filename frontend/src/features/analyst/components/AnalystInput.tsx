import React, { useState } from 'react';
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react';

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
    <div className="bg-[#0E131F] border-t border-[#1E293B] p-4 text-xs font-mono">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Clear Conversation Action */}
        <button
          type="button"
          onClick={onClearConversation}
          title="Clear Conversation History"
          className="p-2.5 rounded-xl bg-[#151D2E] border border-[#1E293B] text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors flex-shrink-0"
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
            className="w-full bg-[#151D2E] border border-[#1E293B] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#00E5FF]/50 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="px-5 py-3 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/25 font-bold transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2 flex-shrink-0 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Inquire</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
