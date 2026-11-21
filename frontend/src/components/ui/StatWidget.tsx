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
    cyan: "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30",
    green: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
    amber: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
    rose: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30",
    slate: "bg-[#334155]/20 text-[#94A3B8] border-[#334155]/50",
    blue: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30"
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm font-medium"
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
        "bg-[#0E131F] border border-[#1E293B] rounded-md p-4 transition-all duration-150 hover:border-[#334155]",
        className
      )}
    >
      <div className="flex items-center justify-between text-[#94A3B8] mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon && <span className="text-[#64748B]">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold font-mono text-[#F8FAFC] tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {badge && <div>{badge}</div>}
      </div>
      {subtext && <div className="text-xs text-[#64748B] mt-1.5 font-mono">{subtext}</div>}
    </div>
  );
};
