import { useState, useImperativeHandle, forwardRef, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AI_PRESETS, type AIPreset } from "../../../lib/ai-presets";
import { Tooltip } from "../../../components/ui/Tooltip";
import { DropdownMenu } from "../../../components/ui/DropdownMenu";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { useGitStore } from "../source-control/store/useGitStore";
import { useGitStatus } from "../source-control/hooks/useGitStatus";

export interface StatusPanelHandle {
  show: (k: number) => void;
  toggleTerminalPopover: () => void;
}

interface StatusPanelProps {
  minimapOpen: boolean;
  onToggleMinimap: () => void;
  onLaunchPreset: (preset: AIPreset) => void;
  onLaunchBrowser: () => void;
  onLaunchVoltCode?: () => void;
}

const FullscreenIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    id="Maximize-Square--Streamline-Solar-Broken"
    height="19"
    width="19"
  >
    <desc>Maximize Square Streamline Icon: https://streamlinehq.com</desc>
    <path
      d="m12 12 5 -5m0 0h-3.75M17 7v3.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="m12 12 -5 5m0 0h3.75M7 17v-3.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="M22 12c0 4.714 0 7.0711 -1.4645 8.5355C19.0711 22 16.714 22 12 22c-4.71405 0 -7.07107 0 -8.53553 -1.4645C2 19.0711 2 16.714 2 12c0 -4.71405 0 -7.07107 1.46447 -8.53553C4.92893 2 7.28595 2 12 2c4.714 0 7.0711 0 8.5355 1.46447 0.9738 0.97374 1.3001 2.34208 1.4094 4.53553"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    ></path>
  </svg>
);

const VoiceIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    id="Minimize-Square--Streamline-Solar-Broken"
    height="19"
    width="19"
  >
    <desc>Minimize Square Streamline Icon: https://streamlinehq.com</desc>
    <path
      d="m20 4 -6 6m0 0h3.75M14 10V6.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="m4 20 6 -6m0 0H6.25M10 14v3.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="M22 12c0 4.714 0 7.0711 -1.4645 8.5355C19.0711 22 16.714 22 12 22c-4.71405 0 -7.07107 0 -8.53553 -1.4645C2 19.0711 2 16.714 2 12c0 -4.71405 0 -7.07107 1.46447 -8.53553C4.92893 2 7.28595 2 12 2c4.714 0 7.0711 0 8.5355 1.46447 0.9738 0.97374 1.3001 2.34208 1.4094 4.53553"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    ></path>
  </svg>
);

const MapIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    id="Map--Streamline-Solar-Broken"
    height="20"
    width="20"
  >
    <desc>Map Streamline Icon: https://streamlinehq.com</desc>
    <path
      d="M21 7.16229c0 -1.04358 0 -1.56537 -0.2831 -1.9582 -0.2832 -0.39283 -0.7782 -0.55784 -1.7682 -0.88785l-1.1648 -0.38825c-1.3671 -0.4557 -2.0506 -0.68355 -2.7388 -0.59139 -0.6882 0.09216 -1.2877 0.49183 -2.4868 1.29118l-1.3823 0.92159c-0.9361 0.62403 -1.40409 0.93604 -1.92915 1.06015 -0.19284 0.04559 -0.38971 0.07195 -0.58775 0.07871 -0.53921 0.01842 -1.07284 -0.15946 -2.14009 -0.51521 -1.39792 -0.46597 -2.09688 -0.69896 -2.62872 -0.46236 -0.18882 0.084 -0.35825 0.20612 -0.49765 0.35869C3 6.49907 3 7.23584 3 8.70938v4.06422M21 11v4.2907c0 1.4735 0 2.2103 -0.3926 2.64 -0.1394 0.1526 -0.3089 0.2747 -0.4977 0.3587 -0.5318 0.2366 -1.2308 0.0036 -2.6287 -0.4624 -1.0673 -0.3557 -1.6009 -0.5336 -2.1401 -0.5152 -0.198 0.0068 -0.3949 0.0331 -0.5877 0.0787 -0.5251 0.1241 -0.9931 0.4361 -1.9292 1.0602l-1.3823 0.9215c-1.1991 0.7994 -1.79859 1.1991 -2.48677 1.2912 -0.68819 0.0922 -1.37174 -0.1357 -2.73884 -0.5914l-1.16477 -0.3882c-0.99003 -0.33 -1.48505 -0.495 -1.76818 -0.8879 -0.26807 -0.3719 -0.28234 -0.8594 -0.2831 -1.7959"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="M15 3.5V7m0 10v-6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    ></path>
    <path d="M9 20.5V17M9 7v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"></path>
  </svg>
);

const TerminalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="-0.5 -0.5 16 16"
    strokeLinecap="round"
    strokeLinejoin="round"
    stroke="currentColor"
    id="Terminal--Streamline-Mynaui"
    height="20"
    width="20"
  >
    <desc>Terminal Streamline Icon: https://streamlinehq.com</desc>
    <path d="m5 5.625 1.875 1.875 -1.875 1.875m3.125 0h1.875" strokeWidth="1"></path>
    <path
      d="M1.875 5.875c0 -1.4000000000000001 0 -2.1 0.2725 -2.6350000000000002a2.5 2.5 0 0 1 1.0925 -1.0925C3.775 1.875 4.475 1.875 5.875 1.875h3.25c1.4000000000000001 0 2.1 0 2.6350000000000002 0.2725a2.5 2.5 0 0 1 1.0925 1.0925C13.125 3.775 13.125 4.475 13.125 5.875v3.25c0 1.4000000000000001 0 2.1 -0.2725 2.6350000000000002a2.5 2.5 0 0 1 -1.0925 1.0925C11.225000000000001 13.125 10.525 13.125 9.125 13.125H5.875c-1.4000000000000001 0 -2.1 0 -2.6350000000000002 -0.2725a2.5 2.5 0 0 1 -1.0925 -1.0925C1.875 11.225000000000001 1.875 10.525 1.875 9.125z"
      strokeWidth="1"
    ></path>
  </svg>
);

const BrowserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    id="Chrome-Logo--Streamline-Ultimate"
    height="16"
    width="16"
  >
    <desc>Chrome Logo Streamline Icon: https://streamlinehq.com</desc>
    <title>chrome</title>
    <path
      d="M0.5 12a11.5 11.5 0 1 0 23 0 11.5 11.5 0 1 0 -23 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="M7.382 12a4.618 4.618 0 1 0 9.236 0 4.618 4.618 0 1 0 -9.236 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="m12 7.382 10.533 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="m13.58 16.341 -3.625 6.974"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
    <path
      d="m7.427 11.356 -4.601 -6.29"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    ></path>
  </svg>
);

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const DetachedIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <line x1="7" y1="12" x2="7" y2="12" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="10" y1="10" x2="10" y2="14" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="9" x2="13" y2="15" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="10" x2="16" y2="14" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InlineIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="18" width="20" height="4" rx="1" />
    <line x1="8" y1="14" x2="8" y2="18" strokeWidth="1.5" />
    <line x1="11" y1="11" x2="11" y2="18" strokeWidth="1.5" />
    <line x1="14" y1="13" x2="14" y2="18" strokeWidth="1.5" />
    <line x1="17" y1="10" x2="17" y2="18" strokeWidth="1.5" />
  </svg>
);

