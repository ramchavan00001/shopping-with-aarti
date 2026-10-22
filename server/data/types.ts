import type { Category, LootDeal, Product, Reel, SaleEvent, StoreId } from "../../shared/types";
import type { Enquiry } from "../../shared/enquiry";
import type { AdminStore } from "./admin";

/** Everything the public site reads, loaded as one snapshot. */
export interface Catalog {
  categories: Category[];
  reels: Reel[];
  products: Product[];
  saleEvents: SaleEvent[];
  lootDeals: LootDeal[];
  /** Product id → clicks in the last 30 days. */
  productClicks: Map<string, number>;
}

export interface ClickEvent {
  targetId: string;
  kind: "product" | "event" | "deal";
  reelCode?: string;
  store: StoreId;
  referrer?: string;
  userAgent?: string;
}

export interface DataSource {
  readonly kind: "database" | "demo";
  catalog(): Promise<Catalog>;
  recordClick(click: ClickEvent): Promise<void>;
  saveEnquiry(enquiry: Omit<Enquiry, "website">): Promise<void>;
  /** Only the database source can be edited from the admin panel. */
  admin?: AdminStore;
}
