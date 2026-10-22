import { createContext, useContext, useEffect, type ReactNode } from "react";
import { defaultSettings, mergeSettings, type SiteSettings } from "@shared/settings";
import { useApi } from "./api";

// Site settings from Admin → Site settings. The last copy is remembered in
// this browser so returning visitors don't see the defaults flash first.

const CACHE_KEY = "site-settings";

function cached(): SiteSettings {
  try {
    return mergeSettings(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null"));
  } catch {
    return defaultSettings;
  }
}

const SettingsContext = createContext<SiteSettings>(defaultSettings);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<SiteSettings>("/api/settings");
  useEffect(() => {
    if (!data) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);
  return <SettingsContext.Provider value={data ? mergeSettings(data) : initial}>{children}</SettingsContext.Provider>;
}

const initial = typeof window === "undefined" ? defaultSettings : cached();

export const useSettings = () => useContext(SettingsContext);
