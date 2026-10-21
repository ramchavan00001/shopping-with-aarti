// Node entry for Render (or any Node host): serves the built SPA from ./dist
// plus the shared Hono API.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import api from "./app";

const root = path.resolve(process.cwd(), "dist");
const indexHtml = await readFile(path.join(root, "index.html"), "utf8");

const app = new Hono();

app.use("*", compress());
app.use(
  "/assets/*",
  async (c, next) => {
    await next();
    // Vite fingerprints these filenames, so they can be cached forever.
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  },
  serveStatic({ root: "./dist" }),
);
app.route("/", api);
app.use("*", serveStatic({ root: "./dist" }));
// SPA fallback: unknown paths get index.html so client-side routing works.
app.get("*", (c) => c.html(indexHtml));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: (req) => app.fetch(req, process.env), port }, () => {
  console.log(`Shopping with Aarti running on http://localhost:${port}`);
});