const GitBranchIcon = () => (
  <svg
    width="13"
    height="13"
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

const SyncIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <polyline points="23 20 23 14 17 14" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

function GitStatusBadge() {
  const { t } = useTranslation();
  const activeWorkspacePath = useWorkspaceStore((s) => s.activeWorkspacePath);
  // Poll git status independently of the right sidebar being open
  useGitStatus(activeWorkspacePath);
  const status = useGitStore((s) =>
    activeWorkspacePath ? (s.statusByPath[activeWorkspacePath] ?? null) : null,
  );
  const [syncing, setSyncing] = useState(false);

  if (!activeWorkspacePath || !status?.isGitRepo) return null;

  const branch = status.branch ?? "";
  const ahead = status.ahead ?? 0;
  const behind = status.behind ?? 0;

  const handleSync = async () => {
    if (syncing || !activeWorkspacePath) return;
    setSyncing(true);
    try {
      await (window.electron as any).git.pull?.(activeWorkspacePath);
    } catch {
      /* ignore */
    }
    setSyncing(false);
  };

  return (
    <span className="mr-0.5 flex items-center gap-px">
      <Tooltip content={t("git.sourceControl")} position="top">
        <button
          className="flex h-6 cursor-pointer items-center gap-1 whitespace-nowrap rounded border-none bg-transparent px-[7px] font-mono text-[11.5px] text-white/50 transition-[background,color] duration-[120ms] hover:bg-white/[0.08] hover:text-white/80"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("volt:toggle-right-sidebar", {
                detail: { view: "git", workspacePath: activeWorkspacePath },
              }),
            )
          }
        >
          <GitBranchIcon />
          <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
            {branch}
          </span>
          {(ahead > 0 || behind > 0) && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/35">
              {behind > 0 && <span title={t("git.behind")}>↓{behind}</span>}
              {ahead > 0 && <span title={t("git.ahead")}>↑{ahead}</span>}
            </span>
          )}
        </button>
      </Tooltip>
      <Tooltip content={t("git.syncWithOrigin")} position="top">
        <button
          className={[
            "flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-white/40 transition-[background,color,transform] duration-[120ms]",
            "hover:bg-white/[0.08] hover:text-white/75",
            syncing ? "bg-white/[0.08] text-white/75" : "",
          ].join(" ")}
          onClick={handleSync}
          disabled={syncing}
        >
          <SyncIcon />
        </button>
      </Tooltip>
    </span>
  );
}

const VoltCodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" height="16" width="16">
    <path d="M15.2683 18.2287c-1.9794 2.678-2.9691 4.0171-3.8925 3.7341-0.9233-0.283-0.9233-1.9253-0.9233-5.21l0.0001-0.3095c0-1.1848 0-1.7771-0.3786-2.1487l-0.02-0.0192c-0.3867-0.3637-1.00321-0.3637-2.23625-0.3637-2.21887 0-3.3283 0-3.70325-0.673-0.00621-0.0111-0.01225-0.0223-0.01811-0.0337-0.35395-0.6833 0.28841-1.5524 1.57314-3.29064l3.06214-4.14303C10.711 3.09327 11.7007 1.75425 12.6241 2.03721c0.9233 0.28297 0.9233 1.92528 0.9233 5.20991v0.3097c0 1.18469 0 1.77704 0.3786 2.14859l0.02 0.01925c0.3867 0.36374 1.0032 0.36374 2.2362 0.36374 2.2189 0 3.3284 0 3.7033 0.6729 0.0062 0.0111 0.0122 0.0224 0.0181 0.0337 0.354 0.6834-0.2884 1.5525-1.5732 3.2907" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
  </svg>
);

