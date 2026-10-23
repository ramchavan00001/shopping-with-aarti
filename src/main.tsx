import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { installTracking } from "./lib/track";
import { installErrorReporting } from "./lib/errors";
import { SettingsProvider } from "./lib/settings";
import { LanguageProvider, onLanguageChange } from "./lib/i18n";
import { installPwa } from "./lib/pwa";
import { updatePushLanguage } from "./lib/push";
import "./index.css";

installErrorReporting();
installTracking();
if (import.meta.env.PROD) installPwa();
onLanguageChange(updatePushLanguage);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
