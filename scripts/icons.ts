// Generates the app icons in public/icons from the logo mark (an italic "a"
// with a gold dot). Run with `npx tsx scripts/icons.ts` after changing the logo;
// the PNGs are committed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const require = createRequire(import.meta.url);
const font = await readFile(require.resolve("@fontsource/fraunces/files/fraunces-latin-500-italic.woff"));

/** `pad` is the share of the canvas kept clear around the mark (maskable icons need ~10%+). */
async function icon(size: number, { rounded, pad, mono = false }: { rounded: boolean; pad: number; mono?: boolean }) {
  const inner = size * (1 - pad * 2);
  const tree = {
    type: "div",
    props: {
      style: { display: "flex", width: size, height: size, background: mono ? "transparent" : "#8E2C48", borderRadius: rounded ? size * 0.22 : 0, alignItems: "center", justifyContent: "center", position: "relative" },
      children: [
        { type: "div", props: { style: { display: "flex", fontFamily: "Fraunces", fontStyle: "italic", fontSize: inner * 0.72, color: mono ? "#FFFFFF" : "#FBF7F3", marginTop: -inner * 0.08 }, children: "a" } },
        { type: "div", props: { style: { position: "absolute", width: inner * 0.13, height: inner * 0.13, borderRadius: 999, background: mono ? "#FFFFFF" : "#E9C77B", left: size / 2 + inner * 0.22, top: size / 2 - inner * 0.3 } } },
      ],
    },
  };
  const svg = await satori(tree as never, { width: size, height: size, fonts: [{ name: "Fraunces", data: font, weight: 500, style: "italic" }] });
  return new Resvg(svg).render().asPng();
}

await mkdir("public/icons", { recursive: true });
const out: [string, number, { rounded: boolean; pad: number; mono?: boolean }][] = [
  ["icon-192.png", 192, { rounded: true, pad: 0 }],
  ["icon-512.png", 512, { rounded: true, pad: 0 }],
  ["maskable-512.png", 512, { rounded: false, pad: 0.14 }],
  ["apple-touch-icon.png", 180, { rounded: false, pad: 0.06 }],
  // Android shows the notification badge as a white silhouette.
  ["badge-96.png", 96, { rounded: false, pad: 0, mono: true }],
];
for (const [name, size, opts] of out) await writeFile(`public/icons/${name}`, await icon(size, opts));
console.log(`Wrote ${out.length} icons to public/icons`);