const StatusPanel = forwardRef<StatusPanelHandle, StatusPanelProps>(function StatusPanel(
  { minimapOpen, onToggleMinimap, onLaunchPreset, onLaunchBrowser, onLaunchVoltCode },
  ref,
) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Terminal dropdown
  const [popoverOpen, setPopoverOpen] = useState(false);
  const terminalBtnRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 8, y: 40 });

  // Voice state
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"detached" | "inline" | null>(null);
  const [voicePaused, setVoicePaused] = useState(false);
  const voiceBtnRef = useRef<HTMLButtonElement>(null);
  const [voiceMenuPos, setVoiceMenuPos] = useState<{ x: number; y: number }>({ x: 8, y: 40 });

  // Inline voice — AudioContext refs
  const inlineBarContainerRef = useRef<HTMLDivElement>(null);
  const inlineAudioCtxRef = useRef<AudioContext | null>(null);
  const inlineAnalyserRef = useRef<AnalyserNode | null>(null);
  const inlineStreamRef = useRef<MediaStream | null>(null);
  const inlineAnimRef = useRef<number | null>(null);
  const inlinePausedRef = useRef(false);
  // Inline voice — MediaRecorder capture + main-process Whisper transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<"recording" | "transcribing" | null>(null);

  useImperativeHandle(ref, () => ({
    show: (k: number) => {
      setZoom(Math.round(k * 100));
    },
    toggleTerminalPopover: () => {
      setPopoverOpen((v) => !v);
    },
  }));

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  if (typeof document !== "undefined") {
    document.onfullscreenchange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
  }

  // Terminal dropdown positioning
  useEffect(() => {
    if (!popoverOpen || !terminalBtnRef.current) return;
    const rect = terminalBtnRef.current.getBoundingClientRect();
    setPopoverPos({
      x: window.innerWidth - rect.right,
      y: window.innerHeight - rect.top + 6,
    });
  }, [popoverOpen]);

  // ⌘+number shortcut to launch preset while terminal dropdown is open
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const preset = AI_PRESETS.find((p) => p.shortcutKey === e.key);
        if (preset) {
          e.preventDefault();
          onLaunchPreset(preset);
          setPopoverOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [popoverOpen, onLaunchPreset]);

  const handlePresetClick = useCallback(
    (preset: AIPreset) => {
      onLaunchPreset(preset);
      setPopoverOpen(false);
    },
    [onLaunchPreset],
  );

  const handleMinimapToggle = useCallback(() => {
    onToggleMinimap();
  }, [onToggleMinimap]);

  // Sync paused flag into a ref so the RAF draw loop can read it without closure stale issues
  useEffect(() => {
    inlinePausedRef.current = voicePaused;
  }, [voicePaused]);

  // Start inline voice: waveform visualizer + MediaRecorder
  useEffect(() => {
    if (voiceMode !== "inline") {
      // Cleanup
      if (inlineAnimRef.current) cancelAnimationFrame(inlineAnimRef.current);
      inlineAudioCtxRef.current?.close();
      inlineStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      inlineAnimRef.current = null;
      inlineAudioCtxRef.current = null;
      inlineAnalyserRef.current = null;
      inlineStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      return;
    }

    audioChunksRef.current = [];
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        inlineStreamRef.current = stream;

        // Waveform visualizer
        const ctx = new AudioContext();
        inlineAudioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        inlineAnalyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const N_BARS = 10;
        function draw() {
          inlineAnimRef.current = requestAnimationFrame(draw);
          const container = inlineBarContainerRef.current;
          if (!container || inlinePausedRef.current) return;
          analyser.getByteFrequencyData(data);
          const usable = Math.floor(data.length * 0.4);
          const barEls = container.children;
          for (let i = 0; i < barEls.length; i++) {
            const t = i / (N_BARS - 1);
            const envelope = Math.sin(t * Math.PI);
            const raw = data[Math.floor(t * usable)] / 255;
            (barEls[i] as HTMLElement).style.height =
              Math.max(2, 2 + raw * envelope * 14).toFixed(1) + "px";
          }
        }
        draw();

        // MediaRecorder for fully offline audio capture
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/ogg";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(500);
        setVoiceStatus("recording");
        console.log("[Voice inline] Recording started (local):", mimeType);
      } catch (err) {
        console.error("[Voice inline] mic error:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (inlineAnimRef.current) cancelAnimationFrame(inlineAnimRef.current);
      inlineAudioCtxRef.current?.close();
      inlineStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      inlineAnimRef.current = null;
      inlineAudioCtxRef.current = null;
      inlineAnalyserRef.current = null;
      inlineStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    };
  }, [voiceMode]);

  // Voice menu positioning
  useEffect(() => {
    if (!voiceMenuOpen || !voiceBtnRef.current) return;
    const rect = voiceBtnRef.current.getBoundingClientRect();
    setVoiceMenuPos({
      x: rect.left,
      y: window.innerHeight - rect.top + 6,
    });
  }, [voiceMenuOpen]);

  const handleVoiceIconClick = useCallback(() => {
    // Start inline recording directly — inline is the default mode.
    setVoiceMode("inline");
    setVoicePaused(false);
  }, []);

  // TODO: detached mode — floating pill window, comment out for now
  // const handleSelectDetached = useCallback(() => {
  //   setVoiceMenuOpen(false);
  //   setVoiceMode("detached");
  //   (window as any).electron?.voice?.toggle();
  // }, []);

  const handleSelectInline = useCallback(() => {
    setVoiceMenuOpen(false);
    setVoiceMode("inline");
    setVoicePaused(false);
  }, []);

  const handleInlineStop = useCallback(async () => {
    // 1. Collect audio blob from MediaRecorder
    const audioBlob = await new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        return;
      }
      recorder.addEventListener(
        "stop",
        () => {
          resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        },
        { once: true },
      );
      recorder.stop();
    });

    // 2. Stop mic and waveform immediately
    inlineStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (inlineAnimRef.current) cancelAnimationFrame(inlineAnimRef.current);
    inlineAudioCtxRef.current?.close();
    setVoiceStatus("transcribing");

    try {
      if (audioBlob.size > 1000) {
        // 3. Decode at native rate then resample to 16 kHz via OfflineAudioContext
        const TARGET_SR = 16000;
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodeCtx = new AudioContext();
        let decoded: AudioBuffer;
        try {
          decoded = await decodeCtx.decodeAudioData(arrayBuffer);
        } finally {
          decodeCtx.close();
        }

        let audioData: Float32Array;
        if (decoded.sampleRate === TARGET_SR) {
          audioData = decoded.getChannelData(0);
        } else {
          const offlineCtx = new OfflineAudioContext(
            1,
            Math.ceil(decoded.duration * TARGET_SR),
            TARGET_SR,
          );
          const src = offlineCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(offlineCtx.destination);
          src.start(0);
          const resampled = await offlineCtx.startRendering();
          audioData = resampled.getChannelData(0);
        }

        // 4. Silence check
        let rms = 0;
        for (let i = 0; i < audioData.length; i++) rms += audioData[i] * audioData[i];
        rms = Math.sqrt(rms / audioData.length);

        if (rms >= 0.001) {
          // 5. Send to main process for transcription (uses onnxruntime-node, not ort-web)
          const res = await (window as any).electron.voice.transcribe(audioData, TARGET_SR);
          if (!res.ok) console.error("[Voice inline] Main process error:", res.error);
          const text: string = res.text ?? "";

          console.log("[Voice inline] Transcript:", text || "(empty)");

          if (text) {
            const w = window as any;
            if (w.electron?.voice?.clipboardWrite) {
              await w.electron.voice.clipboardWrite(text);
            } else {
              await navigator.clipboard.writeText(text).catch(() => {});
            }
            console.log("[Voice inline] Copied to clipboard:", text);
          }
        } else {
          console.log("[Voice inline] Silent or too short, skipping");
        }
      }
    } catch (err) {
      console.error("[Voice inline] Transcription error:", err);
    }

    inlineStreamRef.current = null;
    inlineAudioCtxRef.current = null;
    inlineAnimRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    setVoiceStatus(null);
    setVoiceMode(null);
  }, []);

  const handleInlinePausePlay = useCallback(() => {
    setVoicePaused((v) => {
      const next = !v;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        if (next) recorder.pause();
        else recorder.resume();
      }
      return next;
    });
  }, []);

  // Shared status-bar button classes
  const btn =
    "flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-white/40 transition-[background,color] duration-[120ms] hover:bg-white/[0.08] hover:text-white/70";
  const btnActive = "bg-white/[0.08] text-white/75";
  const divider = "mx-[3px] h-4 w-px bg-white/[0.12]";

  return (
    <>
      {popoverOpen && (
        <DropdownMenu
          anchorPos={{ x: popoverPos.x, y: popoverPos.y, align: "right" }}
          onClose={() => setPopoverOpen(false)}
          items={AI_PRESETS.map((preset) => ({
            id: preset.id,
            label: preset.label,
            icon: preset.icon,
            shortcut: preset.shortcut,
            onClick: () => handlePresetClick(preset),
          }))}
        />
      )}

      {/* TODO: Re-enable mode selection dropdown when detached voice mode is ready.
           Until then, clicking the voice icon always starts inline recording.
      {voiceMenuOpen && (
        <DropdownMenu
          anchorPos={{ x: voiceMenuPos.x, y: voiceMenuPos.y, align: "left" }}
          onClose={() => setVoiceMenuOpen(false)}
          items={[
            { id: "detached", label: "Detached", icon: <DetachedIcon />, onClick: handleSelectDetached },
            { id: "inline",   label: "Inline",   icon: <InlineIcon />,   onClick: handleSelectInline },
          ]}
        />
      )}
      */}

      <div className="box-border flex h-8 w-full shrink-0 items-center justify-between bg-[#12121299] px-2 backdrop-blur-[8px] [pointer-events:auto] z-[99999] rounded-b-[15px]">
        <div className="flex items-center gap-0.5">
          {voiceMode === "inline" ? (
            <div className="flex items-center gap-1">
              {voiceStatus === "transcribing" ? (
                <span className="[animation:voice-shimmer_1.6s_linear_infinite] bg-[linear-gradient(90deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.55)_30%,rgba(255,255,255,1)_50%,rgba(255,255,255,0.55)_70%,rgba(255,255,255,0.35)_100%)] bg-[size:250%_auto] bg-clip-text text-[11px] font-[450] tracking-[0.03em] text-transparent [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
                  {t("statusBar.transcribing")}
                </span>
              ) : (
                <>
                  {/* Waveform bars — heights driven by AudioContext RAF */}
                  <div
                    ref={inlineBarContainerRef}
                    className={`flex h-5 items-center gap-0.5 px-1${voicePaused ? " [&>div]:opacity-35" : ""}`}
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[3px] w-[2.5px] shrink-0 rounded-sm bg-white/70 transition-[height,opacity] duration-[40ms] ease-out"
                      />
                    ))}
                  </div>

                  {/* Pause / Play */}
                  <Tooltip
                    content={voicePaused ? t("statusBar.resume") : t("statusBar.pause")}
                    position="top"
                  >
                    <button className={btn} onClick={handleInlinePausePlay}>
                      {voicePaused ? <PlayIcon /> : <PauseIcon />}
                    </button>
                  </Tooltip>

                  {/* Red stop — transcribes and copies to clipboard */}
                  <Tooltip content={t("statusBar.stopAndTranscribe")} position="top">
                    <button className={btn} onClick={handleInlineStop} style={{ color: "#dc2626" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          ) : (
            <Tooltip content={t("statusBar.voice")} position="top">
              <button
                ref={voiceBtnRef}
                className={`${btn}`}
                onClick={handleVoiceIconClick}
              >
                <VoiceIcon />
              </button>
            </Tooltip>
          )}
          <div className={divider} />

          <GitStatusBadge />
        </div>

        <div className="flex items-center gap-0.5">
          <div className={divider} />

          <span className="min-w-[30px] select-none text-center font-mono text-xs font-medium text-white/45 px-[5px]">
            {zoom}%
          </span>

          <div className={divider} />

          <Tooltip
            content={isFullscreen ? t("statusBar.exitFullscreen") : t("statusBar.fullscreen")}
            position="top"
          >
            <button className={btn} onClick={toggleFullscreen}>
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
          </Tooltip>

          <Tooltip
            content={minimapOpen ? t("statusBar.hideMinimap") : t("statusBar.showMinimap")}
            position="top"
          >
            <button
              className={`${btn}${minimapOpen ? ` ${btnActive}` : ""}`}
              onClick={handleMinimapToggle}
            >
              <MapIcon />
            </button>
          </Tooltip>

          <div className={divider} />

          <Tooltip content={t("statusBar.openTerminal")} position="top">
            <button
              ref={terminalBtnRef}
              className={`${btn}${popoverOpen ? ` ${btnActive}` : ""}`}
              onClick={() => setPopoverOpen((v) => !v)}
            >
              <TerminalIcon />
            </button>
          </Tooltip>

          <Tooltip content={t("statusBar.openBrowser")} position="top">
            <button className={btn} onClick={() => onLaunchBrowser()}>
              <BrowserIcon />
            </button>
          </Tooltip>

          {onLaunchVoltCode && (
            <Tooltip content="Volt Code" position="top">
              <button className={btn} onClick={onLaunchVoltCode}>
                <VoltCodeIcon />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
});

export default StatusPanel;
