// Helpers for server-rendered meta tags (see pages.ts).

/** Swap the default social-preview tags in index.html for page-specific ones. */
export function withMeta(indexHtml: string, tags: string) {
  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[^>]*>/, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>/g, "")
    .replace("</head>", `    ${tags}\n  </head>`);
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
