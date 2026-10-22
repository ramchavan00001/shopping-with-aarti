import { sql } from "drizzle-orm";
import { bigserial, boolean, date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  blurb: text("blurb").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reels = pgTable(
  "reels",
  {
    code: text("code").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    caption: text("caption").notNull().default(""),
    video: text("video").notNull(),
    poster: text("poster").notNull(),
    instagramUrl: text("instagram_url"),
    category: text("category")
      .notNull()
      .references(() => categories.slug, { onUpdate: "cascade" }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    publishedAt: date("published_at", { mode: "string" }).notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reels_published_at_idx").on(t.publishedAt)],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    reelCode: text("reel_code")
      .notNull()
      .references(() => reels.code, { onDelete: "cascade", onUpdate: "cascade" }),
    title: text("title").notNull(),
    store: text("store").notNull(),
    affiliateUrl: text("affiliate_url").notNull(),
    image: text("image").notNull(),
    approxPrice: integer("approx_price"),
    mrp: integer("mrp"),
    category: text("category").notNull(),
    note: text("note"),
    sizeTip: text("size_tip"),
    colour: text("colour"),
    occasions: text("occasions").array().notNull().default(sql`'{}'::text[]`),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_reel_code_idx").on(t.reelCode)],
);

export const saleEvents = pgTable("sale_events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  store: text("store").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }).notNull(),
  headline: text("headline").notNull().default(""),
  highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
  affiliateUrl: text("affiliate_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lootDeals = pgTable("loot_deals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  store: text("store").notNull(),
  image: text("image").notNull(),
  dealPrice: integer("deal_price").notNull(),
  mrp: integer("mrp").notNull(),
  coupon: text("coupon"),
  category: text("category").notNull(),
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per outbound click through /go/:id. */
export const clicks = pgTable(
  "clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    targetId: text("target_id").notNull(),
    kind: text("kind").notNull(),
    reelCode: text("reel_code"),
    store: text("store").notNull(),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_created_at_idx").on(t.createdAt), index("clicks_target_id_idx").on(t.targetId)],
);

export const enquiries = pgTable(
  "enquiries",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    type: text("type").notNull(),
    budget: text("budget").notNull(),
    message: text("message").notNull(),
    /** new | replied | archived */
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("enquiries_created_at_idx").on(t.createdAt)],
);
