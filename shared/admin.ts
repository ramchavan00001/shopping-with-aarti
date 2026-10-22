import { z } from "zod";
import { colours, occasions, type Category, type LootDeal, type Product, type Reel, type SaleEvent } from "./types";

// Admin payloads, validated identically by the API and the admin forms.

const storeIds = ["amazon", "flipkart", "meesho", "myntra", "ajio", "other"] as const;
const colourIds = Object.keys(colours) as [keyof typeof colours, ...(keyof typeof colours)[]];

/** Absolute URL, or a path relative to MEDIA_BASE_URL like "reels/a113.mp4". */
const mediaRef = z
  .string()
  .trim()
  .min(1, "Required")
  .max(1000)
  .refine((v) => /^https?:\/\//.test(v) || /^[\w./-]+$/.test(v), "Use a full https:// URL, an uploaded file path, or a site path like /images/…");
const httpUrl = z.string().trim().url("Enter a full link starting with https://").max(2000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const optionalPrice = z
  .number()
  .int()
  .positive()
  .max(10_000_000)
  .nullish()
  .transform((v) => v ?? null);

export const productInput = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(2, "Add a product name").max(200),
  store: z.enum(storeIds),
  affiliateUrl: httpUrl,
  image: mediaRef,
  approxPrice: optionalPrice,
  mrp: optionalPrice,
  category: z.string().trim().min(1, "Pick a category"),
  note: optionalText(300),
  sizeTip: optionalText(120),
  colour: z.enum(colourIds).nullish().transform((v) => v ?? null),
  occasions: z.array(z.enum(occasions)).max(occasions.length).default([]),
  isActive: z.boolean().default(true),
});

export const reelInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]\d{2,4}$/, "Use a letter and 2–4 digits, like A113"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by dashes")
    .max(120),
  title: z.string().trim().min(3, "Add a title").max(160),
  caption: z.string().trim().max(1000).default(""),
  video: mediaRef,
  poster: mediaRef,
  instagramUrl: httpUrl.nullish().or(z.literal("")).transform((v) => v || null),
  category: z.string().trim().min(1, "Pick a category"),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).default([]),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  views: z.number().int().min(0).default(0),
  products: z.array(productInput).max(30).default([]),
});

export const categoryInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase words separated by dashes")
    .max(60),
  name: z.string().trim().min(2).max(60),
  image: mediaRef,
  blurb: z.string().trim().max(120).default(""),
  sortOrder: z.number().int().default(0),
});

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time");

export const saleEventInput = z
  .object({
    id: z.string().max(40).optional(),
    name: z.string().trim().min(2).max(80),
    store: z.enum(storeIds),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    headline: z.string().trim().max(120).default(""),
    highlights: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
    affiliateUrl: httpUrl,
  })
  .refine((e) => Date.parse(e.endsAt) > Date.parse(e.startsAt), { message: "End must be after start", path: ["endsAt"] });

export const lootDealInput = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(2).max(160),
  store: z.enum(storeIds),
  image: mediaRef,
  dealPrice: z.number().int().positive(),
  mrp: z.number().int().positive(),
  coupon: optionalText(40),
  category: z.string().trim().min(1),
  note: optionalText(200),
  expiresAt: isoDateTime,
  affiliateUrl: httpUrl,
});

export const enquiryStatuses = ["new", "replied", "archived"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export type ReelInput = z.input<typeof reelInput>;
export type ProductInput = z.input<typeof productInput>;
export type CategoryInput = z.input<typeof categoryInput>;
export type SaleEventInput = z.input<typeof saleEventInput>;
export type LootDealInput = z.input<typeof lootDealInput>;

/** In the admin, `views` is the Instagram figure as typed; `sitePlays` is counted on the website. */
export type AdminReel = Reel & { products: Product[]; sitePlays?: number };
export type AdminEvent = SaleEvent;
export type AdminDeal = LootDeal;
export type AdminCategory = Category & { reelCount: number; productCount: number };

export interface AdminEnquiry {
  id: number;
  name: string;
  brand: string;
  email: string;
  phone: string | null;
  type: string;
  budget: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface AdminStats {
  days: number;
  totals: {
    /** Unique visitors per day, summed over the period. */
    visitors: number;
    visits: number;
    reelPlays: number;
    lookViews: number;
    clicks: number;
    clicksToday: number;
    reels: number;
    products: number;
    newEnquiries: number;
  };
  daily: { day: string; visitors: number; reelPlays: number; clicks: number }[];
  sources: { source: string; visits: number; clicks: number }[];
  byStore: { store: string; clicks: number }[];
  topProducts: { id: string; title: string; store: string; reelCode: string; image: string; clicks: number }[];
  reelPerformance: { code: string; title: string; poster: string; plays: number; lookViews: number; clicks: number }[];
  recentEnquiries: AdminEnquiry[];
}

export interface AdminConfig {
  uploadsEnabled: boolean;
  mediaBaseUrl: string | null;
  nextReelCode: string;
}

/** Field errors from a zod failure, keyed by dotted path ("products.0.title"). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");
}
