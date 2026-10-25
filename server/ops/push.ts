import { and, desc, eq, gte, sql } from "drizzle-orm";
import webpush from "web-push";
import type { PushMessageRow, PushStatus } from "../../shared/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";
import { langPath, splitLangPath, type Lang } from "../../shared/i18n";
import type { SubscriptionInput } from "../../shared/push";
import type { ErrorLog } from "./errors";

// Web push notifications. The VAPID key pair that identifies this site to the
// browsers' push services is created on first use and kept in the settings
// table (or set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Changing the keys
// cancels every existing subscription, so they are never rotated.

const SETTINGS_KEY = "push";
const POOL = 10;
/** Drop a subscription after this many failed sends in a row. */
const MAX_FAILURES = 5;

interface Keys {
  publicKey: string;
  privateKey: string;
}

export function createPush(db: Db, errors: ErrorLog, siteUrl: () => string) {
  let keysPromise: Promise<Keys> | undefined;

  function keys() {
    keysPromise ??= (async () => {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
      }
      const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, SETTINGS_KEY));
      if (row) return row.value as Keys;
      const fresh = webpush.generateVAPIDKeys();
      // Another instance may have raced us; keep whichever was stored first.
      await db.insert(schema.settings).values({ key: SETTINGS_KEY, value: fresh }).onConflictDoNothing();
      const [stored] = await db.select().from(schema.settings).where(eq(schema.settings.key, SETTINGS_KEY));
      return stored.value as Keys;
    })().catch((err) => {
      keysPromise = undefined;
      throw err;
    });
    return keysPromise;
  }

  const toRow = (r: typeof schema.pushMessages.$inferSelect): PushMessageRow => ({
    ...r,
    status: r.status as PushMessageRow["status"],
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  });

  /** Absolute link with the message id, so clicks and visits are counted. */
  function link(url: string, lang: Lang = "en") {
    const u = new URL(url, siteUrl());
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "push");
    if (u.origin !== new URL(siteUrl()).origin) return u.href;
    // Hindi readers open the Hindi page (/hi/deals).
    return langPath(lang, splitLangPath(u.pathname).path) + u.search;
  }

  async function deliver(sub: typeof schema.pushSubscriptions.$inferSelect, payload: string, k: Keys) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
        TTL: 24 * 3600,
        urgency: "normal",
        vapidDetails: { subject: siteUrl().startsWith("https://") ? siteUrl() : "mailto:alerts@example.com", ...k },
        timeout: 15_000,
      });
      await db.update(schema.pushSubscriptions).set({ failures: 0, lastSentAt: new Date() }).where(eq(schema.pushSubscriptions.id, sub.id));
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the person turned notifications off or the browser dropped it.
      if (status === 404 || status === 410 || sub.failures + 1 >= MAX_FAILURES) {
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
      } else {
        await db.update(schema.pushSubscriptions).set({ failures: sub.failures + 1 }).where(eq(schema.pushSubscriptions.id, sub.id));
      }
      return false;
    }
  }

  return {
    publicKey: async () => (await keys()).publicKey,

    async subscribe(sub: SubscriptionInput, lang: string, source: string, replaces?: string) {
      if (replaces && replaces !== sub.endpoint) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, replaces));
      const values = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lang: lang === "hi" ? "hi" : "en" };
      await db
        .insert(schema.pushSubscriptions)
        .values({ ...values, source })
        .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { ...values, failures: 0 } });
    },

    async unsubscribe(endpoint: string) {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
    },

    async click(id: number) {
      await db
        .update(schema.pushMessages)
        .set({ clicks: sql`${schema.pushMessages.clicks} + 1` })
        .where(eq(schema.pushMessages.id, id));
    },

    count: async () => (await db.$count(schema.pushSubscriptions)) as number,

    async status(): Promise<PushStatus> {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const [subscribers, hindi, installs, appVisits, messages] = await Promise.all([
        db.$count(schema.pushSubscriptions),
        db.$count(schema.pushSubscriptions, eq(schema.pushSubscriptions.lang, "hi")),
        db.$count(schema.events, and(eq(schema.events.kind, "app_install"), gte(schema.events.createdAt, since))),
        db.$count(schema.events, and(eq(schema.events.kind, "visit"), eq(schema.events.source, "app"), gte(schema.events.createdAt, since))),
        db.select().from(schema.pushMessages).orderBy(desc(schema.pushMessages.createdAt)).limit(30),
      ]);
      return { subscribers, hindi, installs, appVisits, messages: messages.map(toRow) };
    },

    /**
     * Send to everyone (in the background; the admin page polls the result),
     * or only to `testEndpoint` straight away.
     */
    async send(m: { title: string; body: string; titleHi: string; bodyHi: string; url: string; image: string; testEndpoint?: string }) {
      const k = await keys();
      if (m.testEndpoint) {
        const [sub] = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, m.testEndpoint));
        if (!sub) return { test: true, delivered: false };
        const hi = sub.lang === "hi" && m.titleHi && m.bodyHi;
        const payload = JSON.stringify({ title: hi ? m.titleHi : m.title, body: hi ? m.bodyHi : m.body, url: link(m.url, sub.lang === "hi" ? "hi" : "en"), image: m.image || undefined, tag: "test" });
        return { test: true, delivered: await deliver(sub, payload, k) };
      }

      const [msg] = await db
        .insert(schema.pushMessages)
        .values({ title: m.title, body: m.body, titleHi: m.titleHi || null, bodyHi: m.bodyHi || null, url: m.url, image: m.image || null })
        .returning();
      const payloads = {
        en: JSON.stringify({ id: msg.id, title: m.title, body: m.body, url: link(m.url), image: m.image || undefined, tag: `msg-${msg.id}` }),
        hi: JSON.stringify({ id: msg.id, title: m.titleHi || m.title, body: m.bodyHi || m.body, url: link(m.url, "hi"), image: m.image || undefined, tag: `msg-${msg.id}` }),
      };

      void (async () => {
        let sent = 0;
        let failed = 0;
        try {
          const subs = await db.select().from(schema.pushSubscriptions);
          let next = 0;
          const worker = async () => {
            while (next < subs.length) {
              const sub = subs[next++];
              if (await deliver(sub, sub.lang === "hi" ? payloads.hi : payloads.en, k)) sent++;
              else failed++;
            }
          };
          await Promise.all(Array.from({ length: POOL }, worker));
          await db.update(schema.pushMessages).set({ status: "sent", sent, failed, finishedAt: new Date() }).where(eq(schema.pushMessages.id, msg.id));
        } catch (err) {
          await db.update(schema.pushMessages).set({ status: "failed", sent, failed, finishedAt: new Date() }).where(eq(schema.pushMessages.id, msg.id)).catch(() => {});
          await errors.record("job", `Push notification #${msg.id} failed: ${String(err)}`);
        }
      })();
      return { test: false, id: msg.id };
    },
  };
}

export type Push = ReturnType<typeof createPush>;
