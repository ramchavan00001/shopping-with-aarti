import { normaliseSource, sourceFromReferrer, sourceFromUserAgent, type EventKind, type TrafficSource } from "@shared/analytics";

// Anonymous site analytics. Remembers where this visit came from (for this
// browser tab only), reports visits, reel plays and look views once each per
// visit, and tags outbound buy links with the source. No cookies, no IDs.

const SOURCE_KEY = "aarti-src";
const SENT_KEY = "aarti-sent";

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let memorySource: TrafficSource | undefined;

/** Where this visit started: ?utm_source / ?src, the referring site, the in-app browser, or direct. */
export function visitSource(): TrafficSource {
  const store = session();
  const saved = memorySource ?? (store?.getItem(SOURCE_KEY) as TrafficSource | null) ?? undefined;
  if (saved) return saved;

  const params = new URLSearchParams(location.search);
  const external = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
  const source =
    normaliseSource(params.get("utm_source") ?? params.get("src")) ??
    sourceFromReferrer(external) ??
    sourceFromUserAgent(navigator.userAgent) ??
    "direct";
  memorySource = source;
  store?.setItem(SOURCE_KEY, source);
  return source;
}

const sentInMemory = new Set<string>();

/** Report an event once per visit (per tab). Never throws. */
export function trackEvent(kind: EventKind, reel?: string) {
  try {
    const key = `${kind}:${reel ?? ""}`;
    // Cheap exit first: video time updates call this several times a second.
    if (sentInMemory.has(key) || location.pathname.startsWith("/admin")) return;
    const store = session();
    const sent = new Set<string>(JSON.parse(store?.getItem(SENT_KEY) ?? "[]"));
    if (sent.has(key)) {
      sentInMemory.add(key);
      return;
    }
    sent.add(key);
    sentInMemory.add(key);
    store?.setItem(SENT_KEY, JSON.stringify([...sent].slice(-300)));

    const body = JSON.stringify({ kind, reel, path: location.pathname, src: visitSource() });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
    }
  } catch {
    // Analytics must never break the page.
  }
}

/** Call once at startup: count the visit and tag buy links with the source. */
export function installTracking() {
  if (location.pathname.startsWith("/admin")) return;
  visitSource();
  trackEvent("visit");

  // Buy buttons point at /go/:id; add ?src=… just before the browser follows them.
  const tag = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href^='/go/']") as HTMLAnchorElement | null;
    if (!a) return;
    const url = new URL(a.href, location.origin);
    url.searchParams.set("src", visitSource());
    a.href = url.pathname + url.search;
  };
  document.addEventListener("click", tag, true);
  document.addEventListener("auxclick", tag, true);
}

/** Seconds of watching before a reel counts as played. */
export const PLAY_THRESHOLD_SECONDS = 3;

/** True once a video has played 3 seconds, or 80% of itself if it's shorter (it loops). */
export function reachedPlayThreshold(v: HTMLVideoElement) {
  const limit = Number.isFinite(v.duration) && v.duration > 0 ? Math.min(PLAY_THRESHOLD_SECONDS, v.duration * 0.8) : PLAY_THRESHOLD_SECONDS;
  return v.currentTime >= limit;
}
