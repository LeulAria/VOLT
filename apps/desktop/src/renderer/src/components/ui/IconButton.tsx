import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (required for icon-only buttons). */
  label: string;
  active?: boolean;
  children: React.ReactNode;
}

export function IconButton({
  label,
  active = false,
  className = "",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={[
        "flex items-center justify-center rounded border-none bg-transparent p-1 transition-colors",
        "focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-white/[0.12] text-white/80"
          : "text-white/35 hover:bg-white/[0.07] hover:text-white/80",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
