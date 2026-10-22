import type { Category, LootDeal, Product, Reel, SaleEvent, StoreId } from "../../shared/types";
import type { Enquiry } from "../../shared/enquiry";
import type { AdminStore } from "./admin";
import type { EventKind, TrafficSource } from "../../shared/analytics";

/** Everything the public site reads, loaded as one snapshot. */
export interface Catalog {
  categories: Category[];
  reels: Reel[];
  products: Product[];
  saleEvents: SaleEvent[];
  lootDeals: LootDeal[];
  /** Product id → clicks in the last 30 days. */
  productClicks: Map<string, number>;
  /** Reel code → all-time plays on the website. */
  reelPlays: Map<string, number>;
}

export interface ClickEvent {
  targetId: string;
  kind: "product" | "event" | "deal";
  reelCode?: string;
  store: StoreId;
  referrer?: string;
  userAgent?: string;
  source: TrafficSource;
  visitor?: string;
}

export interface SiteEvent {
  kind: EventKind;
  reelCode?: string;
  path?: string;
  source: TrafficSource;
  visitor?: string;
}

export interface DataSource {
  readonly kind: "database" | "demo";
  catalog(): Promise<Catalog>;
  recordClick(click: ClickEvent): Promise<void>;
  recordEvent(event: SiteEvent): Promise<void>;
  saveEnquiry(enquiry: Omit<Enquiry, "website">): Promise<void>;
  /** Only the database source can be edited from the admin panel. */
  admin?: AdminStore;
}
