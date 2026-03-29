import { app, shell, session, BrowserWindow, ipcMain, nativeTheme, protocol } from "electron";
import { join, extname } from "path";
import { writeFile, mkdir, readFile, stat } from "fs/promises";
import { tmpdir } from "os";
import { spawn } from "child_process";
import icon from "../../resources/icon.png?asset";
import { registerWorkspaceHandlers } from "./workspaceHandlers";
import { ptyPool } from "./pty/PtyPool";
import { registerPtyHandlers } from "./pty/ptyHandlers";
import { registerBrowserHandlers, cleanupBrowserSessions } from "./browser/browserManager";
import { registerGitHandlers } from "./git/gitHandlers";
import { registerVoiceHandlers } from "./voice/voiceWidgetManager";

// ── Image MIME types ──────────────────────────────────────────────────────────
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
};

// Formats browsers can natively display (no conversion needed)
const NATIVE_BROWSER_FORMATS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
  "svg",
]);

// Register volt-file:// scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: "volt-file",
    privileges: {
      secure: true,
      standard: true,
      bypassCSP: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

// Enable CDP for embedded DevTools
app.commandLine.appendSwitch("remote-debugging-port", "8315");
app.commandLine.appendSwitch("remote-allow-origins", "*");
// Chromium Web Speech API (Google backend); helps some Electron builds reach the speech service
app.commandLine.appendSwitch("enable-speech-input");

function createWindow(): BrowserWindow {
  nativeTheme.themeSource = "dark";

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: "VOLT",
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    transparent: true,
    hasShadow: true,
    backgroundColor: "#00000000",
    vibrancy: "fullscreen-ui",
    trafficLightPosition: { x: 12, y: 12 },
    /**
     * macOS: framed windows use the system corner radius (~smaller than our UI).
     * Frameless + transparent lets #root’s border-radius (e.g. 11px in CSS) define
     * the visible window shape; traffic lights stay via trafficLightPosition.
     */
    ...(process.platform === "darwin" ? { frame: false, roundedCorners: true } : {}),
    ...(process.platform === "win32" ? { roundedCorners: true } : {}),
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details: any) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === "win32") {
    app.setAppUserModelId("com.electron");
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on("browser-window-created", () => {
    // Window shortcuts are handled by default
  });

  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  // Set a standard Chrome user-agent on the browser tile session so sites
  // (especially Google OAuth) treat it as a real browser, not an embedded webview.
  const browserSession = session.fromPartition("persist:browser");
  const electronUA = browserSession.getUserAgent();
  browserSession.setUserAgent(electronUA.replace(/\s*Electron\/\S+/, ""));

  // Register script:run handler to execute shell scripts
  ipcMain.handle("script:run", async (_, { content }: { content: string }) => {
    const scriptDir = join(tmpdir(), "volt-scripts");
    await mkdir(scriptDir, { recursive: true });
    const scriptPath = join(scriptDir, `script-${Date.now()}.sh`);
    await writeFile(scriptPath, content, { encoding: "utf-8", mode: 0o755 });
    return scriptPath;
  });

  ipcMain.handle("fs:read-file", async (_, filePath: string) => {
    return readFile(filePath, "utf-8");
  });

  ipcMain.handle(
    "fs:write-file",
    async (_, { filePath, content }: { filePath: string; content: string }) => {
      await writeFile(filePath, content, "utf-8");
    },
  );

  ipcMain.handle("fs:stat", async (_, filePath: string) => {
    const s = await stat(filePath);
    return { size: s.size, mtimeMs: s.mtimeMs };
  });

  ipcMain.handle("fs:read-binary", async (_, filePath: string) => {
    const buf = await readFile(filePath);
    return buf.toString("base64");
  });

  // Sharp-based image info + conversion for non-native formats
  ipcMain.handle("image:load", async (_, filePath: string) => {
    const ext = extname(filePath).slice(1).toLowerCase();
    if (NATIVE_BROWSER_FORMATS.has(ext)) {
      // Let renderer use volt-file:// directly
      const encoded = filePath.split("/").map(encodeURIComponent).join("/");
      return { type: "url", url: `volt-file://${encoded}`, ext };
    }
    // Non-native: convert to PNG via sharp
    try {
      const sharp = (await import("sharp")).default;
      const buf = await sharp(filePath).png().toBuffer();
      const meta = await sharp(filePath).metadata();
      return {
        type: "base64",
        url: `data:image/png;base64,${buf.toString("base64")}`,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        ext,
      };
    } catch {
      // Fallback: raw base64
      const buf = await readFile(filePath);
      const mime = IMAGE_MIME[ext] ?? "image/png";
      return { type: "base64", url: `data:${mime};base64,${buf.toString("base64")}`, ext };
    }
  });

  // Sharp metadata (dimensions, format, color space, channels, bit depth)
  ipcMain.handle("image:meta", async (_, filePath: string) => {
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(filePath).metadata();
      return {
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: meta.format ?? "",
        space: meta.space ?? "",
        channels: meta.channels ?? 0,
        depth: meta.depth ?? "",
        density: meta.density ?? 0,
        hasAlpha: meta.hasAlpha ?? false,
      };
    } catch {
      return { width: 0, height: 0, format: "", space: "", channels: 0, depth: "", density: 0, hasAlpha: false };
    }
  });

  // volt-file:// protocol — serve local image files directly
  protocol.handle("volt-file", async (request) => {
    try {
      const rawPath = decodeURIComponent(request.url.replace(/^volt-file:\/\//, ""));
      const filePath = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
      const buf = await readFile(filePath);
      const ext = extname(filePath).slice(1).toLowerCase();
      const contentType = IMAGE_MIME[ext] ?? "application/octet-stream";
      return new Response(buf, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
        },
      });
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }
  });

  ipcMain.handle("shell:open-external", async (_, url: string) => {
    await shell.openExternal(url);
  });

  // Shell helpers
  ipcMain.handle("shell:show-item", async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle(
    "shell:open-editor",
    async (_, { path: filePath, editor }: { path: string; editor: string }) => {
      const cmd = editor === "cursor" ? "cursor" : "code";
      spawn(cmd, [filePath], { detached: true, stdio: "ignore" }).unref();
    },
  );

  registerWorkspaceHandlers();
  registerPtyHandlers();
  registerBrowserHandlers();
  registerGitHandlers();
  ptyPool.init();

  const win = createWindow();
  registerVoiceHandlers(win);

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  cleanupBrowserSessions();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
