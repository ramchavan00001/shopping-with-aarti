import { Hono, type Context } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { allCategories, allReels, getDeals, getHome, getLook, getOutbound, getReel, listProducts, listReels, search } from "./repo";
import { stores } from "../shared/stores";
import { categoryPath, lookPath } from "../shared/paths";
import { validateEnquiry } from "../shared/enquiry";
import { colours, occasions, type Colour, type Occasion, type ProductSort, type StoreId } from "../shared/types";

// One Hono app for every runtime: Vite dev middleware, Node (Render) and
// Cloudflare Workers. Read configuration through `env(c)` only, never
// process.env directly, so it works on Workers too.

type Env = { MEDIA_BASE_URL?: string; ENQUIRY_WEBHOOK_URL?: string };

const app = new Hono();

const repoOpts = (c: Context) => ({ mediaBaseUrl: env<Env>(c).MEDIA_BASE_URL || undefined });
const cacheShort = (c: Context) => c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");

const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
const storeParam = (v?: string) => (v && v in stores ? (v as StoreId) : undefined);
const positive = (v?: string) => {
  const n = Number(v);
  return n > 0 ? n : undefined;
};

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/home", (c) => {
  cacheShort(c);
  return c.json(getHome(repoOpts(c)));
});

app.get("/api/reels", (c) => {
  cacheShort(c);
  const reels = listReels(
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

app.get("/api/reels/:code", (c) => {
  const reel = getReel(c.req.param("code"), repoOpts(c));
  return reel ? c.json({ reel }) : c.json({ error: "Reel not found" }, 404);
});

app.get("/api/looks/:code", (c) => {
  const look = getLook(c.req.param("code"), repoOpts(c));
  if (!look) return c.json({ error: "Look not found" }, 404);
  cacheShort(c);
  return c.json(look);
});

app.get("/api/products", (c) => {
  cacheShort(c);
  return c.json(
    listProducts(
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

app.get("/api/search", (c) => {
  const q = (c.req.query("q") ?? "").slice(0, 80);
  cacheShort(c);
  return c.json(search(q, repoOpts(c), positive(c.req.query("limit")) ?? 8));
});

app.get("/api/deals", (c) => {
  c.header("Cache-Control", "public, max-age=30");
  return c.json(getDeals(repoOpts(c)));
});

app.post("/api/enquiries", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid request" }, 400);

  const { data, errors } = validateEnquiry(body);
  if (!data) return c.json({ error: "Please fix the highlighted fields.", errors }, 422);
  // Bots fill the hidden field; pretend success so they don't retry.
  if (data.website) return c.json({ ok: true });

  const { website: _hp, ...enquiry } = data;
  const record = { event: "brand_enquiry", ...enquiry, at: new Date().toISOString() };
  console.log(JSON.stringify(record));

  // Optional: forward to a webhook (Google Apps Script, Zapier, Make, Slack...).
  const webhook = env<Env>(c).ENQUIRY_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } catch (err) {
      console.error(JSON.stringify({ event: "enquiry_webhook_failed", error: String(err) }));
      return c.json({ error: "Couldn't send right now. Please email instead." }, 502);
    }
  }
  return c.json({ ok: true });
});

// Tracked outbound link: log the click, then send the shopper to the store.
app.get("/go/:id", (c) => {
  const hit = getOutbound(c.req.param("id"));
  if (!hit) return c.redirect("/", 302);

  // TODO: write to the clicks table once a database is attached.
  console.log(
    JSON.stringify({
      event: "affiliate_click",
      id: c.req.param("id"),
      kind: hit.kind,
      reel: hit.reel ?? null,
      store: hit.store,
      ref: c.req.header("referer") ?? null,
      ua: c.req.header("user-agent") ?? null,
      at: new Date().toISOString(),
    }),
  );

  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  return c.redirect(hit.url, 302);
});

app.get("/sitemap.xml", (c) => {
  const origin = new URL(c.req.url).origin;
  const urls = [
    { loc: "/", priority: "1.0" },
    { loc: "/reels", priority: "0.9" },
    { loc: "/deals", priority: "0.8" },
    { loc: "/about", priority: "0.6" },
    ...allCategories().map((cat) => ({ loc: categoryPath(cat.slug), priority: "0.8" })),
    ...allReels().map((r) => ({ loc: lookPath(r), priority: "0.7", lastmod: r.publishedAt })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${origin}${u.loc}</loc>${"lastmod" in u ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
    .join("\n");
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
