import { site } from "../shared/site";
import { lookPath, codeFromLookSlug } from "../shared/paths";
import type { Repo } from "./repo";

// Server-side meta tags for look pages, so links shared on WhatsApp,
// Instagram and Google show the reel's title and poster instead of the
// generic site card. Used by both the Node and Workers entries.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderLookHtml(indexHtml: string, url: URL, repo: Repo, mediaBaseUrl?: string): { html: string; status: number } {
  const slug = url.pathname.replace(/^\/look\//, "").replace(/\/$/, "");
  const reel = repo.getReel(codeFromLookSlug(slug), { mediaBaseUrl });
  if (!reel) return { html: indexHtml, status: 404 };

  const title = `${reel.title} · Shop the look #${reel.code} | ${site.name}`;
  const stores = [...new Set(reel.products.map((p) => p.store))].join(", ");
  const description = `${reel.caption} Shop all ${reel.products.length} items from ${stores}.`.slice(0, 300);
  const canonical = `${url.origin}${lookPath(reel)}`;
  const poster = reel.poster.startsWith("http") ? reel.poster : `${url.origin}${reel.poster}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: reel.title,
    description: reel.caption,
    thumbnailUrl: [poster],
    uploadDate: reel.publishedAt,
    contentUrl: reel.video,
  };

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="video.other" />`,
    `<meta property="og:title" content="${esc(reel.title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(poster)}" />`,
    `<meta property="og:video" content="${esc(reel.video)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");

  const html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[^>]*>/, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>/g, "")
    .replace("</head>", `    ${tags}\n  </head>`);
  return { html, status: 200 };
}
