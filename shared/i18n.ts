import { hi } from "./hi";

// English/Hindi text lookup shared by the site and the server (page titles,
// descriptions and the crawlable page snapshot). English text is the key;
// missing Hindi falls back to English. {name} placeholders come from `vars`.

export type Lang = "en" | "hi";

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>) {
  const out = lang === "hi" ? (hi[text] ?? text) : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Hindi pages live under /hi (e.g. /hi/deals); English at the root. */
export const HI_PREFIX = "/hi";

export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  if (pathname === HI_PREFIX || pathname.startsWith(`${HI_PREFIX}/`)) {
    return { lang: "hi", path: pathname.slice(HI_PREFIX.length) || "/" };
  }
  return { lang: "en", path: pathname };
}

export const langPath = (lang: Lang, path: string) => (lang === "hi" ? (path === "/" ? HI_PREFIX : `${HI_PREFIX}${path}`) : path);
