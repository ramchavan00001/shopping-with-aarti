import { Hono, type Context } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { createRepo, media, type Repo } from "./repo";
import { mergeSettings, photoFields } from "../shared/settings";
import { createAdminApi } from "./admin-api";
import { publicOrigin } from "./origin";
import { requestSource, shouldRecord, trackRateLimited, visitorHash } from "./analytics";
import { eventKinds, ignoredClientErrors, isBot, type EventKind } from "../shared/analytics";
import { validateSubscribe } from "../shared/subscribe";
import { parseSubscription } from "../shared/push";
import type { Catalog, DataSource } from "./data/types";
import { stores } from "../shared/stores";
import { categoryPath, lookPath } from "../shared/paths";
import { validateEnquiry } from "../shared/enquiry";
import { isResizableHost, isSiteImage, snapWidth } from "../shared/images";
import { colours, occasions, type Colour, type Occasion, type ProductSort, type StoreId } from "../shared/types";

// One Hono app for every runtime: Vite dev middleware, Node (Render) and
// Cloudflare Workers. Each runtime passes in where the data comes from.
// Read configuration through `env(c)` only, never process.env directly.

type Env = { MEDIA_BASE_URL?: string; ENQUIRY_WEBHOOK_URL?: string };

export type SourceResolver = (c: Context) => DataSource;

export interface AppOptions {
  /** Resize an image to a WebP (Node only); without it /img redirects to the original. */
  resizeImage?: (src: string, width: number) => Promise<Uint8Array | null>;
}

const repos = new WeakMap<Catalog, Repo>();

