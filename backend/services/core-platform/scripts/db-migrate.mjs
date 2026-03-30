import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[db:migrate] DATABASE_URL is required but was not provided.");
  process.exit(1);
}

const serviceRoot = process.cwd();
const migrationDir = resolve(serviceRoot, "../../../SQL/migrations/core-platform");
const applySqlMigrations = process.env.DB_MIGRATE_APPLY_SQL === "true";

function hasPsql() {
  const check = spawnSync("psql", ["--version"], { stdio: "ignore" });
  return check.status === 0;
}

if (!hasPsql()) {
  console.warn("[db:migrate] psql is not available; skipping SQL execution.");
  console.warn("[db:migrate] Ensure schema is pre-provisioned when running integration tests.");
  process.exit(0);
}

const connectivityCheck = spawnSync(
  "psql",
  [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;"],
  { stdio: "inherit" },
);

if (connectivityCheck.status !== 0) {
  console.error("[db:migrate] Database connectivity check failed.");
  process.exit(connectivityCheck.status ?? 1);
}

if (!applySqlMigrations) {
  console.log("[db:migrate] Connectivity check passed.");
  console.log("[db:migrate] SQL migration apply is disabled by default (set DB_MIGRATE_APPLY_SQL=true to enable).");
  process.exit(0);
}

if (!existsSync(migrationDir)) {
  console.warn(`[db:migrate] Migration directory not found: ${migrationDir}`);
  console.warn("[db:migrate] Connectivity check passed; no migrations were applied.");
  process.exit(0);
}

const sqlFiles = readdirSync(migrationDir)
  .filter((file) => extname(file).toLowerCase() === ".sql")
  .sort();

if (sqlFiles.length === 0) {
  console.warn(`[db:migrate] No SQL files found in ${migrationDir}`);
  console.warn("[db:migrate] Connectivity check passed; no migrations were applied.");
  process.exit(0);
}

console.log(`[db:migrate] Applying ${sqlFiles.length} migration file(s) from ${migrationDir}`);

for (const file of sqlFiles) {
  const filePath = join(migrationDir, file);
  console.log(`[db:migrate] Applying ${file}`);
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    console.error(`[db:migrate] Failed while applying ${file}`);
    process.exit(result.status ?? 1);
  }
}

console.log("[db:migrate] Migration completed successfully.");
