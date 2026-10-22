// Report JavaScript errors in shoppers' browsers to /api/client-errors, so
// problems on phones we've never tested show up in Admin → System. At most 5
// reports per visit; noise from browser extensions is ignored.

import { ignoredClientErrors as NOISE } from "@shared/analytics";
let sent = 0;

function report(message: string, stack?: string) {
  if (!message || sent >= 5 || NOISE.some((r) => r.test(message) || (stack && r.test(stack)))) return;
  sent++;
  const body = JSON.stringify({ message: message.slice(0, 500), stack: stack?.slice(0, 3000), path: location.pathname });
  try {
    if (!navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "text/plain" }))) {
      fetch("/api/client-errors", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // never let error reporting throw
  }
}

export function installErrorReporting() {
  window.addEventListener("error", (e) => {
    if (e.filename && !e.filename.startsWith(location.origin)) return; // third-party scripts
    report(e.message, e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    report(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
}