export function createApp(getSource: SourceResolver, options: AppOptions = {}) {
  const app = new Hono();

  /** Query helpers over the current catalogue snapshot (cached by the source). */
  async function repoFor(c: Context) {
    const cat = await getSource(c).catalog();
    let repo = repos.get(cat);
    if (!repo) repos.set(cat, (repo = createRepo(cat)));
    return repo;
  }

  const repoOpts = (c: Context) => ({ mediaBaseUrl: env<Env>(c).MEDIA_BASE_URL || undefined });
  const cacheShort = (c: Context) => c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");

  /** Keep work running after the response (Workers needs waitUntil; Node just continues). */
  function background(c: Context, task: Promise<unknown>) {
    const logged = task.catch((err) => console.error(JSON.stringify({ event: "background_task_failed", error: String(err) })));
    try {
      c.executionCtx.waitUntil(logged);
    } catch {
      // No execution context outside Workers.
    }
  }

  const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
  const storeParam = (v?: string) => (v && v in stores ? (v as StoreId) : undefined);
  const positive = (v?: string) => {
    const n = Number(v);
    return n > 0 ? n : undefined;
  };

  app.use("/api/*", async (c, next) => {
    // Public read endpoints may be called from anywhere; admin ones may not.
    if (c.req.path.startsWith("/api/admin")) return next();
    return cors()(c, next);
  });

  app.onError((err, c) => {
    console.error(JSON.stringify({ event: "request_failed", path: c.req.path, error: String(err), stack: err.stack }));
    const ops = getSource(c).ops;
    if (ops) background(c, ops.errors.record("server", err.message || String(err), err.stack, c.req.path));
    return c.json({ error: "Something went wrong. Please try again." }, 500);
  });

  app.get("/api/health", async (c) => {
    const source = getSource(c);
    try {
      await source.catalog();
      return c.json({ ok: true, data: source.kind, time: new Date().toISOString() });
    } catch (err) {
      return c.json({ ok: false, data: source.kind, error: String(err) }, 503);
    }
  });

  app.get("/api/settings", async (c) => {
    const cat = await getSource(c).catalog();
    const merged = mergeSettings(cat.settings);
    const base = repoOpts(c).mediaBaseUrl;
    for (const k of photoFields) merged[k] = media(merged[k], base);
    c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    return c.json(merged);
  });

  app.get("/api/home", async (c) => {
    const repo = await repoFor(c);
    cacheShort(c);
    return c.json(repo.getHome(repoOpts(c)));
  });

  app.get("/api/reels", async (c) => {
    const repo = await repoFor(c);
    cacheShort(c);
    const reels = repo.listReels(
      {
        category: c.req.query("category") || undefined,
        store: storeParam(c.req.query("store")),
        q: c.req.query("q") || undefined,
        codes: c.req.query("codes")?.split(",").filter(Boolean),
        maxPrice: positive(c.req.query("maxPrice")),
        limit: positive(c.req.query("limit")),
      },
      repoOpts(c),
    );
    return c.json({ reels });
  });

  app.get("/api/reels/:code", async (c) => {
    const reel = (await repoFor(c)).getReel(c.req.param("code"), repoOpts(c));
    return reel ? c.json({ reel }) : c.json({ error: "Reel not found" }, 404);
  });

  app.get("/api/looks/:code", async (c) => {
    const look = (await repoFor(c)).getLook(c.req.param("code"), repoOpts(c));
    if (!look) return c.json({ error: "Look not found" }, 404);
    cacheShort(c);
    return c.json(look);
  });

  app.get("/api/products", async (c) => {
    const repo = await repoFor(c);
    cacheShort(c);
    return c.json(
      repo.listProducts(
        {
          category: c.req.query("category") || undefined,
          store: storeParam(c.req.query("store")),
          maxPrice: positive(c.req.query("maxPrice")),
          occasion: oneOf<Occasion>(c.req.query("occasion"), occasions),
          colour: oneOf<Colour>(c.req.query("colour"), Object.keys(colours) as Colour[]),
          sort: oneOf<ProductSort>(c.req.query("sort"), ["popular", "newest", "price-asc", "price-desc"]),
        },
        repoOpts(c),
      ),
    );
  });

  app.get("/api/search", async (c) => {
    const q = (c.req.query("q") ?? "").slice(0, 80);
    const repo = await repoFor(c);
    cacheShort(c);
    return c.json(repo.search(q, repoOpts(c), positive(c.req.query("limit")) ?? 8));
  });

  app.get("/api/saved", async (c) => {
    const list = (key: string) => (c.req.query(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
    const repo = await repoFor(c);
    c.header("Cache-Control", "private, max-age=30");
    return c.json(repo.getSaved(list("reels"), list("products"), repoOpts(c)));
  });

  app.get("/api/deals", async (c) => {
    const repo = await repoFor(c);
    c.header("Cache-Control", "public, max-age=30");
    return c.json(repo.getDeals(repoOpts(c)));
  });

  app.post("/api/enquiries", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "Invalid request" }, 400);

    const { data, errors } = validateEnquiry(body);
    if (!data) return c.json({ error: "Please fix the highlighted fields.", errors }, 422);
    // Bots fill the hidden field; pretend success so they don't retry.
    if (data.website) return c.json({ ok: true });

    const { website: _hp, ...enquiry } = data;
    let saved = false;
    try {
      await getSource(c).saveEnquiry(enquiry);
      saved = true;
    } catch (err) {
      console.error(JSON.stringify({ event: "enquiry_save_failed", error: String(err), enquiry }));
    }

    // Optional: also forward to a webhook (Google Apps Script, Zapier, Make, Slack...).
    const webhook = env<Env>(c).ENQUIRY_WEBHOOK_URL;
    let forwarded = false;
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "brand_enquiry", ...enquiry, at: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
        forwarded = true;
      } catch (err) {
        console.error(JSON.stringify({ event: "enquiry_webhook_failed", error: String(err) }));
      }
    }
    if (!saved && !forwarded) return c.json({ error: "Couldn't send right now. Please email instead." }, 502);
    return c.json({ ok: true });
  });

  // WhatsApp deal-alert sign-up.
  app.post("/api/subscribe", async (c) => {
    const ops = getSource(c).ops;
    if (!ops) return c.json({ error: "Sign-ups aren't available right now." }, 503);
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ error: "Invalid request" }, 400);
    const { data, errors } = validateSubscribe(body);
    if (!data) return c.json({ error: "Please fix the highlighted fields.", errors }, 422);
    if (data.website) return c.json({ ok: true }); // honeypot
    await ops.subscribers.add({ name: data.name, phone: data.phone, interests: data.interests, source: requestSource(c, typeof body.src === "string" ? body.src : null) });
    return c.json({ ok: true });
  });

  // Push notifications (src/lib/push.ts and public/sw.js).
  app.get("/api/push/key", async (c) => {
    const ops = getSource(c).ops;
    if (!ops) return c.json({ error: "Notifications aren't available here." }, 404);
    c.header("Cache-Control", "public, max-age=3600");
    return c.json({ publicKey: await ops.push.publicKey() });
  });
  app.post("/api/push/subscribe", async (c) => {
    const ops = getSource(c).ops;
    if (!ops) return c.json({ error: "Notifications aren't available here." }, 404);
    if (trackRateLimited(c)) return c.json({ error: "Too many requests" }, 429);
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const sub = parseSubscription(body?.subscription);
    if (!sub) return c.json({ error: "Invalid subscription" }, 400);
    const replaces = typeof body?.replaces === "string" ? body.replaces : undefined;
    await ops.push.subscribe(sub, body?.lang === "hi" ? "hi" : "en", requestSource(c, typeof body?.src === "string" ? body.src : null), replaces);
    return c.json({ ok: true });
  });
  app.post("/api/push/unsubscribe", async (c) => {
    const ops = getSource(c).ops;
    const body = (await c.req.json().catch(() => null)) as { endpoint?: unknown } | null;
    if (ops && typeof body?.endpoint === "string") await ops.push.unsubscribe(body.endpoint);
    return c.json({ ok: true });
  });
  app.post("/api/push/click/:id", async (c) => {
    const ops = getSource(c).ops;
    const id = Number(c.req.param("id"));
    if (ops && Number.isInteger(id) && id > 0 && !trackRateLimited(c)) background(c, ops.push.click(id));
    return c.body(null, 204);
  });

  // Browser errors (sent by src/lib/errors.ts). Always 204.
  app.post("/api/client-errors", async (c) => {
    const ops = getSource(c).ops;
    if (!ops || trackRateLimited(c)) return c.body(null, 204);
    const b = (await c.req.text().then((t) => JSON.parse(t)).catch(() => null)) as Record<string, unknown> | null;
    const message = typeof b?.message === "string" ? b.message : "";
    const stack = typeof b?.stack === "string" ? b.stack : "";
    if (!message || isBot(c.req.header("user-agent")) || ignoredClientErrors.some((r) => r.test(message) || r.test(stack))) return c.body(null, 204);
    const detail = [typeof b?.stack === "string" ? b.stack : "", `Browser: ${c.req.header("user-agent") ?? "?"}`].filter(Boolean).join("\n");
    background(c, ops.errors.record("client", message, detail, typeof b?.path === "string" ? b.path : undefined));
    return c.body(null, 204);
  });

  // Optional: an outside scheduler (e.g. cron-job.org) can run due jobs:
  // GET /api/cron?key=<CRON_SECRET>
  app.get("/api/cron", async (c) => {
    const secret = env<{ CRON_SECRET?: string }>(c).CRON_SECRET;
    const ops = getSource(c).ops;
    if (!secret || c.req.query("key") !== secret || !ops) return c.json({ error: "Not found" }, 404);
    await ops.jobs.tick();
    return c.json({ ok: true, jobs: await ops.jobs.all() });
  });

  // Tracked outbound link: record the click, then send the shopper to the store.
  // The browser adds ?src=<traffic source> (see src/lib/track.ts).
  app.get("/go/:id", async (c) => {
    const hit = (await repoFor(c)).getOutbound(c.req.param("id"));
    if (!hit) return c.redirect("/", 302);

    if (await shouldRecord(c)) {
      background(
        c,
        visitorHash(c).then((visitor) =>
          getSource(c).recordClick({
            targetId: c.req.param("id"),
            kind: hit.kind,
            reelCode: hit.reel,
            store: hit.store,
            referrer: c.req.header("referer"),
            userAgent: c.req.header("user-agent"),
            source: requestSource(c, c.req.query("src")),
            visitor,
          }),
        ),
      );
    }

    c.header("Cache-Control", "no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
    return c.redirect(hit.url, 302);
  });

  // Site activity from the browser (sent with navigator.sendBeacon, so the
  // body may arrive as text/plain). Always answers 204: tracking must never
  // break the page.
  app.post("/api/track", async (c) => {
    if (trackRateLimited(c) || !(await shouldRecord(c))) return c.body(null, 204);
    const body = (await c.req.text().then((t) => JSON.parse(t)).catch(() => null)) as Record<string, unknown> | null;
    const kind = typeof body?.kind === "string" && (eventKinds as readonly string[]).includes(body.kind) ? (body.kind as EventKind) : null;
    if (!kind) return c.body(null, 204);

    let reelCode: string | undefined;
    if (kind === "reel_play" || kind === "look_view") {
      const code = typeof body?.reel === "string" ? body.reel.toUpperCase() : "";
      if (!(await repoFor(c)).getReel(code, {})) return c.body(null, 204);
      reelCode = code;
    }
    const path = typeof body?.path === "string" ? body.path.split("?")[0].slice(0, 300) : undefined;
    background(
      c,
      visitorHash(c).then((visitor) =>
        getSource(c).recordEvent({ kind, reelCode, path, source: requestSource(c, typeof body?.src === "string" ? body.src : null), visitor }),
      ),
    );
    return c.body(null, 204);
  });

  app.get("/sitemap.xml", async (c) => {
    const repo = await repoFor(c);
    const origin = publicOrigin(c.req.raw, env<{ SITE_URL?: string }>(c).SITE_URL);
    const urls = [
      { loc: "/", priority: "1.0" },
      { loc: "/reels", priority: "0.9" },
      { loc: "/deals", priority: "0.8" },
      { loc: "/about", priority: "0.6" },
      { loc: "/privacy", priority: "0.2" },
      { loc: "/terms", priority: "0.2" },
      ...repo.allCategories().map((cat) => ({ loc: categoryPath(cat.slug), priority: "0.8" })),
      ...repo.allReels().map((r) => ({ loc: lookPath(r), priority: "0.7", lastmod: r.publishedAt })),
    ];
    const body = urls
      .map((u) => `  <url><loc>${origin}${u.loc}</loc>${"lastmod" in u ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
      .join("\n");
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=3600");
    return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  });

  // Resized images: /img?w=480&src=<site path or image URL>.
  app.get("/img", async (c) => {
    const src = c.req.query("src") ?? "";
    const width = snapWidth(Number(c.req.query("w")) || 640);
    let allowed = isSiteImage(src);
    if (!allowed) {
      try {
        const url = new URL(src);
        const base = repoOpts(c).mediaBaseUrl;
        allowed = url.protocol === "https:" && isResizableHost(url.hostname, base ? new URL(base).hostname : undefined);
      } catch {
        allowed = false;
      }
    }
    if (!allowed) return c.text("Image source not allowed", 400);
    const out = options.resizeImage && (await options.resizeImage(src, width));
    if (!out) {
      c.header("Cache-Control", "public, max-age=3600");
      return c.redirect(src, 302);
    }
    c.header("Content-Type", "image/webp");
    c.header("Cache-Control", "public, max-age=2592000, stale-while-revalidate=86400");
    return c.body(out as Uint8Array<ArrayBuffer>);
  });

  app.get("/robots.txt", (c) => {
    const origin = publicOrigin(c.req.raw, env<{ SITE_URL?: string }>(c).SITE_URL);
    c.header("Cache-Control", "public, max-age=3600");
    return c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /go/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.route("/api/admin", createAdminApi(getSource));

  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  return { app, repoFor };
}
