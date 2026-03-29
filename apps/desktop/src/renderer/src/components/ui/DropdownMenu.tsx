import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  /** Render a thin separator line above this item */
  separator?: boolean;
  onClick: () => void;
}

interface DropdownMenuProps {
  items: DropdownItem[];
  /** Position relative to viewport. y = distance from bottom of viewport. */
  anchorPos: { x: number; y: number; align?: "left" | "right" };
  onClose: () => void;
}

export function DropdownMenu({ items, anchorPos, onClose }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const style: React.CSSProperties = {
    position: "fixed",
    bottom: anchorPos.y,
    zIndex: 99999,
  };
  if (anchorPos.align === "right") {
    style.right = anchorPos.x;
  } else {
    style.left = anchorPos.x;
  }

  return createPortal(
    <div
      ref={ref}
      className="min-w-[186px] overflow-hidden rounded-lg border border-white/[0.09] bg-[#1c1c1e] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.35)]"
      style={style}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separator && <div className="my-[3px] h-px bg-white/[0.08]" />}
          <button
            className={[
              "flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-[5px] border-none px-[10px] py-[7px] text-left text-[13px] transition-colors",
              "bg-transparent font-['-apple-system',BlinkMacSystemFont,'Segoe_UI',sans-serif]",
              item.danger
                ? "text-[#f87171] hover:bg-white/[0.07] hover:text-white"
                : "text-white/[0.82] hover:bg-white/[0.07] hover:text-white",
            ].join(" ")}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && (
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-white/55">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="ml-4 shrink-0 font-mono text-[11px] text-white/30">
                {item.shortcut}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
