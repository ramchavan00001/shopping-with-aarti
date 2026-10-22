import { and, asc, desc, eq, gte, notInArray, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../db/schema";
import type { AdminEnquiry, EnquiryStatus } from "../../shared/admin";
import type { Category, Colour, LootDeal, Occasion, Product, Reel, SaleEvent, StoreId } from "../../shared/types";
import { AdminError, type AdminStore } from "./admin";
import type { Catalog, DataSource } from "./types";

export type Db = NodePgDatabase<typeof schema>;

const CACHE_MS = 30_000;
const IST = "Asia/Kolkata";

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

/**
 * Turn a connection string from any Postgres host (Render, Neon, local) into
 * pool settings. Neon strings carry `sslmode=require&channel_binding=require`:
 * node-postgres already treats `require` as full certificate verification but
 * warns about it on every connection, so we say `verify-full` explicitly; and
 * it ignores `channel_binding` unless asked, so we pass that through.
 */
export function poolConfig(url: string): pg.PoolConfig {
  const u = new URL(url);
  const sslmode = u.searchParams.get("sslmode");
  if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode) && !u.searchParams.has("uselibpqcompat")) {
    u.searchParams.set("sslmode", "verify-full");
  }
  const channelBinding = u.searchParams.get("channel_binding");
  u.searchParams.delete("channel_binding");
  return {
    connectionString: u.toString(),
    enableChannelBinding: channelBinding === "require",
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    idleTimeoutMillis: 30_000,
    // Serverless databases (Neon) may need a moment to wake from idle.
    connectionTimeoutMillis: 15_000,
  };
}

export function connect(url: string) {
  const pool = new pg.Pool(poolConfig(url));
  pool.on("error", (err) => console.error(JSON.stringify({ event: "db_pool_error", error: String(err) })));
  return { pool, db: drizzle(pool, { schema }) };
}

/* ------------------------------------------------------------ row mapping -- */

type ReelRow = typeof schema.reels.$inferSelect;
type ProductRow = typeof schema.products.$inferSelect;

const toReel = (r: ReelRow): Reel => ({
  code: r.code,
  slug: r.slug,
  title: r.title,
  caption: r.caption,
  video: r.video,
  poster: r.poster,
  instagramUrl: r.instagramUrl ?? undefined,
  category: r.category,
  tags: r.tags,
  publishedAt: r.publishedAt,
  isFeatured: r.isFeatured,
  isPublished: r.isPublished,
  views: r.views,
});

const toProduct = (p: ProductRow): Product => ({
  id: p.id,
  reelCode: p.reelCode,
  title: p.title,
  store: p.store as StoreId,
  affiliateUrl: p.affiliateUrl,
  image: p.image,
  approxPrice: p.approxPrice ?? undefined,
  mrp: p.mrp ?? undefined,
  category: p.category,
  note: p.note ?? undefined,
  sizeTip: p.sizeTip ?? undefined,
  colour: (p.colour as Colour | null) ?? undefined,
  occasions: p.occasions as Occasion[],
  isActive: p.isActive,
});

const toEvent = (e: typeof schema.saleEvents.$inferSelect): SaleEvent => ({
  id: e.id,
  name: e.name,
  store: e.store as StoreId,
  startsAt: new Date(e.startsAt).toISOString(),
  endsAt: new Date(e.endsAt).toISOString(),
  headline: e.headline,
  highlights: e.highlights,
  affiliateUrl: e.affiliateUrl,
});

const toDeal = (d: typeof schema.lootDeals.$inferSelect): LootDeal => ({
  id: d.id,
  title: d.title,
  store: d.store as StoreId,
  image: d.image,
  dealPrice: d.dealPrice,
  mrp: d.mrp,
  coupon: d.coupon ?? undefined,
  category: d.category,
  note: d.note ?? undefined,
  expiresAt: new Date(d.expiresAt).toISOString(),
  affiliateUrl: d.affiliateUrl,
});

const toEnquiry = (e: typeof schema.enquiries.$inferSelect): AdminEnquiry => ({
  ...e,
  status: e.status as EnquiryStatus,
  createdAt: e.createdAt.toISOString(),
});

