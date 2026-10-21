export type StoreId = "amazon" | "flipkart" | "meesho" | "myntra" | "ajio" | "other";

export interface Category {
  slug: string;
  name: string;
  image: string;
  blurb: string;
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
  /** Seed popularity until click tracking is wired to a database. */
  views: number;
}

export type PublicReel = Reel & { products: PublicProduct[] };

export interface HomePayload {
  featured: PublicReel;
  latest: PublicReel[];
  trending: PublicProduct[];
  categories: (Category & { count: number })[];
  stores: { id: StoreId; count: number }[];
}
