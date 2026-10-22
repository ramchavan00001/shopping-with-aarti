import { desc, eq } from "drizzle-orm";
import type { SubscriberRow } from "../../shared/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";

export function createSubscribers(db: Db) {
  return {
    /** Add or update (same number signing up again just updates interests). */
    async add(s: { name: string; phone: string; interests: string[]; source: string }) {
      await db
        .insert(schema.subscribers)
        .values(s)
        .onConflictDoUpdate({ target: schema.subscribers.phone, set: { name: s.name, interests: s.interests } });
    },
    async list(): Promise<SubscriberRow[]> {
      const rows = await db.select().from(schema.subscribers).orderBy(desc(schema.subscribers.createdAt));
      return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
    },
    async remove(id: number) {
      await db.delete(schema.subscribers).where(eq(schema.subscribers.id, id));
    },
    async count() {
      return (await db.$count(schema.subscribers)) as number;
    },
  };
}

export type Subscribers = ReturnType<typeof createSubscribers>;
