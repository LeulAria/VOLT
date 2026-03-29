import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AIPreset } from "../../lib/ai-presets";

interface TerminalPopoverProps {
  presets: AIPreset[];
  onLaunch: (preset: AIPreset) => void;
  onClose: () => void;
  pos?: { x: number; y: number } | null;
}

export function TerminalPopover({ presets, onLaunch, onClose, pos }: TerminalPopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="w-[220px] bg-[#191919] backdrop-blur-[20px] border border-white/[0.12] rounded-[5px] overflow-hidden z-[1000] pointer-events-auto shadow-[0_12px_40px_rgba(0,0,0,0.6)] [animation:popover-in_0.15s_ease-out]"
      style={{
        position: "fixed",
        zIndex: 1000,
        left: pos?.x ?? undefined,
        top: pos?.y ?? undefined,
        ...(pos == null ? { right: 8, top: 120 } : {}),
      }}
    >
      <div className="px-[14px] pt-[10px] pb-[6px] text-[11px] font-semibold text-white/40 uppercase tracking-[0.05em]">
        {t("sidebar.launchTerminal")}
      </div>
      <div className="flex flex-col px-[6px] pb-[6px] pt-[2px] gap-px">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className="flex items-center gap-[10px] px-[10px] py-2 border-none rounded-[4px] bg-transparent text-white/75 text-[13px] cursor-pointer text-left [-webkit-app-region:no-drag] hover:bg-white/[0.08] hover:text-white transition-colors"
            onClick={() => {
              onLaunch(preset);
              onClose();
            }}
          >
            <span className="flex items-center justify-center w-6 h-6 shrink-0">{preset.icon}</span>
            <span className="flex-1 font-medium">{preset.label}</span>
            <span className="text-[11px] font-mono text-white/25 shrink-0">{preset.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
