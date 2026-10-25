// Cloudflare Workers entry. Static files are served by Workers Static Assets
// (see wrangler.jsonc); only /api/*, /go/*, /look/* and /sitemap.xml reach
// this code. Runs read-only on the built-in demo catalogue: the database and
// admin panel are served from the Node deployment (Render).
import { createApp } from "./app";
import { createDemoSource } from "./data/demo";
import { renderPage } from "./pages";
import { mergeSettings } from "../shared/settings";

interface Env {
  ASSETS: Fetcher;
  MEDIA_BASE_URL?: string;
  ENQUIRY_WEBHOOK_URL?: string;
}

const source = createDemoSource();
const { app, repoFor } = createApp(() => source);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if ((url.pathname.startsWith("/look/") || url.pathname.startsWith("/hi/look/")) && request.method === "GET") {
      const [index, repo, cat] = await Promise.all([env.ASSETS.fetch(new Request(new URL("/", url))), repoFor({} as never), source.catalog()]);
      const { html, status } = renderPage({
        indexHtml: await index.text(),
        url,
        repo,
        origin: url.origin,
        settings: mergeSettings(cat.settings),
        mediaBaseUrl: env.MEDIA_BASE_URL || undefined,
      });
      return new Response(html, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
      });
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
