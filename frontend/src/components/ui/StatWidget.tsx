import React from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "cyan" | "green" | "amber" | "rose" | "slate" | "blue";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "cyan",
  size = "sm",
  className
}) => {
  const variantStyles = {
    cyan: "bg-[#00D9F5]/10 text-[#00D9F5] border-[#00D9F5]/30",
    green: "bg-[#14C995]/10 text-[#14C995] border-[#14C995]/30",
    amber: "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/30",
    rose: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
    slate: "bg-[#1E2B3E]/60 text-[#94A3B8] border-[#1E2B3E]",
    blue: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30"
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs font-semibold"
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded font-mono border uppercase tracking-wider",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

interface StatWidgetProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: string;
  className?: string;
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  label,
  value,
  subtext,
  icon,
  badge,
  className
}) => {
  return (
    <div
      className={clsx(
        "bg-[#101925] border border-[#1E2B3E] rounded-xl p-3.5 transition-all duration-150 hover:border-[#2A3C55] group relative",
        className
      )}
    >
      <div className="flex items-center justify-between text-[#94A3B8] mb-2">
        <span className="text-[11px] font-medium tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
        {icon && <span className="text-slate-500 group-hover:text-[#00D9F5] transition-colors">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold font-mono text-[#F8FAFC] tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {badge && <div>{badge}</div>}
      </div>
      {subtext && <div className="text-[10px] text-slate-400 mt-1.5 font-mono flex items-center gap-1">{subtext}</div>}
    </div>
  );
};
