import { categories, lootDeals, products, reels, saleEvents } from "../../shared/catalog";
import type { Catalog, DataSource } from "./types";

/**
 * Read-only source backed by the demo catalogue in shared/catalog.ts. Used
 * when no DATABASE_URL is set (local dev, Cloudflare preview). Clicks and
 * enquiries are only logged.
 */
export function createDemoSource(): DataSource {
  const snapshot: Catalog = {
    categories: categories.map((c, i) => ({ ...c, sortOrder: i })),
    reels,
    products,
    saleEvents,
    lootDeals,
    productClicks: new Map(),
    reelPlays: new Map(),
    settings: null,
  };
  return {
    kind: "demo",
    catalog: async () => snapshot,
    recordClick: async (click) => console.log(JSON.stringify({ event: "affiliate_click", ...click })),
    recordEvent: async () => {},
    saveEnquiry: async (enquiry) => console.log(JSON.stringify({ event: "brand_enquiry", ...enquiry })),
  };
}
