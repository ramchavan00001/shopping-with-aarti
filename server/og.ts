import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import sharp from "sharp";
import type { PublicReel } from "../shared/types";
import { defaultSettings, type SiteSettings } from "../shared/settings";
import { site } from "../shared/site";
import { stores } from "../shared/stores";

// Share images (Open Graph, 1200×630) for WhatsApp/Facebook/Google previews:
// one per look (cover + title + code + stores) and one for the site.
// Node-only. Rendered with satori (HTML-like layout → SVG) and resvg (SVG → PNG).

const W = 1200;
const H = 630;
const require = createRequire(import.meta.url);

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" }[]> | undefined;
function fonts() {
  fontsPromise ??= Promise.all([
    // latin-ext carries ₹; satori only falls back across differently named fonts.
    ["Fraunces", "@fontsource/fraunces/files/fraunces-latin-600-normal.woff", 600],
    ["Fraunces Ext", "@fontsource/fraunces/files/fraunces-latin-ext-600-normal.woff", 600],
    ["Inter", "@fontsource/inter/files/inter-latin-500-normal.woff", 500],
    ["Inter Ext", "@fontsource/inter/files/inter-latin-ext-500-normal.woff", 500],
    ["Inter", "@fontsource/inter/files/inter-latin-600-normal.woff", 600],
    ["Inter Ext", "@fontsource/inter/files/inter-latin-ext-600-normal.woff", 600],
  ].map(async ([name, file, weight]) => ({ name: name as string, data: await readFile(require.resolve(file as string)), weight: weight as 500 | 600, style: "normal" as const })));
  return fontsPromise;
}

/** Fetch a remote image or read a site image (/images/…), as a JPEG data URL sized for the card. */
async function imageData(src: string, origin: string, w: number, h: number): Promise<string | null> {
  try {
    let buf: Buffer;
    if (src.startsWith("/")) {
      buf = await readFile(path.join(process.cwd(), "dist", src));
    } else {
      const res = await fetch(src.startsWith("http") ? src : `${origin}/${src}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    }
    const jpg = await sharp(buf).resize(w, h, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

// Tiny element helper so the layout reads like JSX without a JSX build step.
type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (El | string | null | false)[]): El => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.filter(Boolean) },
});
const img = (src: string, style: Record<string, unknown>): El => ({ type: "img", props: { src, style } });

const COLORS = { bg: "#FBF7F3", ink: "#1F1A17", muted: "#6F625B", accent: "#8E2C48", gold: "#C9A46A", blush: "#F3DCD8" };

async function render(tree: El) {
  const svg = await satori(tree as never, { width: W, height: H, fonts: await fonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

const brand = () =>
  h(
    "div",
    { alignItems: "center", gap: 14 },
    h("div", { width: 52, height: 52, borderRadius: 14, background: COLORS.accent, color: "#fff", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, Fraunces Ext", fontSize: 30 }, "a"),
    h("div", { flexDirection: "column" },
      h("div", { fontFamily: "Inter, Inter Ext", fontWeight: 600, fontSize: 14, letterSpacing: 3, color: COLORS.muted }, "SHOPPING WITH"),
      h("div", { fontFamily: "Fraunces, Fraunces Ext", fontSize: 28, color: COLORS.ink, marginTop: -2 }, "Aarti"),
    ),
  );

export async function lookImage(reel: PublicReel, origin: string) {
  const poster = await imageData(reel.poster, origin, 420, 630);
  const storeIds = [...new Set(reel.products.map((p) => p.store))].slice(0, 4);
  const title = reel.title.length > 90 ? `${reel.title.slice(0, 87)}…` : reel.title;
  return render(
    h("div", { width: W, height: H, background: COLORS.bg },
      poster ? img(poster, { width: 420, height: H, objectFit: "cover" }) : h("div", { width: 420, height: H, background: COLORS.blush }),
      h("div", { flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", flex: 1 },
        brand(),
        h("div", { flexDirection: "column", gap: 22 },
          h("div", { alignSelf: "flex-start", background: COLORS.accent, color: "#fff", fontFamily: "Inter, Inter Ext", fontWeight: 600, fontSize: 24, padding: "8px 18px", borderRadius: 999 }, `Look #${reel.code}`),
          h("div", { fontFamily: "Fraunces, Fraunces Ext", fontSize: title.length > 50 ? 50 : 60, lineHeight: 1.1, color: COLORS.ink }, title),
          storeIds.length
            ? h("div", { gap: 10, alignItems: "center" },
                h("div", { fontFamily: "Inter, Inter Ext", fontWeight: 500, fontSize: 24, color: COLORS.muted, marginRight: 4 }, `Shop ${reel.products.length} item${reel.products.length === 1 ? "" : "s"} on`),
                ...storeIds.map((s) => h("div", { background: stores[s].color, color: stores[s].ink, fontFamily: "Inter, Inter Ext", fontWeight: 600, fontSize: 20, padding: "6px 14px", borderRadius: 999 }, stores[s].name)),
              )
            : null,
        ),
        h("div", { fontFamily: "Inter, Inter Ext", fontWeight: 500, fontSize: 22, color: COLORS.accent }, "Tried on by Aarti · tap to shop the look"),
      ),
    ),
  );
}

export async function siteImage(settings: SiteSettings, origin: string) {
  const photo =
    (await imageData(settings.heroPortrait, origin, 460, 630)) ??
    (settings.heroPortrait !== defaultSettings.heroPortrait ? await imageData(defaultSettings.heroPortrait, origin, 460, 630) : null);
  return render(
    h("div", { width: W, height: H, background: COLORS.bg },
      h("div", { flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", flex: 1 },
        brand(),
        h("div", { flexDirection: "column", gap: 6 },
          h("div", { fontFamily: "Fraunces, Fraunces Ext", fontSize: 76, lineHeight: 1.05, color: COLORS.ink }, "Real outfits."),
          h("div", { fontFamily: "Fraunces, Fraunces Ext", fontSize: 76, lineHeight: 1.05, color: COLORS.accent }, "Real prices."),
          h("div", { fontFamily: "Fraunces, Fraunces Ext", fontSize: 76, lineHeight: 1.05, color: COLORS.ink }, "Tried on by me."),
        ),
        h("div", { fontFamily: "Inter, Inter Ext", fontWeight: 500, fontSize: 24, color: COLORS.muted }, `Amazon · Flipkart · Meesho · Myntra  —  ${settings.instagramHandle}`),
      ),
      photo ? img(photo, { width: 460, height: H, objectFit: "cover" }) : h("div", { width: 460, height: H, background: COLORS.blush }),
    ),
  );
}

/** Small in-memory cache so popular links don't re-render every time. */
export function createImageCache(max = 200) {
  const cache = new Map<string, Buffer>();
  return async (key: string, make: () => Promise<Buffer>) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const buf = await make();
    cache.set(key, buf);
    if (cache.size > max) cache.delete(cache.keys().next().value!);
    return buf;
  };
}

export const ogTitle = site.name;
