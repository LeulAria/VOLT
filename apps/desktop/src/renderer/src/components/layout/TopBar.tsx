import { useTranslation } from "react-i18next";
import { Tooltip } from "../ui/Tooltip";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useWorkspaceStore } from "../../workbench/contrib/canvas/store/useWorkspaceStore";
import type { RightView } from "./RightSidebarContent";

interface TopBarProps {
  rightOpen: boolean;
  rightView: RightView;
  onOpenRight: (view: RightView) => void;
  onCloseRight: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGit() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="8" r="3" />
      <line x1="6" y1="9" x2="6" y2="15" />
      <path d="M18 11c0 6-12 3-12 9" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="16" width="16">
      <g>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.808 7.727c0 0.05 0.017 0.1 0.048 0.14l0.667 0.84a0.96 0.96 0 0 1 0.082 1.08l-0.392 0.676a0.96 0.96 0 0 1 -0.975 0.47l-1.063 -0.16a0.23 0.23 0 0 0 -0.145 0.027l-1.26 0.727a0.228 0.228 0 0 0 -0.096 0.112l-0.392 1a0.96 0.96 0 0 1 -0.893 0.611h-0.782a0.96 0.96 0 0 1 -0.893 -0.61l-0.392 -1a0.228 0.228 0 0 0 -0.096 -0.113L3.967 10.8a0.23 0.23 0 0 0 -0.145 -0.028l-1.063 0.162a0.96 0.96 0 0 1 -0.976 -0.47l-0.39 -0.677a0.96 0.96 0 0 1 0.08 -1.08l0.67 -0.84a0.223 0.223 0 0 0 0.05 -0.14V6.273c0 -0.05 -0.018 -0.1 -0.05 -0.14l-0.67 -0.84a0.96 0.96 0 0 1 -0.08 -1.08l0.39 -0.676a0.96 0.96 0 0 1 0.976 -0.47l1.06 0.16a0.23 0.23 0 0 0 0.145 -0.027l1.262 -0.73a0.229 0.229 0 0 0 0.096 -0.113l0.394 -0.996A0.96 0.96 0 0 1 6.61 0.75h0.784a0.96 0.96 0 0 1 0.893 0.61l0.392 0.997c0.018 0.049 0.052 0.09 0.096 0.116l1.26 0.727a0.23 0.23 0 0 0 0.145 0.028l1.062 -0.162a0.96 0.96 0 0 1 0.976 0.47l0.391 0.677a0.96 0.96 0 0 1 -0.081 1.08l-0.67 0.84a0.223 0.223 0 0 0 -0.049 0.14v1.454Z"
          strokeWidth="1"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 8.996c1.277 0 1.996 -0.719 1.996 -1.996 0 -1.277 -0.719 -1.996 -1.996 -1.996 -1.277 0 -1.996 0.719 -1.996 1.996 0 1.277 0.719 1.996 1.996 1.996Z"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

function IconRightSidebar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="16" width="16">
      <g>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9.5 3.99988 1.5 0"
          strokeWidth="1"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9.5 6.49988 1.5 0"
          strokeWidth="1"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M0.959867 10.2685C1.114 11.7092 2.2727 12.8679 3.71266 13.0284 4.78221 13.1476 5.88037 13.25 7 13.25s2.21779 -0.1024 3.2873 -0.2216c1.44 -0.1605 2.5987 -1.3192 2.7528 -2.7599 0.1138 -1.06348 0.2099 -2.15535 0.2099 -3.2685 0 -1.11316 -0.0961 -2.20502 -0.2099 -3.26853 -0.1541 -1.44065 -1.3128 -2.59936 -2.7528 -2.759861C9.21779 0.852392 8.11963 0.75 7 0.75S4.78221 0.852392 3.71266 0.971609C2.2727 1.13211 1.114 2.29082 0.959867 3.73147 0.846083 4.79498 0.75 5.88684 0.75 7c0 1.11315 0.096084 2.20502 0.209867 3.2685Z"
          strokeWidth="1"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m7.5 0.756592 0 12.486908"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ rightOpen, rightView, onOpenRight, onCloseRight }: TopBarProps) {
  const { t } = useTranslation();
  const activeWorkspacePath = useWorkspaceStore((s) => s.activeWorkspacePath);

  function toggleView(view: RightView) {
    if (rightOpen && rightView === view) {
      onCloseRight();
    } else {
      onOpenRight(view);
    }
  }

  const btnBase =
    "flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-white/40 transition-[background,color] duration-[120ms] hover:bg-white/[0.08] hover:text-white/70";
  const btnActive = "bg-white/[0.08] text-white/75";

  return (
    <div
      className="box-border flex h-8 w-full shrink-0 items-center justify-end border-b border-white/[0.07] bg-[#12121299] px-2 z-[99999] backdrop-blur-[8px]"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Draggable fill — takes up left side */}
      <div className="h-full flex-1" />

      {/* Right action buttons */}
      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <Tooltip content={t("topBar.sourceControl")} position="bottom">
          <button
            className={`${btnBase}${rightOpen && rightView === "git" ? ` ${btnActive}` : ""}`}
            onClick={() => {
              if (activeWorkspacePath) {
                window.dispatchEvent(
                  new CustomEvent("volt:toggle-right-sidebar", {
                    detail: { view: "git", workspacePath: activeWorkspacePath },
                  }),
                );
              } else {
                toggleView("git");
              }
            }}
          >
            <IconGit />
          </button>
        </Tooltip>

        <Tooltip content={t("topBar.todos")} position="bottom">
          <button
            className={`${btnBase}${rightOpen && rightView === "todos" ? ` ${btnActive}` : ""}`}
            onClick={() => toggleView("todos")}
          >
            <IconTodo />
          </button>
        </Tooltip>

        <div className="mx-[3px] h-4 w-px bg-white/[0.12]" />

        <ThemeToggle />

        <div className="mx-[3px] h-4 w-px bg-white/[0.12]" />

        <Tooltip content={t("topBar.settings")} position="bottom">
          <button className={btnBase}>
            <IconSettings />
          </button>
        </Tooltip>

        <Tooltip content={t("topBar.toggleRightSidebar")} position="bottom">
          <button
            className={`${btnBase}${rightOpen ? ` ${btnActive}` : ""}`}
            onClick={() => (rightOpen ? onCloseRight() : onOpenRight(rightView))}
          >
            <IconRightSidebar />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
