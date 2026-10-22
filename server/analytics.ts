import type { Context } from "hono";
import { env } from "hono/adapter";
import { isBot, normaliseSource, sourceFromUserAgent, type TrafficSource } from "../shared/analytics";
import { hasSession } from "./auth";

// Anonymous visitor counting. We never store IP addresses or set cookies on
// shoppers. A visitor is a SHA-256 hash of (date + IP + browser + server
// secret), so the same person counts once per day, the hash changes every day,
// and it can't be turned back into who they were.

type AnalyticsEnv = { SESSION_SECRET?: string; ADMIN_PASSWORD?: string };

const clientIp = (c: Context) =>
  c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "";

export async function visitorHash(c: Context) {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const e = env<AnalyticsEnv>(c);
  const salt = e.SESSION_SECRET || e.ADMIN_PASSWORD || "aarti";
  const data = new TextEncoder().encode(`${day}|${clientIp(c)}|${c.req.header("user-agent") ?? ""}|${salt}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Source sent by the browser, else guessed from the in-app browser, else direct. */
export function requestSource(c: Context, claimed?: string | null): TrafficSource {
  return normaliseSource(claimed) ?? sourceFromUserAgent(c.req.header("user-agent")) ?? "direct";
}

/** Skip robots and Aarti's own browsing (logged in to the admin). */
export async function shouldRecord(c: Context) {
  if (isBot(c.req.header("user-agent"))) return false;
  return !(await hasSession(c));
}

// Light abuse guard for the public tracking endpoint: 120 events/minute per IP.
const hits = new Map<string, { n: number; reset: number }>();
export function trackRateLimited(c: Context) {
  const ip = clientIp(c) || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  return ++h.n > 120;
}
