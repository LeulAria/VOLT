import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // Keep electron and native modules out of the main-process bundle so
        // they are loaded from node_modules at runtime.
        external: ["electron", "node-pty", "@xenova/transformers", "nodejs-whisper"],
      },
    },
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        path: "path-browserify",
      },
    },
    plugins: [tailwindcss(), react()],
    // @xenova/transformers uses WASM — must be excluded from Vite's dep optimizer
    optimizeDeps: {
      exclude: ["@xenova/transformers"],
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          "voice-widget": resolve("src/renderer/voice-widget.html"),
        },
      },
    },
  },
});
