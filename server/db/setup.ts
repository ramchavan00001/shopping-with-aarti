import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { categories, lootDeals, products, reels, saleEvents } from "../../shared/catalog";
import type { Db } from "../data/db";
import * as schema from "./schema";

/** Apply pending migrations from ./drizzle. Safe to run on every boot. */
export async function runMigrations(db: Db) {
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}

/**
 * Fill an empty database with the demo catalogue so a fresh deploy has
 * something to show. Does nothing once any category exists.
 */
export async function seedDemoIfEmpty(db: Db) {
  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from categories`)).rows;
  if (n > 0) return false;

  await db.transaction(async (tx) => {
    await tx.insert(schema.categories).values(categories.map((c, i) => ({ ...c, sortOrder: i })));
    await tx.insert(schema.reels).values(
      reels.map((r) => ({
        code: r.code,
        slug: r.slug,
        title: r.title,
        caption: r.caption,
        video: r.video,
        poster: r.poster,
        instagramUrl: r.instagramUrl ?? null,
        category: r.category,
        tags: r.tags,
        publishedAt: r.publishedAt,
        isFeatured: r.isFeatured ?? false,
        views: r.views,
      })),
    );
    const order = new Map<string, number>();
    await tx.insert(schema.products).values(
      products.map((p) => {
        const i = order.get(p.reelCode) ?? 0;
        order.set(p.reelCode, i + 1);
        return {
          id: p.id,
          reelCode: p.reelCode,
          title: p.title,
          store: p.store,
          affiliateUrl: p.affiliateUrl,
          image: p.image,
          approxPrice: p.approxPrice ?? null,
          mrp: p.mrp ?? null,
          category: p.category,
          note: p.note ?? null,
          sizeTip: p.sizeTip ?? null,
          colour: p.colour ?? null,
          occasions: p.occasions ?? [],
          isActive: p.isActive,
          sortOrder: i,
        };
      }),
    );
    await tx.insert(schema.saleEvents).values(saleEvents);
    await tx.insert(schema.lootDeals).values(lootDeals.map((d) => ({ ...d, coupon: d.coupon ?? null, note: d.note ?? null })));
  });
  return true;
}
