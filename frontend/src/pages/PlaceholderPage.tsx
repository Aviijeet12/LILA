import React from "react";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  phase,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center gap-6 select-none">
      <div className="w-16 h-16 rounded-xl bg-[#151D2E] border border-[#1E293B] flex items-center justify-center">
        <Construction size={28} className="text-[#334155]" />
      </div>
      <div className="max-w-md">
        <div className="text-[10px] font-mono tracking-widest uppercase text-[#64748B] mb-2">
          {phase} — Not Yet Implemented
        </div>
        <h2 className="text-lg font-bold font-mono text-[#F8FAFC] mb-3">{title}</h2>
        <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
      </div>
      <div className="px-4 py-2 rounded border border-[#1E293B] bg-[#0E131F] text-[10px] font-mono text-[#334155] uppercase tracking-widest">
        Pending Phase 4 Specification
      </div>
    </div>
  );
};
