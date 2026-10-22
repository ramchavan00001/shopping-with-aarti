import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { installTracking } from "./lib/track";
import { installErrorReporting } from "./lib/errors";
import { SettingsProvider } from "./lib/settings";
import "./index.css";

installErrorReporting();
installTracking();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);
