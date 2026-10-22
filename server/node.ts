// Node entry for Render (or any Node host): serves the built SPA from ./dist,
// the Hono API, and server-rendered meta tags for look pages.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import { createApp } from "./app";
import { connect, createDbSource } from "./data/db";
import { createDemoSource } from "./data/demo";
import { runMigrations, seedDemoIfEmpty } from "./db/setup";
import { renderLookHtml } from "./seo";
import type { DataSource } from "./data/types";

if (existsSync(".env")) process.loadEnvFile(".env");

const root = path.resolve(process.cwd(), "dist");
const indexHtml = await readFile(path.join(root, "index.html"), "utf8");

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

const { app: api, repoFor } = createApp(() => source);
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
app.use("/images/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=86400");
});
// Look pages get reel-specific meta tags for link previews and SEO.
app.get("/look/*", async (c) => {
  const repo = await repoFor(c);
  const { html, status } = renderLookHtml(indexHtml, new URL(c.req.url), repo, process.env.MEDIA_BASE_URL || undefined);
  c.header("Cache-Control", "public, max-age=300");
  return c.html(html, status as 200 | 404);
});
app.route("/", api);
app.use("*", serveStatic({ root: "./dist" }));
// SPA fallback: unknown paths get index.html so client-side routing works.
app.get("*", (c) => {
  if (c.req.path.startsWith("/admin")) c.header("X-Robots-Tag", "noindex");
  return c.html(indexHtml);
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: (req) => app.fetch(req, process.env), port }, () => {
  console.log(`Shopping with Aarti running on http://localhost:${port}`);
});
