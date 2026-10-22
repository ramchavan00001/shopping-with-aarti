import type { Reel } from "./types";

/** Canonical look page URL, e.g. /look/a112-white-summer-dress-under-999 */
export const lookPath = (reel: Pick<Reel, "code" | "slug">) => `/look/${reel.code.toLowerCase()}-${reel.slug}`;

/** Pull the reel code out of a look slug ("a112-white-..." or just "a112"). */
export const codeFromLookSlug = (slug: string) => slug.split("-")[0].toUpperCase();

export const categoryPath = (slug: string) => `/category/${slug}`;
