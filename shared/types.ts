export type StoreId = "amazon" | "flipkart" | "meesho" | "myntra" | "ajio" | "other";

export const occasions = ["casual", "party", "festive", "wedding", "office", "college", "vacation"] as const;
export type Occasion = (typeof occasions)[number];

export const colours = {
  white: "#F7F4EE",
  black: "#1C1A1A",
  red: "#C8283C",
  pink: "#EE8FB0",
  yellow: "#E9B53A",
  blue: "#3466C2",
  green: "#3E8E5E",
  purple: "#7B3F9E",
  beige: "#D9C2A0",
  brown: "#8A5A3B",
  gold: "#C9A24A",
  multi: "conic-gradient(#C8283C, #E9B53A, #3E8E5E, #3466C2, #7B3F9E, #C8283C)",
} as const;
export type Colour = keyof typeof colours;

export interface Category {
  slug: string;
  name: string;
  image: string;
  blurb: string;
  sortOrder?: number;
}

export interface Product {
  id: string;
  reelCode: string;
  title: string;
  store: StoreId;
  /** Affiliate link. Never sent to the browser; buttons go through /go/:id. */
  affiliateUrl: string;
  image: string;
  /** Approximate price in ₹ at the time the reel was made. */
  approxPrice?: number;
  mrp?: number;
  category: string;
  /** Aarti's own one-liner about the product. */
  note?: string;
  sizeTip?: string;
  colour?: Colour;
  occasions?: Occasion[];
  isActive: boolean;
}

/** What the browser receives: the affiliate URL is replaced by the tracked link. */
export type PublicProduct = Omit<Product, "affiliateUrl"> & {
  href: string;
  /** False for stores whose rules forbid showing copied prices (Amazon). */
  showPrice: boolean;
};

export interface Reel {
  code: string;
  slug: string;
  title: string;
  caption: string;
  video: string;
  poster: string;
  instagramUrl?: string;
  category: string;
  tags: string[];
  publishedAt: string;
  isFeatured?: boolean;
  /** Hidden reels stay in the admin panel but not on the site. */
  isPublished?: boolean;
  /** Seed popularity until click tracking is wired to a database. */
  views: number;
}

export type PublicReel = Reel & { products: PublicProduct[] };

export type ProductSort = "popular" | "newest" | "price-asc" | "price-desc";

export interface Facet<T extends string = string> {
  id: T;
  count: number;
}

export interface ProductsPayload {
  products: PublicProduct[];
  total: number;
  facets: { stores: Facet<StoreId>[]; occasions: Facet<Occasion>[]; colours: Facet<Colour>[] };
  category?: Category;
  reels?: PublicReel[];
}

export interface LookPayload {
  reel: PublicReel;
  category?: Category;
  similar: PublicReel[];
}

export interface SearchPayload {
  query: string;
  reels: PublicReel[];
  products: PublicProduct[];
  categories: Category[];
}

/** A store-wide sale like Big Billion Days. */
export interface SaleEvent {
  id: string;
  name: string;
  store: StoreId;
  startsAt: string;
  endsAt: string;
  headline: string;
  highlights: string[];
  affiliateUrl: string;
}

/** A short-lived price drop on a single product. */
export interface LootDeal {
  id: string;
  title: string;
  store: StoreId;
  image: string;
  dealPrice: number;
  mrp: number;
  coupon?: string;
  category: string;
  note?: string;
  expiresAt: string;
  affiliateUrl: string;
}

export type SaleStatus = "live" | "upcoming" | "ended";
export type PublicSaleEvent = Omit<SaleEvent, "affiliateUrl"> & { href: string; status: SaleStatus };
export type PublicLootDeal = Omit<LootDeal, "affiliateUrl"> & { href: string; showPrice: boolean };

export interface DealsPayload {
  events: PublicSaleEvent[];
  loot: PublicLootDeal[];
  now: string;
}

export interface HomePayload {
  featured: PublicReel;
  latest: PublicReel[];
  trending: PublicProduct[];
  categories: (Category & { count: number })[];
  stores: { id: StoreId; count: number }[];
}
