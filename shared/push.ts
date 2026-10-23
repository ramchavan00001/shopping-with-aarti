// Push subscription checks, shared by the API (kept free of Node-only code so
// the Workers build can import it).

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Push services of Chrome/Android, Firefox, Safari/iOS and Edge. The server
 *  only ever sends to these, so a fake subscription can't make it call other sites. */
const pushHosts = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];

function isPushService(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && pushHosts.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

/** Basic shape check of a browser PushSubscription.toJSON(). */
export function parseSubscription(v: unknown): SubscriptionInput | null {
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || !s.keys) return null;
  const { p256dh, auth } = s.keys;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!isPushService(s.endpoint) || s.endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh, auth } };
}
