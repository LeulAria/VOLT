export interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className = "" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["animate-spin text-white/40", className].join(" ")}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
