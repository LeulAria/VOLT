// ─── Action icons used in the command palette ────────────────────────────────

export function CopyPathIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <path
        d="M20.9983 10c-0.0121 -2.17503 -0.1086 -3.35294 -0.877 -4.12132C19.2426 5 17.8284 5 15 5h-3c-2.82843 0 -4.24264 0 -5.12132 0.87868C6 6.75736 6 8.17157 6 11v5c0 2.8284 0 4.2426 0.87868 5.1213C7.75736 22 9.17157 22 12 22h3c2.8284 0 4.2426 0 5.1213 -0.8787C21 20.2426 21 18.8284 21 16v-1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M3 10v6c0 1.6569 1.34315 3 3 3M18 5c0 -1.65685 -1.3431 -3 -3 -3h-4C7.22876 2 5.34315 2 4.17157 3.17157 3.51839 3.82475 3.22937 4.69989 3.10149 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function QuickViewIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <path d="M8 12h1m7 0h-4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M16 8h-1m-3 0H8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M8 16h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M3 14v-4c0 -3.77124 0 -5.65685 1.17157 -6.82843C5.34315 2 7.22876 2 11 2h2c3.7712 0 5.6569 0 6.8284 1.17157 0.6532 0.65319 0.9422 1.52832 1.0701 2.82843M21 10v4c0 3.7712 0 5.6569 -1.1716 6.8284C18.6569 22 16.7712 22 13 22h-2c-3.77124 0 -5.65685 0 -6.82843 -1.1716 -0.65318 -0.6532 -0.9422 -1.5283 -1.07008 -2.8284"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function GitDiffIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ListViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function TreeViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="16" width="5" height="5" rx="1" />
      <path d="M5.5 8v3.5H16M5.5 11.5v3.5H16" />
    </svg>
  );
}

export function GitChangesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
      <line x1="6" y1="9" x2="6" y2="15" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
