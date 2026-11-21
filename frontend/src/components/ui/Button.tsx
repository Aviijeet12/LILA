import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className,
  ...props
}) => {
  const variantStyles = {
    primary: "bg-[#00E5FF] text-[#080B11] font-semibold hover:bg-[#00B4D8] border border-[#00E5FF]",
    secondary: "bg-[#151D2E] text-[#F8FAFC] hover:bg-[#1E293B] border border-[#334155]",
    danger: "bg-[#F43F5E]/20 text-[#F43F5E] hover:bg-[#F43F5E]/30 border border-[#F43F5E]/40",
    outline: "bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#64748B] border border-[#1E293B]",
    ghost: "bg-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151D2E] border-transparent"
  };

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-xs font-medium",
    lg: "px-4 py-2 text-sm"
  };

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed uppercase font-mono tracking-wider cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      {children}
    </button>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-wider">{label}</span>}
      <select
        className={clsx(
          "bg-[#0E131F] text-[#F8FAFC] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs font-mono focus:border-[#00E5FF] focus:outline-none transition-colors",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0E131F] text-[#F8FAFC]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
