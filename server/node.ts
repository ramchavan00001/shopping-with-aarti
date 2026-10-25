// Node entry for Render (or any Node host): serves the built SPA from ./dist,
// the Hono API, and server-rendered meta tags for look pages.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import { createApp } from "./app";
import { connect, createDbSource } from "./data/db";
import { createDemoSource } from "./data/demo";
import { runMigrations, seedDemoIfEmpty } from "./db/setup";
import { esc } from "./seo";
import { renderPage } from "./pages";
import { createImageCache, lookImage, siteImage } from "./og";
import { resizeImage } from "./images";
import { publicOrigin } from "./origin";
import { media } from "./repo";
import { mergeSettings, photoFields } from "../shared/settings";
import type { DataSource } from "./data/types";

if (existsSync(".env")) process.loadEnvFile(".env");

const root = path.resolve(process.cwd(), "dist");
let indexHtml = await readFile(path.join(root, "index.html"), "utf8");
// Lets the site resize images from the media bucket too (see src/lib/img.ts).
if (process.env.MEDIA_BASE_URL) {
  try {
    indexHtml = indexHtml.replace("</head>", `    <meta name="media-host" content="${esc(new URL(process.env.MEDIA_BASE_URL).hostname)}" />\n    <link rel="preconnect" href="${esc(new URL(process.env.MEDIA_BASE_URL).origin)}" />\n  </head>`);
  } catch {
    console.log("MEDIA_BASE_URL is not a valid URL");
  }
}
// Google Search Console ownership check (Settings → Ownership verification → HTML tag).
if (process.env.GOOGLE_SITE_VERIFICATION) {
  indexHtml = indexHtml.replace("</head>", `    <meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}" />\n  </head>`);
}

let source: DataSource;
if (process.env.DATABASE_URL) {
  const { db } = connect(process.env.DATABASE_URL);
  await runMigrations(db);
  if (process.env.SEED_DEMO !== "false" && (await seedDemoIfEmpty(db))) console.log("Empty database: added the demo catalogue.");
  source = createDbSource(db);
  console.log("Data: PostgreSQL");
} else {
  source = createDemoSource();
  console.log("Data: built-in demo catalogue (set DATABASE_URL to use PostgreSQL and enable the admin panel)");
}
if (!process.env.ADMIN_PASSWORD) console.log("Admin panel disabled: set ADMIN_PASSWORD to enable /admin");
// Link checks and Instagram sync run on a timer while the server is awake.
source.ops?.jobs.schedule();

const { app: api, repoFor } = createApp(() => source, { resizeImage });
const app = new Hono();

app.use("*", compress());
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});
app.use(
  "/assets/*",
  async (c, next) => {
    await next();
    // Vite fingerprints these filenames, so they can be cached forever.
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  },
  serveStatic({ root: "./dist" }),
);
// The service worker and manifest must update as soon as a new version is deployed.
app.use("/sw.js", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-cache");
});
app.use("/manifest.webmanifest", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=3600");
  c.header("Content-Type", "application/manifest+json");
});
app.use("/images/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=86400");
});
const origin = (c: Context) => publicOrigin(c.req.raw, process.env.SITE_URL);
const mediaBase = () => process.env.MEDIA_BASE_URL || undefined;

// Share images (1200×630 PNG) for link previews.
const ogCache = createImageCache();
app.get("/og/look/:file", async (c) => {
  const code = c.req.param("file").replace(/\.png$/i, "");
  const reel = (await repoFor(c)).getReel(code, { mediaBaseUrl: mediaBase() });
  if (!reel) return c.notFound();
  const key = `look:${reel.code}:${reel.title}:${reel.poster}:${reel.products.map((p) => p.store).join()}`;
  const png = await ogCache(key, () => lookImage(reel, origin(c)));
  return c.body(new Uint8Array(png), 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
});
app.get("/og/site.png", async (c) => {
  const settings = mergeSettings((await source.catalog()).settings);
  for (const k of photoFields) settings[k] = media(settings[k], mediaBase());
  const png = await ogCache(`site:${settings.heroPortrait}:${settings.instagramHandle}`, () => siteImage(settings, origin(c)));
  return c.body(new Uint8Array(png), 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
});

// Every page: its own title, description, canonical/hreflang links,
// structured data and a plain-HTML snapshot, in English and Hindi (/hi/…).
const page = async (c: Context) => {
  const [repo, cat] = await Promise.all([repoFor(c), source.catalog()]);
  const settings = mergeSettings(cat.settings);
  for (const k of photoFields) settings[k] = media(settings[k], mediaBase());
  const o = origin(c);
  const { html, status, noindex } = renderPage({
    indexHtml,
    url: new URL(c.req.url),
    repo,
    origin: o,
    settings,
    mediaBaseUrl: mediaBase(),
    lookImage: (reel) => `${o}/og/look/${reel.code.toLowerCase()}.png`,
    siteImage: `${o}/og/site.png`,
  });
  if (noindex) c.header("X-Robots-Tag", "noindex, follow");
  // Always revalidate: the page names this deploy's script files.
  c.header("Cache-Control", "no-cache");
  return c.html(html, status as 200 | 404);
};
app.get("/", page);
app.route("/", api);
app.use("*", serveStatic({ root: "./dist" }));
// SPA fallback: unknown paths get index.html so client-side routing works.
app.get("*", page);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: (req) => app.fetch(req, process.env), port }, () => {
  console.log(`Shopping with Aarti running on http://localhost:${port}`);
});
