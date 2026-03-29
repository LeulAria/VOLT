export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({ orientation = "horizontal", className = "" }: SeparatorProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={["w-px self-stretch bg-white/[0.08]", className].join(" ")}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }
  return (
    <div
      className={["h-px w-full bg-white/[0.08]", className].join(" ")}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
