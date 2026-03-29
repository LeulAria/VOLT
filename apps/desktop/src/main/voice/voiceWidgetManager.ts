import { BrowserWindow, ipcMain, clipboard } from "electron";
import { join } from "path";

// ── Offline Whisper via @xenova/transformers
//    In Node.js (main process) this uses onnxruntime-node, not ort-web —
//    no WASM / registerBackend issues.
// ─────────────────────────────────────────────────────────────────────────────
let whisperPipeline: any = null;

async function transcribeAudio(audioBuffer: Buffer, sampleRate: number): Promise<string> {
  if (!whisperPipeline) {
    // Step 1: import
    console.log("[Voice main] Step 1: importing @xenova/transformers…");
    let xfm: any;
    try {
      xfm = await import("@xenova/transformers");
      console.log("[Voice main] Step 1 OK — exports:", Object.keys(xfm).slice(0, 8).join(", "));
    } catch (e: any) {
      console.error("[Voice main] Step 1 FAILED:", e?.stack ?? String(e));
      throw e;
    }

    // Step 2: env
    console.log("[Voice main] Step 2: configuring env…");
    try {
      xfm.env.allowRemoteModels = true;
      xfm.env.allowLocalModels = true;
      console.log("[Voice main] Step 2 OK");
    } catch (e: any) {
      console.error("[Voice main] Step 2 FAILED:", e?.stack ?? String(e));
      throw e;
    }

    // Step 3: pipeline
    console.log("[Voice main] Step 3: creating pipeline…");
    try {
      whisperPipeline = await xfm.pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        { quantized: true },
      );
      console.log("[Voice main] Step 3 OK — pipeline type:", typeof whisperPipeline);
    } catch (e: any) {
      console.error("[Voice main] Step 3 FAILED:", e?.stack ?? String(e));
      whisperPipeline = null; // don't cache a bad pipeline
      throw e;
    }
  }

  // Reconstruct Float32Array
  const audioData = new Float32Array(
    audioBuffer.buffer,
    audioBuffer.byteOffset,
    audioBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );
  console.log("[Voice main] Running inference on", audioData.length, "samples @", sampleRate, "Hz");

  const result = await whisperPipeline(audioData, {
    sampling_rate: sampleRate ?? 16000,
    task: "transcribe",
    return_timestamps: false,
    no_speech_threshold: 0.6,
    logprob_threshold: -1.0,
    compression_ratio_threshold: 2.4,
  });

  const raw = (result?.text ?? "").trim();
  const text = /^[-\s.…]+$/.test(raw) ? "" : raw;
  console.log("[Voice main] Transcript:", text || "(empty)");
  return text;
}

let voiceWindow: BrowserWindow | null = null;

export function registerVoiceHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle("voice:toggle", () => {
    if (voiceWindow && !voiceWindow.isDestroyed()) {
      if (voiceWindow.isVisible()) {
        voiceWindow.hide();
      } else {
        positionAndShow(mainWindow);
      }
      return;
    }
    createVoiceWindow(mainWindow);
  });

  // Allow the widget itself to close via IPC
  ipcMain.on("voice:close", () => {
    if (voiceWindow && !voiceWindow.isDestroyed()) {
      voiceWindow.hide();
    }
  });

  // Offline transcription — runs in Node.js main process (uses onnxruntime-node)
  ipcMain.handle("voice:transcribe", async (_event, audioBuffer: Buffer, sampleRate: number) => {
    try {
      const text = await transcribeAudio(audioBuffer, sampleRate);
      return { ok: true, text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Voice main] Transcription error:", err);
      return { ok: false, text: "", error: msg };
    }
  });

  // Write transcription text to system clipboard
  ipcMain.handle("voice:clipboard-write", (_event, text: string) => {
    if (typeof text === "string" && text.length > 0) {
      clipboard.writeText(text);
    }
  });

  // Reposition widget when main window moves or resizes
  mainWindow.on("move", () => {
    if (voiceWindow && !voiceWindow.isDestroyed() && voiceWindow.isVisible()) {
      positionWidget(mainWindow);
    }
  });
  mainWindow.on("resize", () => {
    if (voiceWindow && !voiceWindow.isDestroyed() && voiceWindow.isVisible()) {
      positionWidget(mainWindow);
    }
  });
}

function createVoiceWindow(mainWindow: BrowserWindow): void {
  voiceWindow = new BrowserWindow({
    width: 220,
    height: 44,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    parent: mainWindow,
    webPreferences: {
      preload: join(__dirname, "../../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    voiceWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/voice-widget.html`);
  } else {
    voiceWindow.loadFile(join(__dirname, "../renderer/voice-widget.html"));
  }

  voiceWindow.on("ready-to-show", () => {
    positionAndShow(mainWindow);
  });

  voiceWindow.on("closed", () => {
    voiceWindow = null;
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("voice:window-closed");
    }
  });
}

function positionWidget(mainWindow: BrowserWindow): void {
  if (!voiceWindow || voiceWindow.isDestroyed()) return;

  const mainBounds = mainWindow.getBounds();
  const WIDGET_W = 220;
  const WIDGET_H = 44;
  const STATUS_BAR_H = 32;
  const MARGIN = 10;

  const x = Math.round(mainBounds.x + (mainBounds.width - WIDGET_W) / 2);
  const y = Math.round(mainBounds.y + mainBounds.height - STATUS_BAR_H - WIDGET_H - MARGIN);

  voiceWindow.setBounds({ x, y, width: WIDGET_W, height: WIDGET_H });
}

function positionAndShow(mainWindow: BrowserWindow): void {
  if (!voiceWindow || voiceWindow.isDestroyed()) return;
  positionWidget(mainWindow);
  voiceWindow.show();
  voiceWindow.focus();
}
