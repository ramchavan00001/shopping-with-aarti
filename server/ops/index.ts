import type { SystemStatus } from "../../shared/admin";
import type { AdminStore } from "../data/admin";
import type { Db } from "../data/db";
import { r2FromProcessEnv } from "../uploads";
import { alertChannels } from "./alerts";
import { createErrorLog } from "./errors";
import { createInstagram } from "./instagram";
import { createJobs } from "./jobs";
import { createLinkChecker } from "./links";
import { createSubscribers } from "./subscribers";

// Everything that runs behind the scenes on the Node server: error log and
// alerts, background jobs (link checker, Instagram sync), WhatsApp alert
// subscribers. Needs the database; not available on the Workers preview.

/** Public site address for links in alerts. Render sets RENDER_EXTERNAL_URL. */
export const siteUrl = () => (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");

export function createOps(db: Db, admin: AdminStore) {
  const errors = createErrorLog(db, siteUrl);
  const jobs = createJobs(db, errors);
  const links = createLinkChecker(db, jobs, siteUrl, () => {});
  const subscribers = createSubscribers(db);
  const instagram = createInstagram(db, admin, jobs);

  return {
    errors,
    jobs,
    links,
    subscribers,
    instagram,
    async system(): Promise<SystemStatus> {
      const [jobStates, errorRows] = await Promise.all([jobs.all(), errors.list(50)]);
      return { database: true, alerts: alertChannels(), uploads: !!r2FromProcessEnv(), jobs: jobStates, errors: errorRows };
    },
  };
}

export type Ops = ReturnType<typeof createOps>;
