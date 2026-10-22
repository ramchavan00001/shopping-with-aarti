import { eq } from "drizzle-orm";
import type { JobState } from "../../shared/admin";
import type { Db } from "../data/db";
import * as schema from "../db/schema";
import type { ErrorLog } from "./errors";

// Background jobs with their last run stored in the database, so a restart
// (or Render waking up) doesn't re-run a job that ran recently.

export interface JobDef {
  name: string;
  /** Run again after this long. */
  everyMs: number;
  /** Return false to skip (e.g. Instagram not connected). */
  enabled?: () => Promise<boolean> | boolean;
  run: () => Promise<string>;
}

const toState = (r: typeof schema.jobRuns.$inferSelect): JobState => ({
  name: r.name,
  lastStartedAt: r.lastStartedAt?.toISOString() ?? null,
  lastFinishedAt: r.lastFinishedAt?.toISOString() ?? null,
  lastStatus: r.lastStatus as JobState["lastStatus"],
  lastSummary: r.lastSummary,
});

export function createJobs(db: Db, errors: ErrorLog) {
  const defs = new Map<string, JobDef>();
  const running = new Set<string>();

  async function state(name: string): Promise<JobState | null> {
    const [row] = await db.select().from(schema.jobRuns).where(eq(schema.jobRuns.name, name));
    return row ? toState(row) : null;
  }

  /** Run a job now (unless it's already running in this process). */
  async function run(name: string): Promise<JobState | null> {
    const def = defs.get(name);
    if (!def) throw new Error(`Unknown job ${name}`);
    if (running.has(name)) return state(name);
    running.add(name);
    const startedAt = new Date();
    await db
      .insert(schema.jobRuns)
      .values({ name, lastStartedAt: startedAt, lastStatus: "running" })
      .onConflictDoUpdate({ target: schema.jobRuns.name, set: { lastStartedAt: startedAt, lastStatus: "running" } });
    try {
      const summary = await def.run();
      await db.update(schema.jobRuns).set({ lastFinishedAt: new Date(), lastStatus: "ok", lastSummary: summary.slice(0, 1000) }).where(eq(schema.jobRuns.name, name));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(schema.jobRuns).set({ lastFinishedAt: new Date(), lastStatus: "failed", lastSummary: message.slice(0, 1000) }).where(eq(schema.jobRuns.name, name));
      await errors.record("job", `${name}: ${message}`, err instanceof Error ? err.stack : undefined);
    } finally {
      running.delete(name);
    }
    return state(name);
  }

  /** Start a job in the background and return immediately. */
  function start(name: string) {
    void run(name).catch((err) => console.error(JSON.stringify({ event: "job_crashed", name, error: String(err) })));
  }

  /** Run every due job. Called on a timer while the server is awake. */
  async function tick() {
    for (const def of defs.values()) {
      if (running.has(def.name)) continue;
      try {
        if (def.enabled && !(await def.enabled())) continue;
        const s = await state(def.name);
        // A "running" row older than 2 hours is a run that died with the server.
        const last = s?.lastStartedAt ? Date.parse(s.lastStartedAt) : 0;
        const stuck = s?.lastStatus === "running" && Date.now() - last > 2 * 3_600_000;
        if (s?.lastStatus === "running" && !stuck) continue;
        if (Date.now() - last >= def.everyMs || stuck) start(def.name);
      } catch (err) {
        console.error(JSON.stringify({ event: "job_tick_failed", name: def.name, error: String(err) }));
      }
    }
  }

  return {
    define: (def: JobDef) => void defs.set(def.name, def),
    run,
    start,
    state,
    async all(): Promise<JobState[]> {
      const rows = await db.select().from(schema.jobRuns);
      return [...defs.keys()].map((name) => {
        const row = rows.find((r) => r.name === name);
        return row ? toState(row) : { name, lastStartedAt: null, lastFinishedAt: null, lastStatus: null, lastSummary: null };
      });
    },
    /** Check for due jobs every 10 minutes (first check 1 minute after start). */
    schedule() {
      setTimeout(() => void tick(), 60_000).unref();
      setInterval(() => void tick(), 10 * 60_000).unref();
    },
    tick,
  };
}

export type Jobs = ReturnType<typeof createJobs>;
