import type { Context, MiddlewareHandler } from "hono";
import { env } from "hono/adapter";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

// Single-owner admin login: one password (ADMIN_PASSWORD) and a signed,
// HttpOnly session cookie. Works on Node and Workers (Web Crypto only).

type AuthEnv = { ADMIN_PASSWORD?: string; SESSION_SECRET?: string };

const COOKIE = "aarti_admin";
const SESSION_DAYS = 14;

// Without SESSION_SECRET, sessions last until the server restarts. Created
// lazily: Workers forbid generating random values at module load.
let fallbackSecret: string | undefined;

const secret = (c: Context) => env<AuthEnv>(c).SESSION_SECRET || (fallbackSecret ??= crypto.randomUUID() + crypto.randomUUID());
export const adminConfigured = (c: Context) => !!env<AuthEnv>(c).ADMIN_PASSWORD;

async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Compare hashes so timing doesn't leak how much of the password matched. */
export async function passwordMatches(c: Context, attempt: string) {
  const expected = env<AuthEnv>(c).ADMIN_PASSWORD;
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(attempt), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const isHttps = (c: Context) =>
  new URL(c.req.url).protocol === "https:" || c.req.header("x-forwarded-proto") === "https";

export async function startSession(c: Context) {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  await setSignedCookie(c, COOKIE, `admin.${expires}`, secret(c), {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function endSession(c: Context) {
  deleteCookie(c, COOKIE, { path: "/", secure: isHttps(c) });
}

export async function hasSession(c: Context) {
  if (!adminConfigured(c)) return false;
  const value = await getSignedCookie(c, secret(c), COOKIE);
  if (!value) return false;
  const expires = Number(value.split(".")[1]);
  return expires > Date.now();
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (!(await hasSession(c))) return c.json({ error: "Please log in" }, 401);
  await next();
};

/**
 * Basic CSRF defence for cookie-authenticated writes: only accept JSON bodies
 * (cross-site forms can't send them without a CORS preflight) from our own origin.
 */
export const sameOriginWrites: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    if (!c.req.header("content-type")?.includes("application/json")) {
      return c.json({ error: "Expected JSON" }, 415);
    }
    const origin = c.req.header("origin");
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
    if (origin && host && new URL(origin).host !== host) return c.json({ error: "Cross-site request blocked" }, 403);
  }
  await next();
};

// Slow down password guessing: 10 attempts per IP per 15 minutes.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimited(c: Context) {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    if (attempts.size > 5000) for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
    return false;
  }
  entry.count++;
  return entry.count > 10;
}
