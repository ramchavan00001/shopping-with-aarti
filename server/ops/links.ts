import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import type { LinkCheckRow, LinkHealth, LinkStatus } from "../../shared/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";
import { sendAlert } from "./alerts";
import type { Jobs } from "./jobs";

// Broken-link checker. Visits every affiliate link the site shows and sorts
// the result into:
//   ok      – the store answered normally
//   broken  – "not found / gone" (404, 410): the product page is gone
//   blocked – the store refused an automated visit (403, 429, 503…). Big
//             stores do this a lot, so it is NOT treated as broken.
//   error   – couldn't connect / timed out
// Stock levels can't be read reliably this way, so "out of stock" isn't checked.

export const LINK_JOB = "link-check";

interface Target {
  targetId: string;
  kind: LinkCheckRow["kind"];
  url: string;
  label: string;
  reelCode: string | null;
}

const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

export async function checkUrl(url: string): Promise<{ status: LinkStatus; httpStatus: number | null; finalUrl: string | null; detail: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*", "Accept-Language": "en-IN,en;q=0.9" },
    });
    // We only need the status; don't download the page.
    await res.body?.cancel().catch(() => {});
    const finalUrl = res.url || url;
    if (res.status === 404 || res.status === 410) return { status: "broken", httpStatus: res.status, finalUrl, detail: "Page not found on the store" };
    if (res.ok || (res.status >= 300 && res.status < 400)) return { status: "ok", httpStatus: res.status, finalUrl, detail: null };
    if ([401, 403, 405, 429, 503, 999].includes(res.status) || res.status >= 500) {
      return { status: "blocked", httpStatus: res.status, finalUrl, detail: "The store didn't let the checker in. Open the link yourself to confirm." };
    }
    return { status: "broken", httpStatus: res.status, finalUrl, detail: `Store answered ${res.status}` };
  } catch (err) {
    const timeout = (err as Error).name === "TimeoutError";
    return { status: "error", httpStatus: null, finalUrl: null, detail: timeout ? "Timed out after 15 s" : String((err as Error).message ?? err).slice(0, 200) };
  }
}

/** Run `fn` over items with at most `limit` in flight. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

export function createLinkChecker(db: Db, jobs: Jobs, siteUrl: () => string, onChange: () => void) {
  async function targets(): Promise<Target[]> {
    const now = new Date();
    const [products, events, deals] = await Promise.all([
      db
        .select({ id: schema.products.id, url: schema.products.affiliateUrl, title: schema.products.title, reelCode: schema.products.reelCode })
        .from(schema.products)
        .innerJoin(schema.reels, eq(schema.reels.code, schema.products.reelCode))
        .where(and(eq(schema.products.isActive, true), eq(schema.reels.isPublished, true))),
      db.select({ id: schema.saleEvents.id, url: schema.saleEvents.affiliateUrl, name: schema.saleEvents.name }).from(schema.saleEvents).where(gte(schema.saleEvents.endsAt, now.toISOString())),
      db.select({ id: schema.lootDeals.id, url: schema.lootDeals.affiliateUrl, title: schema.lootDeals.title }).from(schema.lootDeals).where(gte(schema.lootDeals.expiresAt, now.toISOString())),
    ]);
    return [
      ...products.map((p) => ({ targetId: p.id, kind: "product" as const, url: p.url, label: p.title, reelCode: p.reelCode })),
      ...events.map((e) => ({ targetId: e.id, kind: "event" as const, url: e.url, label: `Sale: ${e.name}`, reelCode: null })),
      ...deals.map((d) => ({ targetId: d.id, kind: "deal" as const, url: d.url, label: `Deal: ${d.title}`, reelCode: null })),
    ];
  }

  async function save(t: Target, r: Awaited<ReturnType<typeof checkUrl>>) {
    const row = { targetId: t.targetId, kind: t.kind, url: t.url, status: r.status, httpStatus: r.httpStatus, finalUrl: r.finalUrl, detail: r.detail, checkedAt: new Date() };
    await db.insert(schema.linkChecks).values(row).onConflictDoUpdate({ target: schema.linkChecks.targetId, set: row });
  }

  async function runAll(): Promise<string> {
    const list = await targets();
    const before = new Set(
      (await db.select({ id: schema.linkChecks.targetId }).from(schema.linkChecks).where(eq(schema.linkChecks.status, "broken"))).map((r) => r.id),
    );
    const counts: Record<LinkStatus, number> = { ok: 0, broken: 0, blocked: 0, error: 0 };
    const newlyBroken: Target[] = [];
    await pool(list, 4, async (t) => {
      const r = await checkUrl(t.url);
      counts[r.status]++;
      if (r.status === "broken" && !before.has(t.targetId)) newlyBroken.push(t);
      await save(t, r);
    });
    // Forget results for links that no longer exist.
    if (list.length) await db.delete(schema.linkChecks).where(notInArray(schema.linkChecks.targetId, list.map((t) => t.targetId)));
    else await db.delete(schema.linkChecks);

    if (newlyBroken.length) {
      await sendAlert(
        `${newlyBroken.length} broken affiliate link${newlyBroken.length > 1 ? "s" : ""}`,
        `${newlyBroken.slice(0, 8).map((t) => `• ${t.label}${t.reelCode ? ` (#${t.reelCode})` : ""}`).join("\n")}\nFix them: ${siteUrl()}/admin/links`,
        `broken-links:${newlyBroken.map((t) => t.targetId).sort().join(",")}`,
      );
    }
    onChange();
    return `Checked ${list.length} links: ${counts.ok} ok, ${counts.broken} broken, ${counts.blocked} blocked by store, ${counts.error} errors`;
  }

  jobs.define({ name: LINK_JOB, everyMs: 24 * 3_600_000, run: runAll });

  return {
    async health(): Promise<LinkHealth> {
      const [list, checks, job] = await Promise.all([targets(), db.select().from(schema.linkChecks), jobs.state(LINK_JOB)]);
      const byId = new Map(checks.map((c) => [c.targetId, c]));
      const rows: LinkCheckRow[] = list.map((t) => {
        const c = byId.get(t.targetId);
        const changed = c && c.url !== t.url; // edited since the last check
        return {
          ...t,
          status: c && !changed ? (c.status as LinkStatus) : "unchecked",
          httpStatus: c && !changed ? c.httpStatus : null,
          finalUrl: c && !changed ? c.finalUrl : null,
          detail: c && !changed ? c.detail : null,
          checkedAt: c && !changed ? c.checkedAt.toISOString() : null,
        };
      });
      const counts = { ok: 0, broken: 0, blocked: 0, error: 0, unchecked: 0 };
      for (const r of rows) counts[r.status]++;
      const order = { broken: 0, error: 1, unchecked: 2, blocked: 3, ok: 4 };
      rows.sort((a, b) => order[a.status] - order[b.status] || a.label.localeCompare(b.label));
      return { counts, links: rows, job };
    },
    async checkOne(targetId: string) {
      const t = (await targets()).find((x) => x.targetId === targetId);
      if (!t) return null;
      const r = await checkUrl(t.url);
      await save(t, r);
      return r;
    },
    /** Count of links currently known to be broken (for the dashboard). */
    async brokenCount() {
      const live = (await targets()).map((t) => t.targetId);
      if (!live.length) return 0;
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.linkChecks)
        .where(and(eq(schema.linkChecks.status, "broken"), inArray(schema.linkChecks.targetId, live)));
      return n;
    },
  };
}

export type LinkChecker = ReturnType<typeof createLinkChecker>;
