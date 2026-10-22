import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type { ErrorRow } from "../../shared/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";
import { sendAlert } from "./alerts";

// Errors are grouped by a fingerprint (where + what), so a bug that fires a
// thousand times is one row with count 1000, and alerts once per hour.

type Origin = ErrorRow["origin"];

const normalisePath = (path?: string) => path?.split("?")[0].replace(/\/[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g, "/:id");

export function createErrorLog(db: Db, siteUrl: () => string) {
  async function record(origin: Origin, message: string, detail?: string, path?: string) {
    const msg = (message || "Unknown error").slice(0, 500);
    const where = normalisePath(path) ?? "";
    const fingerprint = createHash("sha1").update(`${origin}|${msg.split("\n")[0]}|${where}`).digest("hex").slice(0, 20);
    try {
      const [existing] = await db.select({ id: schema.errorLog.id, count: schema.errorLog.count }).from(schema.errorLog).where(eq(schema.errorLog.fingerprint, fingerprint)).limit(1);
      if (existing) {
        await db
          .update(schema.errorLog)
          .set({ count: sql`${schema.errorLog.count} + 1`, lastSeen: new Date(), detail: detail?.slice(0, 4000) ?? null })
          .where(eq(schema.errorLog.id, existing.id));
      } else {
        await db.insert(schema.errorLog).values({ origin, fingerprint, message: msg, detail: detail?.slice(0, 4000) ?? null, path: path?.slice(0, 300) ?? null });
      }
      // Browser errors are noisier (old phones, extensions): alert on server/job errors right away.
      if (origin !== "client" || !existing) {
        await sendAlert(
          `${origin === "client" ? "Browser" : origin === "job" ? "Background job" : "Server"} error on the site`,
          `${msg}${path ? `\nPage: ${path}` : ""}\n${existing ? `Seen ${existing.count + 1} times.` : "First time seen."}\nDetails: ${siteUrl()}/admin/system`,
          `error:${fingerprint}`,
        );
      }
    } catch (err) {
      console.error(JSON.stringify({ event: "error_log_failed", error: String(err), original: msg }));
    }
  }

  return {
    record,
    async list(limit = 100): Promise<ErrorRow[]> {
      const rows = await db.select().from(schema.errorLog).orderBy(desc(schema.errorLog.lastSeen)).limit(limit);
      return rows.map((r) => ({
        id: r.id,
        origin: r.origin as Origin,
        message: r.message,
        detail: r.detail,
        path: r.path,
        count: r.count,
        firstSeen: r.firstSeen.toISOString(),
        lastSeen: r.lastSeen.toISOString(),
      }));
    },
    async clear(id?: number) {
      if (id) await db.delete(schema.errorLog).where(eq(schema.errorLog.id, id));
      else await db.delete(schema.errorLog);
    },
  };
}

export type ErrorLog = ReturnType<typeof createErrorLog>;
