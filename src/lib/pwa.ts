import { useSyncExternalStore } from "react";
import { trackEvent } from "./track";

// Installing the site as an app. Android Chrome offers a real install prompt
// (beforeinstallprompt); iPhone Safari needs Share → Add to Home Screen; the
// Instagram and Facebook in-app browsers can't install at all, so followers
// are asked to open the site in their browser first.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode =
  | "installed" // already running as the app
  | "prompt" // the browser can install it with one tap
  | "ios" // iPhone/iPad Safari: Share → Add to Home Screen
  | "in-app" // Instagram/Facebook browser: open in Chrome/Safari first
  | "manual" // other browsers: use the browser menu
  | "unsupported"; // desktop browsers without install support

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);
export const isIos = () => /iPhone|iPad|iPod/i.test(ua()) || (/Macintosh/.test(ua()) && navigator.maxTouchPoints > 1);
export const isInAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(ua());
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(ua());

function mode(): InstallMode {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isInAppBrowser()) return "in-app";
  if (isIos()) return /CriOS|FxiOS|EdgiOS/.test(ua()) ? "manual" : "ios";
  return isMobile() ? "manual" : "unsupported";
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    mode,
    () => "unsupported",
  );
}

/** Shows the browser's install prompt. Resolves true if the follower installed. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  emit();
  return outcome === "accepted";
}

/** Call once at startup (production only). */
export function installPwa() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    trackEvent("app_install");
    emit();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/* ------------------------------------------------- "Not now" memory -- */

const DISMISS_KEY = "aarti-install-dismissed";
const VIEWS_KEY = "aarti-page-views";

export function installDismissedRecently(days = 14) {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < days * 86_400_000;
  } catch {
    return true;
  }
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode: the banner simply comes back next visit.
  }
}

/** Counts page views across visits, so the install banner waits for interest. */
export function countPageView() {
  try {
    const n = Number(localStorage.getItem(VIEWS_KEY) ?? 0) + 1;
    localStorage.setItem(VIEWS_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}
