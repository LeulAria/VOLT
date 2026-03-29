import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "danger";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded border-none cursor-pointer font-mono transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    default: "bg-white/[0.08] text-white/80 hover:bg-white/[0.13] hover:text-white",
    ghost: "bg-transparent text-white/50 hover:bg-white/[0.07] hover:text-white/80",
    danger: "bg-transparent text-red-400/70 hover:bg-red-500/10 hover:text-red-400",
  };

  const sizes: Record<string, string> = {
    sm: "px-2 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
  };

  return (
    <button className={[base, variants[variant], sizes[size], className].join(" ")} {...props}>
      {children}
    </button>
  );
}
