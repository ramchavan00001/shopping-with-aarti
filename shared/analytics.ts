// Traffic sources and site events, shared by the browser tracker and the API.

export const trafficSources = ["instagram", "whatsapp", "facebook", "google", "youtube", "twitter", "app", "push", "direct", "other"] as const;
export type TrafficSource = (typeof trafficSources)[number];

export const sourceLabels: Record<TrafficSource, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  google: "Google",
  youtube: "YouTube",
  twitter: "X / Twitter",
  app: "Home-screen app",
  push: "Notifications",
  direct: "Direct",
  other: "Other sites",
};

export const eventKinds = ["visit", "reel_play", "look_view", "app_install"] as const;
export type EventKind = (typeof eventKinds)[number];

const isSource = (v: string): v is TrafficSource => (trafficSources as readonly string[]).includes(v);

/** Map a utm_source / src value like "ig", "Insta", "wa" to a known source. */
export function normaliseSource(value: string | null | undefined): TrafficSource | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  if (isSource(v)) return v;
  if (/^(ig|insta|instagram.*)$/.test(v)) return "instagram";
  if (/^(wa|whatsapp.*)$/.test(v)) return "whatsapp";
  if (/^(fb|facebook.*|meta)$/.test(v)) return "facebook";
  if (/^(yt|youtube.*)$/.test(v)) return "youtube";
  if (/^(x|twitter)$/.test(v)) return "twitter";
  if (/^google/.test(v)) return "google";
  if (/^(pwa|app)$/.test(v)) return "app";
  if (/^(push|notification)$/.test(v)) return "push";
  return "other";
}

/** Work out a source from the referring page's host. */
export function sourceFromReferrer(referrer: string | null | undefined): TrafficSource | undefined {
  if (!referrer) return undefined;
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "youtube";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "twitter";
  return "other";
}

/** Instagram and Facebook open links in their own in-app browsers, which say so. */
export function sourceFromUserAgent(ua: string | null | undefined): TrafficSource | undefined {
  if (!ua) return undefined;
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/WhatsApp/i.test(ua)) return "whatsapp";
  return undefined;
}

/** Harmless browser errors not worth logging (extensions, layout warnings, flaky networks). */
export const ignoredClientErrors = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /Non-Error promise rejection/i, /AbortError/i, /Load failed/i, /Failed to fetch/i];

export const isBot = (ua: string | null | undefined) =>
  !ua || /bot|crawler|spider|preview|facebookexternalhit|whatsapp\/|slurp|headless|lighthouse/i.test(ua);
