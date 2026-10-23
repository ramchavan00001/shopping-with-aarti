import { sql } from "drizzle-orm";
import { bigserial, boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
    /** Instagram media id when imported by Instagram auto-sync. */
    instagramMediaId: text("instagram_media_id"),
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
    /** Where the visitor came from: instagram, whatsapp, google, direct… */
    source: text("source").notNull().default("direct"),
    /** Anonymous per-day visitor hash (see server/analytics.ts). */
    visitor: text("visitor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clicks_created_at_idx").on(t.createdAt), index("clicks_target_id_idx").on(t.targetId)],
);

/** Site activity: visits (session starts), reel plays and look-page views. */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** visit | reel_play | look_view | app_install */
    kind: text("kind").notNull(),
    reelCode: text("reel_code"),
    path: text("path"),
    source: text("source").notNull().default("direct"),
    visitor: text("visitor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_created_at_idx").on(t.createdAt), index("events_kind_created_at_idx").on(t.kind, t.createdAt)],
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

/** Key/value site settings edited in the admin (key "site" holds SiteSettings overrides). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Latest result of the broken-link checker, one row per checked link. */
export const linkChecks = pgTable("link_checks", {
  /** product, sale event or loot deal id */
  targetId: text("target_id").primaryKey(),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  /** ok | broken | blocked | error */
  status: text("status").notNull(),
  httpStatus: integer("http_status"),
  finalUrl: text("final_url"),
  detail: text("detail"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

/** People who asked for deal alerts on WhatsApp. */
export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Digits only, with country code (e.g. 919876543210). */
    phone: text("phone").notNull().unique(),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    source: text("source").notNull().default("direct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscribers_created_at_idx").on(t.createdAt)],
);

/** Server and browser errors, grouped by fingerprint. */
export const errorLog = pgTable(
  "error_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** server | client | job */
    origin: text("origin").notNull(),
    fingerprint: text("fingerprint").notNull(),
    message: text("message").notNull(),
    detail: text("detail"),
    path: text("path"),
    count: integer("count").notNull().default(1),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("error_log_fingerprint_idx").on(t.fingerprint), index("error_log_last_seen_idx").on(t.lastSeen)],
);

/** Background job bookkeeping (link checks, Instagram sync). */
export const jobRuns = pgTable("job_runs", {
  name: text("name").primaryKey(),
  lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  lastFinishedAt: timestamp("last_finished_at", { withTimezone: true }),
  /** ok | failed | running */
  lastStatus: text("last_status"),
  lastSummary: text("last_summary"),
});

/** Browsers that allowed push notifications. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  /** Site language when they subscribed: en | hi */
  lang: text("lang").notNull().default("en"),
  source: text("source").notNull().default("direct"),
  failures: integer("failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

/** Notifications sent from the admin panel. */
export const pushMessages = pgTable("push_messages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  titleHi: text("title_hi"),
  bodyHi: text("body_hi"),
  url: text("url").notNull(),
  image: text("image"),
  /** sending | sent | failed */
  status: text("status").notNull().default("sending"),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
