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
    default: "bg-[#090909] border border-[#292929]",
    elevated: "bg-[#111111] border border-[#334155]",
    accent: "bg-[#090909] border-l-2 border-l-[#00E5FF] border-[#292929]"
  };

  return (
    <div
      className={clsx(
        "glass-card rounded-xl p-4 transition-all duration-200 shadow-lg",
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
  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#292929]">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F8FAFC]">{title}</h3>
      {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
