// CLI for database chores: `npm run db:migrate` and `npm run db:seed`.
import { connect } from "../server/data/db";
import { runMigrations, seedDemoIfEmpty } from "../server/db/setup";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first, e.g. DATABASE_URL=postgres://user:pass@host:5432/db");
  process.exit(1);
}

const command = process.argv[2];
const { pool, db } = connect(url);
try {
  await runMigrations(db);
  console.log("Migrations applied.");
  if (command === "seed") console.log((await seedDemoIfEmpty(db)) ? "Demo catalogue added." : "Database already has data; seed skipped.");
} finally {
  await pool.end();
}
