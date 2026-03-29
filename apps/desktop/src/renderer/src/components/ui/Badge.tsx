import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "yellow" | "red";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-white/[0.10] text-white/60",
    green: "bg-green-500/20 text-green-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    red: "bg-red-500/20 text-red-400",
  };

  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full px-1.5 py-0.5",
        "font-mono text-[9px] font-semibold leading-none tabular-nums",
        variants[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
