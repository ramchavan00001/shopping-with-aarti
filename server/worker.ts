// Cloudflare Workers entry. Static files are served by Workers Static Assets
// (see wrangler.jsonc); only /api/*, /go/*, /look/* and /sitemap.xml reach
// this code.
import app from "./app";
import { renderLookHtml } from "./seo";

interface Env {
  ASSETS: Fetcher;
  MEDIA_BASE_URL?: string;
  ENQUIRY_WEBHOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/look/") && request.method === "GET") {
      const index = await env.ASSETS.fetch(new Request(new URL("/", url)));
      const { html, status } = renderLookHtml(await index.text(), url, env.MEDIA_BASE_URL || undefined);
      return new Response(html, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
      });
    }
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