/** Postgres error code for unique and foreign-key violations. */
const pgCode = (err: unknown) => (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;

/* ------------------------------------------------------------- the source -- */

export function createDbSource(db: Db): DataSource {
  let cached: { at: number; value: Promise<Catalog> } | undefined;

  async function loadCatalog(): Promise<Catalog> {
    const [cats, reelRows, productRows, events, deals, clickRows] = await Promise.all([
      db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name)),
      db.select().from(schema.reels),
      db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(asc(schema.products.sortOrder)),
      db.select().from(schema.saleEvents),
      db.select().from(schema.lootDeals),
      db
        .select({ id: schema.clicks.targetId, n: sql<number>`count(*)::int` })
        .from(schema.clicks)
        .where(and(eq(schema.clicks.kind, "product"), gte(schema.clicks.createdAt, sql`now() - interval '30 days'`)))
        .groupBy(schema.clicks.targetId),
    ]);
    return {
      categories: cats.map((c): Category => ({ slug: c.slug, name: c.name, image: c.image, blurb: c.blurb, sortOrder: c.sortOrder })),
      reels: reelRows.map(toReel),
      products: productRows.map(toProduct),
      saleEvents: events.map(toEvent),
      lootDeals: deals.map(toDeal),
      productClicks: new Map(clickRows.map((r) => [r.id, r.n])),
    };
  }

  function catalog() {
    if (!cached || Date.now() - cached.at > CACHE_MS) {
      const value = loadCatalog();
      cached = { at: Date.now(), value };
      // Don't keep a failed load around; retry on the next request.
      value.catch(() => {
        if (cached?.value === value) cached = undefined;
      });
    }
    return cached.value;
  }

  /** Run an admin write, then make the public site see it immediately. */
  async function write<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      cached = undefined;
    }
  }

  const admin: AdminStore = {
    async stats(days) {
      const since = sql`now() - make_interval(days => ${days})`;
      const [[totals], daily, sources, byStore, topProducts, reelPerformance, recent] = await Promise.all([
        db.execute<{
          visitors: number; visits: number; reel_plays: number; look_views: number; clicks: number;
          clicks_today: number; reels: number; products: number; new_enquiries: number;
        }>(sql`
          select
            (select count(distinct (visitor, (created_at at time zone ${IST})::date))::int from events where created_at >= ${since} and visitor is not null) as visitors,
            (select count(*)::int from events where kind = 'visit' and created_at >= ${since}) as visits,
            (select count(*)::int from events where kind = 'reel_play' and created_at >= ${since}) as reel_plays,
            (select count(*)::int from events where kind = 'look_view' and created_at >= ${since}) as look_views,
            (select count(*)::int from clicks where created_at >= ${since}) as clicks,
            (select count(*)::int from clicks where created_at >= date_trunc('day', now() at time zone ${IST}) at time zone ${IST}) as clicks_today,
            (select count(*)::int from reels) as reels,
            (select count(*)::int from products where is_active) as products,
            (select count(*)::int from enquiries where status = 'new') as new_enquiries
        `).then((r) => r.rows),
        db.execute<{ day: string; visitors: number; reel_plays: number; clicks: number }>(sql`
          with days as (
            select d::date as day
            from generate_series((now() at time zone ${IST})::date - (${days}::int - 1), (now() at time zone ${IST})::date, interval '1 day') d
          ),
          ev as (
            select (created_at at time zone ${IST})::date as day,
              count(distinct visitor) as visitors,
              count(*) filter (where kind = 'reel_play') as reel_plays
            from events where created_at >= ${since} group by 1
          ),
          cl as (
            select (created_at at time zone ${IST})::date as day, count(*) as clicks
            from clicks where created_at >= ${since} group by 1
          )
          select to_char(days.day, 'YYYY-MM-DD') as day,
            coalesce(ev.visitors, 0)::int as visitors,
            coalesce(ev.reel_plays, 0)::int as reel_plays,
            coalesce(cl.clicks, 0)::int as clicks
          from days left join ev using (day) left join cl using (day)
          order by days.day
        `).then((r) => r.rows),
        db.execute<{ source: string; visits: number; clicks: number }>(sql`
          select source, sum(visits)::int as visits, sum(clicks)::int as clicks from (
            select source, count(*) as visits, 0 as clicks from events where kind = 'visit' and created_at >= ${since} group by source
            union all
            select source, 0, count(*) from clicks where created_at >= ${since} group by source
          ) t group by source order by visits desc, clicks desc
        `).then((r) => r.rows),
        db
          .select({ store: schema.clicks.store, clicks: sql<number>`count(*)::int` })
          .from(schema.clicks)
          .where(gte(schema.clicks.createdAt, since))
          .groupBy(schema.clicks.store)
          .orderBy(desc(sql`count(*)`)),
        db
          .select({
            id: schema.products.id,
            title: schema.products.title,
            store: schema.products.store,
            reelCode: schema.products.reelCode,
            image: schema.products.image,
            clicks: sql<number>`count(*)::int`,
          })
          .from(schema.clicks)
          .innerJoin(schema.products, eq(schema.products.id, schema.clicks.targetId))
          .where(and(eq(schema.clicks.kind, "product"), gte(schema.clicks.createdAt, since)))
          .groupBy(schema.products.id)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
        db.execute<{ code: string; title: string; poster: string; plays: number; look_views: number; clicks: number }>(sql`
          select r.code, r.title, r.poster,
            coalesce(e.plays, 0)::int as plays,
            coalesce(e.look_views, 0)::int as look_views,
            coalesce(c.clicks, 0)::int as clicks
          from reels r
          left join (
            select reel_code,
              count(*) filter (where kind = 'reel_play') as plays,
              count(*) filter (where kind = 'look_view') as look_views
            from events where created_at >= ${since} and reel_code is not null group by reel_code
          ) e on e.reel_code = r.code
          left join (
            select reel_code, count(*) as clicks from clicks where created_at >= ${since} and reel_code is not null group by reel_code
          ) c on c.reel_code = r.code
          where coalesce(e.plays, 0) + coalesce(e.look_views, 0) + coalesce(c.clicks, 0) > 0
          order by clicks desc, plays desc, look_views desc
          limit 15
        `).then((r) => r.rows),
        db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(5),
      ]);
      return {
        days,
        totals: {
          visitors: totals.visitors,
          visits: totals.visits,
          reelPlays: totals.reel_plays,
          lookViews: totals.look_views,
          clicks: totals.clicks,
          clicksToday: totals.clicks_today,
          reels: totals.reels,
          products: totals.products,
          newEnquiries: totals.new_enquiries,
        },
        daily: daily.map((d) => ({ day: d.day, visitors: d.visitors, reelPlays: d.reel_plays, clicks: d.clicks })),
        sources,
        byStore,
        topProducts,
        reelPerformance: reelPerformance.map((r) => ({ code: r.code, title: r.title, poster: r.poster, plays: r.plays, lookViews: r.look_views, clicks: r.clicks })),
        recentEnquiries: recent.map(toEnquiry),
      };
    },

    async nextReelCode() {
      const rows = await db.select({ code: schema.reels.code }).from(schema.reels);
      // Keep the most-used letter and go one past its highest number.
      const byLetter = new Map<string, number[]>();
      for (const { code } of rows) {
        const m = /^([A-Z])(\d+)$/.exec(code);
        if (m) byLetter.set(m[1], [...(byLetter.get(m[1]) ?? []), Number(m[2])]);
      }
      const [letter, nums] = [...byLetter.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? ["A", [100]];
      return `${letter}${Math.max(...nums) + 1}`;
    },

    async listReels() {
      const [reelRows, productRows] = await Promise.all([
        db.select().from(schema.reels).orderBy(desc(schema.reels.publishedAt), desc(schema.reels.createdAt)),
        db.select().from(schema.products).orderBy(asc(schema.products.sortOrder)),
      ]);
      return reelRows.map((r) => ({ ...toReel(r), products: productRows.filter((p) => p.reelCode === r.code).map(toProduct) }));
    },

    async getReel(code) {
      const [row] = await db.select().from(schema.reels).where(eq(schema.reels.code, code.toUpperCase()));
      if (!row) return undefined;
      const productRows = await db.select().from(schema.products).where(eq(schema.products.reelCode, row.code)).orderBy(asc(schema.products.sortOrder));
      return { ...toReel(row), products: productRows.map(toProduct) };
    },

    saveReel: (input, originalCode) =>
      write(async () => {
        const { products, ...reel } = input;
        try {
          await db.transaction(async (tx) => {
            if (originalCode) {
              const [existing] = await tx.select({ code: schema.reels.code }).from(schema.reels).where(eq(schema.reels.code, originalCode));
              if (!existing) throw new AdminError("Reel not found", 404);
              if (originalCode !== reel.code) {
                // Renaming the code cascades to its products.
                await tx.update(schema.reels).set({ code: reel.code }).where(eq(schema.reels.code, originalCode));
              }
              await tx.update(schema.reels).set({ ...reel, updatedAt: new Date() }).where(eq(schema.reels.code, reel.code));
            } else {
              await tx.insert(schema.reels).values(reel);
            }

            const rows = products.map((p, i) => ({ ...p, id: p.id || newId("p"), reelCode: reel.code, sortOrder: i }));
            const keep = rows.map((r) => r.id);
            await tx
              .delete(schema.products)
              .where(and(eq(schema.products.reelCode, reel.code), keep.length ? notInArray(schema.products.id, keep) : undefined));
            for (const row of rows) {
              const { id: _id, ...update } = row;
              await tx.insert(schema.products).values(row).onConflictDoUpdate({ target: schema.products.id, set: update });
            }
          });
        } catch (err) {
          if (err instanceof AdminError) throw err;
          if (pgCode(err) === "23505") throw new AdminError(`Reel code ${reel.code} is already used`, 409, "code");
          if (pgCode(err) === "23503") throw new AdminError("That category doesn't exist", 400, "category");
          throw err;
        }
        return (await admin.getReel(reel.code))!;
      }),

    deleteReel: (code) =>
      write(async () => {
        const res = await db.delete(schema.reels).where(eq(schema.reels.code, code)).returning({ code: schema.reels.code });
        if (!res.length) throw new AdminError("Reel not found", 404);
      }),

    async listCategories() {
      const rows = await db.execute<{ slug: string; name: string; image: string; blurb: string; sort_order: number; reel_count: number; product_count: number }>(sql`
        select c.*,
          (select count(*)::int from reels r where r.category = c.slug) as reel_count,
          (select count(*)::int from products p where p.category = c.slug) as product_count
        from categories c order by c.sort_order, c.name
      `);
      return rows.rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        image: r.image,
        blurb: r.blurb,
        sortOrder: r.sort_order,
        reelCount: r.reel_count,
        productCount: r.product_count,
      }));
    },

    saveCategory: (input, originalSlug) =>
      write(async () => {
        try {
          await db.transaction(async (tx) => {
            if (originalSlug) {
              const res = await tx.update(schema.categories).set(input).where(eq(schema.categories.slug, originalSlug)).returning();
              if (!res.length) throw new AdminError("Category not found", 404);
              // Product categories are plain text, so follow a renamed slug by hand.
              if (originalSlug !== input.slug) {
                await tx.update(schema.products).set({ category: input.slug }).where(eq(schema.products.category, originalSlug));
                await tx.update(schema.lootDeals).set({ category: input.slug }).where(eq(schema.lootDeals.category, originalSlug));
              }
            } else {
              await tx.insert(schema.categories).values(input);
            }
          });
        } catch (err) {
          if (err instanceof AdminError) throw err;
          if (pgCode(err) === "23505") throw new AdminError(`A category with slug "${input.slug}" already exists`, 409, "slug");
          throw err;
        }
      }),

    deleteCategory: (slug) =>
      write(async () => {
        const [{ n }] = (
          await db.execute<{ n: number }>(sql`
            select ((select count(*) from reels where category = ${slug}) + (select count(*) from products where category = ${slug}))::int as n
          `)
        ).rows;
        if (n > 0) throw new AdminError("Move its reels and products to another category first", 409);
        await db.delete(schema.categories).where(eq(schema.categories.slug, slug));
      }),

    async listEvents() {
      return (await db.select().from(schema.saleEvents).orderBy(desc(schema.saleEvents.startsAt))).map(toEvent);
    },

    saveEvent: (input) =>
      write(async () => {
        const row = { ...input, id: input.id || newId("e") };
        const { id: _id, ...update } = row;
        const [saved] = await db.insert(schema.saleEvents).values(row).onConflictDoUpdate({ target: schema.saleEvents.id, set: update }).returning();
        return toEvent(saved);
      }),

    deleteEvent: (id) =>
      write(async () => {
        await db.delete(schema.saleEvents).where(eq(schema.saleEvents.id, id));
      }),

    async listDeals() {
      return (await db.select().from(schema.lootDeals).orderBy(desc(schema.lootDeals.expiresAt))).map(toDeal);
    },

    saveDeal: (input) =>
      write(async () => {
        const row = { ...input, id: input.id || newId("d") };
        const { id: _id, ...update } = row;
        const [saved] = await db.insert(schema.lootDeals).values(row).onConflictDoUpdate({ target: schema.lootDeals.id, set: update }).returning();
        return toDeal(saved);
      }),

    deleteDeal: (id) =>
      write(async () => {
        await db.delete(schema.lootDeals).where(eq(schema.lootDeals.id, id));
      }),

    async listEnquiries() {
      return (await db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(500)).map(toEnquiry);
    },

    async setEnquiryStatus(id, status) {
      const res = await db.update(schema.enquiries).set({ status }).where(eq(schema.enquiries.id, id)).returning({ id: schema.enquiries.id });
      if (!res.length) throw new AdminError("Enquiry not found", 404);
    },
  };

  return {
    kind: "database",
    catalog,
    async recordClick(click) {
      await db.insert(schema.clicks).values({
        targetId: click.targetId,
        kind: click.kind,
        reelCode: click.reelCode ?? null,
        store: click.store,
        referrer: click.referrer?.slice(0, 500) ?? null,
        userAgent: click.userAgent?.slice(0, 500) ?? null,
        source: click.source,
        visitor: click.visitor ?? null,
      });
    },
    async recordEvent(e) {
      await db.insert(schema.events).values({
        kind: e.kind,
        reelCode: e.reelCode ?? null,
        path: e.path?.slice(0, 300) ?? null,
        source: e.source,
        visitor: e.visitor ?? null,
      });
    },
    async saveEnquiry(e) {
      await db.insert(schema.enquiries).values({ ...e, phone: e.phone ?? null });
    },
    admin,
  };
}
