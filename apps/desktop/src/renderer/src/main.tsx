import "./assets/main.css";
import "./lib/monacoSetup";
import "./lib/i18n";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import App from "./App";
import { TileProvider } from "./platform/context/TileContext";
import { initTheme } from "./lib/theme";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <TileProvider>
        <App />
      </TileProvider>
    </I18nextProvider>
  </StrictMode>,
);
