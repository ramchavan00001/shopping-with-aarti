import type { Catalog } from "./data/types";
import { mainStores } from "../shared/stores";
import {
  colours,
  occasions,
  type Colour,
  type DealsPayload,
  type Facet,
  type HomePayload,
  type LookPayload,
  type Occasion,
  type Product,
  type ProductSort,
  type ProductsPayload,
  type PublicProduct,
  type PublicReel,
  type Reel,
  type SaleStatus,
  type SavedPayload,
  type SearchPayload,
  type StoreId,
} from "../shared/types";

// Data access for the API. Backed by the in-repo catalogue for now; swap these
// functions for database queries (Postgres/D1) without touching the routes.

export interface RepoOptions {
  mediaBaseUrl?: string;
}

export interface ReelQuery {
  category?: string;
  store?: StoreId;
  q?: string;
  codes?: string[];
  maxPrice?: number;
  limit?: number;
}

export interface ProductQuery {
  category?: string;
  store?: StoreId;
  maxPrice?: number;
  occasion?: Occasion;
  colour?: Colour;
  sort?: ProductSort;
}

/** Absolute URLs and site paths ("/images/…") pass through; bare paths resolve against MEDIA_BASE_URL (R2). */
export function media(path: string, base?: string) {
  if (/^https?:\/\//.test(path) || path.startsWith("/") || !base) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// Amazon Associates rules forbid showing manually copied prices.
const canShowPrice = (store: StoreId) => store !== "amazon";

/* ---------------------------------------------------------------- Search -- */

// Spellings followers actually type. A search term matches if any word in
// its group appears, so "kurta" also finds "kurti" and "kurtis".
const synonymGroups = [
  ["kurti", "kurta", "kurtis", "kurtas", "anarkali"],
  ["saree", "sari", "sarees", "saris"],
  ["lehenga", "lehnga", "lehengas"],
  ["earrings", "earring", "jhumka", "jhumkas"],
  ["co-ord", "coord", "co ord", "cord set"],
  ["heels", "heel", "stiletto", "stilettos"],
  ["bag", "bags", "purse", "handbag", "clutch", "sling"],
  ["shoes", "sneakers", "sandals", "footwear"],
  ["dress", "dresses", "gown"],
  ["makeup", "lipstick", "mascara", "blush", "powder", "beauty"],
  ["necklace", "chain", "pendant", "jewellery", "jewelry"],
];
const synonymIndex = new Map<string, string[]>();
for (const group of synonymGroups) for (const word of group) synonymIndex.set(word, group);

/** Each search term becomes a list of acceptable spellings. */
function tokens(q: string): string[][] {
  return q
    .toLowerCase()
    .replace(/[#₹,]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => synonymIndex.get(t) ?? [t]);
}

/** "under 500" / "below ₹999" becomes a price cap instead of search words. */
function parsePriceCap(q: string): { rest: string; maxPrice?: number } {
  const m = q.match(/\b(?:under|below|within|less than)\s*₹?\s*(\d{2,6})\b/i);
  if (!m) return { rest: q };
  return { rest: q.replace(m[0], " ").trim(), maxPrice: Number(m[1]) };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function scoreText(fields: { text: string; weight: number }[], terms: string[][]) {
  let total = 0;
  for (const variants of terms) {
    let best = 0;
    for (const f of fields) {
      const text = f.text.toLowerCase();
      for (const term of variants) {
        // Match at the start of a word, so "red" doesn't hit "tiered" but a
        // half-typed "kur" still finds "kurta".
        const at = new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)?`).exec(text);
        if (!at) continue;
        const wholeWord = at[2] !== undefined;
        // Whole words and the exact spelling typed rank above prefixes and synonyms.
        best = Math.max(best, f.weight * (wholeWord ? 1.5 : 1) * (term === variants[0] ? 1 : 0.9));
      }
    }
    if (best === 0) return 0; // every term must match somewhere
    total += best;
  }
  return total;
}

/** Build the query functions over one catalogue snapshot (from the database or the demo data). */
export function createRepo(cat: Catalog) {
  const categories = [...cat.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  // Hidden reels, and products on them, never reach public pages.
  // Shown views = the Instagram views typed in the admin + plays on this website.
  const reels = cat.reels
    .filter((r) => r.isPublished !== false)
    .map((r) => ({ ...r, views: (r.views ?? 0) + (cat.reelPlays.get(r.code) ?? 0) }));
  const visibleCodes = new Set(reels.map((r) => r.code));
  const products = cat.products.filter((p) => visibleCodes.has(p.reelCode));
  const { saleEvents, lootDeals } = cat;

  function toPublicProduct(p: Product, opts: RepoOptions): PublicProduct {
    const { affiliateUrl: _hidden, ...rest } = p;
    return {
      ...rest,
      image: media(p.image, opts.mediaBaseUrl),
      href: `/go/${p.id}`,
      showPrice: canShowPrice(p.store) && p.approxPrice != null,
    };
  }

  function toPublicReel(r: Reel, opts: RepoOptions): PublicReel {
    return {
      ...r,
      video: media(r.video, opts.mediaBaseUrl),
      poster: media(r.poster, opts.mediaBaseUrl),
      products: products.filter((p) => p.reelCode === r.code && p.isActive).map((p) => toPublicProduct(p, opts)),
    };
  }

  const byNewest = (a: Reel, b: Reel) => b.publishedAt.localeCompare(a.publishedAt);
  const reelViews = new Map(reels.map((r) => [r.code, r.views]));
    const clickCount = (p: { id: string }) => cat.productClicks.get(p.id) ?? 0;
  const reelDate = new Map(reels.map((r) => [r.code, r.publishedAt]));
  const inCategory = (r: PublicReel, slug: string) => r.category === slug || r.products.some((p) => p.category === slug);

  function listReels(query: ReelQuery, opts: RepoOptions): PublicReel[] {
    let result = [...reels].sort(byNewest).map((r) => toPublicReel(r, opts));

    if (query.codes?.length) {
      const wanted = new Set(query.codes.map((c) => c.toUpperCase()));
      result = result.filter((r) => wanted.has(r.code));
    }
    if (query.category) result = result.filter((r) => inCategory(r, query.category!));
    if (query.store) result = result.filter((r) => r.products.some((p) => p.store === query.store));
    if (query.maxPrice) {
      result = result.filter((r) => r.products.some((p) => p.approxPrice != null && p.approxPrice <= query.maxPrice!));
    }
    if (query.q) result = rankReels(result, query.q);
    return query.limit ? result.slice(0, query.limit) : result;
  }

  function getReel(code: string, opts: RepoOptions): PublicReel | undefined {
    const reel = reels.find((r) => r.code === code.toUpperCase());
    return reel && toPublicReel(reel, opts);
  }

  /** A reel plus "similar looks": same category first, then shared tags or stores. */
  function getLook(code: string, opts: RepoOptions): LookPayload | undefined {
    const reel = getReel(code, opts);
    if (!reel) return undefined;
    const tags = new Set(reel.tags);
    const reelCats = new Set([reel.category, ...reel.products.map((p) => p.category)]);
    const similar = listReels({}, opts)
      .filter((r) => r.code !== reel.code)
      .map((r) => {
        let score = 0;
        if (r.category === reel.category) score += 5;
        score += r.tags.filter((t) => tags.has(t)).length * 2;
        score += r.products.filter((p) => reelCats.has(p.category)).length;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score || (reelViews.get(b.r.code) ?? 0) - (reelViews.get(a.r.code) ?? 0))
      .slice(0, 6)
      .map((x) => x.r);
    return { reel, similar, category: categories.find((c) => c.slug === reel.category) };
  }

  function countBy<T extends string>(items: PublicProduct[], key: (p: PublicProduct) => T[] | T | undefined, order: readonly T[]): Facet<T>[] {
    const counts = new Map<T, number>();
    for (const p of items) {
      const v = key(p);
      for (const id of Array.isArray(v) ? v : v ? [v] : []) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return order.filter((id) => counts.has(id)).map((id) => ({ id, count: counts.get(id)! }));
  }

  function listProducts(query: ProductQuery, opts: RepoOptions): ProductsPayload {
    const base = products
      .filter((p) => p.isActive && (!query.category || p.category === query.category))
      .map((p) => toPublicProduct(p, opts));

    // Facet counts come from the whole category so options don't vanish as you filter.
    const facets = {
      stores: countBy(base, (p) => p.store, [...mainStores, "ajio", "other"] as StoreId[]),
      occasions: countBy(base, (p) => p.occasions, occasions),
      colours: countBy(base, (p) => p.colour, Object.keys(colours) as Colour[]),
    };

    let list = base;
    if (query.store) list = list.filter((p) => p.store === query.store);
    if (query.maxPrice) list = list.filter((p) => p.approxPrice != null && p.approxPrice <= query.maxPrice!);
    if (query.occasion) list = list.filter((p) => p.occasions?.includes(query.occasion!));
    if (query.colour) list = list.filter((p) => p.colour === query.colour);

    const price = (p: PublicProduct) => p.approxPrice ?? Number.POSITIVE_INFINITY;
    const sorters: Record<ProductSort, (a: PublicProduct, b: PublicProduct) => number> = {
      popular: (a, b) => clickCount(b) - clickCount(a) || (reelViews.get(b.reelCode) ?? 0) - (reelViews.get(a.reelCode) ?? 0),
      newest: (a, b) => (reelDate.get(b.reelCode) ?? "").localeCompare(reelDate.get(a.reelCode) ?? ""),
      "price-asc": (a, b) => price(a) - price(b),
      "price-desc": (a, b) => (b.approxPrice ?? 0) - (a.approxPrice ?? 0),
    };
    list = [...list].sort(sorters[query.sort ?? "popular"]);

    const category = categories.find((c) => c.slug === query.category);
    return {
      products: list,
      total: list.length,
      facets,
      ...(category && {
        category: { ...category, image: media(category.image, opts.mediaBaseUrl) },
        reels: listReels({ category: category.slug, limit: 8 }, opts),
      }),
    };
  }

  function rankReels(list: PublicReel[], q: string) {
    const { rest, maxPrice } = parsePriceCap(q);
    if (maxPrice) list = list.filter((r) => r.products.some((p) => p.approxPrice != null && p.approxPrice <= maxPrice));
    const terms = tokens(rest);
    if (!terms.length) return list;
    return list
      .map((r) => {
        const exactCode = terms.length === 1 && terms[0][0] === r.code.toLowerCase();
        const score = exactCode
          ? 1000
          : scoreText(
              [
                { text: r.code, weight: 20 },
                { text: r.title, weight: 10 },
                { text: r.tags.join(" "), weight: 6 },
                { text: r.products.map((p) => p.title).join(" "), weight: 5 },
                { text: r.category, weight: 4 },
                { text: r.caption, weight: 2 },
              ],
              terms,
            );
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);
  }

  function search(q: string, opts: RepoOptions, limit = 8): SearchPayload {
    const { rest, maxPrice } = parsePriceCap(q);
    const terms = tokens(rest);
    if (!terms.length && !maxPrice) return { query: q, reels: [], products: [], categories: [] };

    const matchedReels = rankReels(listReels({}, opts), q).slice(0, limit);
    const matchedProducts = products
      .filter((p) => p.isActive && (!maxPrice || (p.approxPrice != null && p.approxPrice <= maxPrice)))
      .map((p) => ({
        p,
        score: scoreText(
          [
            { text: p.title, weight: 10 },
            { text: p.reelCode, weight: 8 },
            { text: `${p.category} ${p.colour ?? ""} ${(p.occasions ?? []).join(" ")}`, weight: 5 },
            { text: p.store, weight: 4 },
            { text: p.note ?? "", weight: 2 },
          ],
          terms,
        ) || (terms.length ? 0 : 1),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2)
      .map((x) => toPublicProduct(x.p, opts));
    const matchedCategories = terms.length
      ? categories.filter((c) => scoreText([{ text: `${c.name} ${c.slug} ${c.blurb}`, weight: 1 }], terms) > 0)
      : [];

    return { query: q, reels: matchedReels, products: matchedProducts, categories: matchedCategories };
  }

  /* ----------------------------------------------------------------- Deals -- */

  function getDeals(opts: RepoOptions, now = new Date()): DealsPayload {
    const t = now.getTime();
    const status = (start: string, end: string): SaleStatus =>
      t < Date.parse(start) ? "upcoming" : t > Date.parse(end) ? "ended" : "live";
    const rank: Record<SaleStatus, number> = { live: 0, upcoming: 1, ended: 2 };

    const events = saleEvents
      .map(({ affiliateUrl: _hidden, ...e }) => ({ ...e, href: `/go/${e.id}`, status: status(e.startsAt, e.endsAt) }))
      .sort((a, b) => rank[a.status] - rank[b.status] || (a.status === "live" ? a.endsAt.localeCompare(b.endsAt) : a.startsAt.localeCompare(b.startsAt)));

    const loot = lootDeals
      .filter((d) => Date.parse(d.expiresAt) > t)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
      .map(({ affiliateUrl: _hidden, ...d }) => ({
        ...d,
        image: media(d.image, opts.mediaBaseUrl),
        href: `/go/${d.id}`,
        showPrice: canShowPrice(d.store),
      }));

    return { events, loot, now: now.toISOString() };
  }

  /* ------------------------------------------------------------------ Home -- */

  function getHome(opts: RepoOptions): HomePayload {
    const all = listReels({}, opts);
    // Most-clicked products in the last 30 days; reel views break ties and
    // fill in before any clicks exist. At most two products per reel.
    const perReel = new Map<string, number>();
    const trending = all
      .flatMap((r) => r.products)
      .sort((a, b) => clickCount(b) - clickCount(a) || (reelViews.get(b.reelCode) ?? 0) - (reelViews.get(a.reelCode) ?? 0))
      .filter((p) => {
        const n = perReel.get(p.reelCode) ?? 0;
        perReel.set(p.reelCode, n + 1);
        return n < (cat.productClicks.size ? 2 : 1);
      })
      .slice(0, 8);

    return {
      featured: all.find((r) => r.isFeatured) ?? all[0],
      latest: all.slice(0, 10),
      trending,
      categories: categories.map((c) => ({
        ...c,
        image: media(c.image, opts.mediaBaseUrl),
        count: products.filter((p) => p.isActive && p.category === c.slug).length,
      })),
      stores: mainStores.map((id) => ({ id, count: products.filter((p) => p.store === id && p.isActive).length })),
    };
  }

  /* ----------------------------------------------------------- Outbound -- */

  /** Resolve a tracked link id (product, sale event or loot deal) to its affiliate URL. */
  function getOutbound(id: string): { url: string; kind: "product" | "event" | "deal"; store: StoreId; reel?: string } | undefined {
    const product = products.find((p) => p.id === id && p.isActive);
    if (product) return { url: product.affiliateUrl, kind: "product", store: product.store, reel: product.reelCode };
    const event = saleEvents.find((e) => e.id === id);
    if (event) return { url: event.affiliateUrl, kind: "event", store: event.store };
    const loot = lootDeals.find((d) => d.id === id);
    if (loot) return { url: loot.affiliateUrl, kind: "deal", store: loot.store };
    return undefined;
  }

  const allReels = () => reels;
  const allCategories = () => categories;

  /** Saved looks and products, in the order they were saved; missing ones are skipped. */
  function getSaved(codes: string[], ids: string[], opts: RepoOptions): SavedPayload {
    const reelByCode = new Map(reels.map((r) => [r.code, r]));
    const productById = new Map(products.filter((p) => p.isActive).map((p) => [p.id, p]));
    return {
      reels: codes.flatMap((c) => {
        const r = reelByCode.get(c.toUpperCase());
        return r ? [toPublicReel(r, opts)] : [];
      }),
      products: ids.flatMap((id) => {
        const p = productById.get(id);
        const r = p && reelByCode.get(p.reelCode);
        return p && r ? [{ ...toPublicProduct(p, opts), reelSlug: r.slug, reelTitle: r.title }] : [];
      }),
    };
  }

  return { listReels, getReel, getLook, listProducts, search, getDeals, getHome, getOutbound, getSaved, allReels, allCategories };
}

export type Repo = ReturnType<typeof createRepo>;
