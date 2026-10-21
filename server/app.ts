import { Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";
import { getAffiliateUrl, getHome, getReel, listReels } from "./repo";
import { stores } from "../shared/stores";
import type { StoreId } from "../shared/types";

// One Hono app for every runtime: Vite dev middleware, Node (Render) and
// Cloudflare Workers. Read configuration through `env(c)` only, never
// process.env directly, so it works on Workers too.

type Env = { MEDIA_BASE_URL?: string };

const app = new Hono();

const repoOpts = (c: Parameters<typeof env>[0]) => ({ mediaBaseUrl: env<Env>(c).MEDIA_BASE_URL || undefined });

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/home", (c) => {
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  return c.json(getHome(repoOpts(c)));
});

app.get("/api/reels", (c) => {
  const store = c.req.query("store");
  const maxPrice = Number(c.req.query("maxPrice"));
  const limit = Number(c.req.query("limit"));
  const reels = listReels(
    {
      category: c.req.query("category") || undefined,
      store: store && store in stores ? (store as StoreId) : undefined,
      q: c.req.query("q") || undefined,
      codes: c.req.query("codes")?.split(",").filter(Boolean),
      maxPrice: maxPrice > 0 ? maxPrice : undefined,
      limit: limit > 0 ? limit : undefined,
    },
    repoOpts(c),
  );
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  return c.json({ reels });
});

app.get("/api/reels/:code", (c) => {
  const reel = getReel(c.req.param("code"), repoOpts(c));
  return reel ? c.json({ reel }) : c.json({ error: "Reel not found" }, 404);
});

// Tracked outbound link: log the click, then send the shopper to the store.
app.get("/go/:productId", (c) => {
  const hit = getAffiliateUrl(c.req.param("productId"));
  if (!hit) return c.redirect("/", 302);

  // TODO: write to the clicks table once a database is attached.
  console.log(
    JSON.stringify({
      event: "affiliate_click",
      productId: hit.product.id,
      reel: hit.product.reelCode,
      store: hit.product.store,
      ref: c.req.header("referer") ?? null,
      ua: c.req.header("user-agent") ?? null,
      at: new Date().toISOString(),
    }),
  );

  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  return c.redirect(hit.url, 302);
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
