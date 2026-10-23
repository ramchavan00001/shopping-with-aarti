// Dev-server wiring, loaded by the Vite plugin in vite.config.ts. Uses
// PostgreSQL when DATABASE_URL is set (in the shell or .env), otherwise the
// demo catalogue. The source is kept on globalThis so hot reloads don't open
// a new connection pool every time.
import { existsSync } from "node:fs";
import { createApp } from "./app";
import { resizeImage } from "./images";
import { connect, createDbSource } from "./data/db";
import { createDemoSource } from "./data/demo";
import { runMigrations, seedDemoIfEmpty } from "./db/setup";
import type { DataSource } from "./data/types";

if (existsSync(".env")) process.loadEnvFile(".env");

const g = globalThis as typeof globalThis & { __aartiSource?: Promise<DataSource> };

g.__aartiSource ??= (async () => {
  if (!process.env.DATABASE_URL) return createDemoSource();
  const { db } = connect(process.env.DATABASE_URL);
  await runMigrations(db);
  if (process.env.SEED_DEMO !== "false") await seedDemoIfEmpty(db);
  return createDbSource(db);
})();

const source = await g.__aartiSource;
export default createApp(() => source, { resizeImage }).app;
