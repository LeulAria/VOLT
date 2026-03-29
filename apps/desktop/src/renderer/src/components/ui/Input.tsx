import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon or decoration element rendered inside the input. */
  leadingIcon?: React.ReactNode;
}

export function Input({ leadingIcon, className = "", ...props }: InputProps) {
  const inputClass = [
    "w-full bg-transparent font-mono text-[11px] text-white/80 placeholder-white/25",
    "border border-white/[0.1] rounded px-2 py-1.5",
    "focus:outline-none focus:border-white/[0.25] transition-colors",
    leadingIcon ? "pl-7" : "",
    className,
  ].join(" ");

  if (!leadingIcon) {
    return <input className={inputClass} {...props} />;
  }

  return (
    <div className="relative flex items-center">
      <span className="absolute left-2 flex items-center text-white/35">{leadingIcon}</span>
      <input className={inputClass} {...props} />
    </div>
  );
}
