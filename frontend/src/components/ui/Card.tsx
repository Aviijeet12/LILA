import React from "react";
import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent";
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const variantStyles = {
    default: "bg-[#0E131F] border border-[#1E293B]",
    elevated: "bg-[#151D2E] border border-[#334155]",
    accent: "bg-[#0E131F] border-l-2 border-l-[#00E5FF] border-[#1E293B]"
  };

  return (
    <div
      className={clsx(
        "rounded-md p-4 transition-all duration-150 shadow-sm",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action
}) => (
  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E293B]">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F8FAFC]">{title}</h3>
      {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
