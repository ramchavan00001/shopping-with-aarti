import { categories, products, reels } from "../shared/catalog";
import type { HomePayload, Product, PublicProduct, PublicReel, Reel, StoreId } from "../shared/types";
import { mainStores } from "../shared/stores";

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

function media(path: string, base?: string) {
  if (/^https?:\/\//.test(path) || !base) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function toPublicProduct(p: Product, opts: RepoOptions): PublicProduct {
  const { affiliateUrl: _hidden, ...rest } = p;
  return {
    ...rest,
    image: media(p.image, opts.mediaBaseUrl),
    href: `/go/${p.id}`,
    // Amazon Associates rules forbid showing manually copied prices.
    showPrice: p.store !== "amazon" && p.approxPrice != null,
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

export function listReels(query: ReelQuery, opts: RepoOptions): PublicReel[] {
  const q = query.q?.trim().toLowerCase().replace(/^#/, "");
  let result = [...reels].sort(byNewest).map((r) => toPublicReel(r, opts));

  if (query.codes?.length) {
    const wanted = new Set(query.codes.map((c) => c.toUpperCase()));
    result = result.filter((r) => wanted.has(r.code));
  }
  if (query.category) {
    result = result.filter(
      (r) => r.category === query.category || r.products.some((p) => p.category === query.category),
    );
  }
  if (query.store) result = result.filter((r) => r.products.some((p) => p.store === query.store));
  if (query.maxPrice) {
    result = result.filter((r) => r.products.some((p) => p.approxPrice != null && p.approxPrice <= query.maxPrice!));
  }
  if (q) {
    result = result.filter((r) => {
      const haystack = [r.code, r.title, r.caption, ...r.tags, ...r.products.map((p) => p.title)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  return query.limit ? result.slice(0, query.limit) : result;
}

export function getReel(code: string, opts: RepoOptions): PublicReel | undefined {
  const reel = reels.find((r) => r.code === code.toUpperCase());
  return reel && toPublicReel(reel, opts);
}

export function getHome(opts: RepoOptions): HomePayload {
  const all = listReels({}, opts);
  const views = new Map(reels.map((r) => [r.code, r.views]));
  const trending = [...all]
    .sort((a, b) => (views.get(b.code) ?? 0) - (views.get(a.code) ?? 0))
    .flatMap((r) => r.products.slice(0, 1))
    .slice(0, 8);

  return {
    featured: all.find((r) => r.isFeatured) ?? all[0],
    latest: all.slice(0, 10),
    trending,
    categories: categories.map((c) => ({
      ...c,
      image: media(c.image, opts.mediaBaseUrl),
      count: all.filter((r) => r.category === c.slug || r.products.some((p) => p.category === c.slug)).length,
    })),
    stores: mainStores.map((id) => ({ id, count: products.filter((p) => p.store === id && p.isActive).length })),
  };
}

export function getAffiliateUrl(productId: string): { url: string; product: Product } | undefined {
  const product = products.find((p) => p.id === productId && p.isActive);
  return product && { url: product.affiliateUrl, product };
}
