import postgres from "postgres";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
if (!process.env.POSTGRESQL_URL) throw new Error("Set POSTGRESQL_URL in .env.");
const db = postgres(process.env.POSTGRESQL_URL, {
  max: 1,
  connect_timeout: 15,
  onnotice: () => {},
});
try {
  await db`create table if not exists public.app_schema_migrations(name text primary key,applied_at timestamptz not null default now())`;
  await db`revoke all on public.app_schema_migrations from anon,authenticated`;
  const [{ installed }] =
    await db`select to_regclass('public.catalog_products') is not null installed`;
  if (installed)
    await db`insert into public.app_schema_migrations(name) values('001_shared_tracking.sql') on conflict do nothing`;
  const applied = new Set(
    (await db`select name from public.app_schema_migrations`).map(
      (r) => r.name,
    ),
  );
  const files = (await readdir(new URL("../migrations/", import.meta.url)))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const name of files.filter((f) => !applied.has(f))) {
    const tableNames = [
      "products",
      "price_history",
      "catalog_products",
      "catalog_price_history",
      "alert_events",
      "catalog_observations",
      "collections",
      "purchases",
      "comparison_groups",
    ];
    const backup = await db.begin("read only", async (sql) => {
      const result = {
        createdAt: new Date().toISOString(),
        migration: name,
        tables: {},
        policies:
          await sql`select * from pg_policies where schemaname='public'`,
        columns:
          await sql`select * from information_schema.columns where table_schema='public'`,
        constraints:
          await sql`select conname,conrelid::regclass::text table_name,pg_get_constraintdef(oid) definition from pg_constraint where connamespace='public'::regnamespace`,
        functions:
          await sql`select proname,pg_get_functiondef(oid) definition from pg_proc where pronamespace='public'::regnamespace and prokind='f'`,
      };
      for (const table of tableNames) {
        const [{ exists }] =
          await sql`select to_regclass(${`public.${table}`}) is not null as exists`;
        if (exists)
          result.tables[table] = await sql.unsafe(
            "select * from public." + table,
          );
      }
      return result;
    });
    const folder = resolve(".local-backups");
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const file = resolve(folder, `before-${name}-${Date.now()}.json`);
    await writeFile(file, JSON.stringify(backup, null, 2), { mode: 0o600 });
    console.log("Private backup:", file);
    const contents = (
      await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8")
    )
      .replace(/^begin;\s*/m, "")
      .replace(/commit;\s*$/, "");
    await db.begin(async (sql) => {
      await sql.unsafe(contents).simple();
      await sql`insert into public.app_schema_migrations(name) values(${name})`;
    });
    console.log("Applied:", name);
  }
  console.log("Database migrations are current.");
} catch (error) {
  console.error(
    "Migration failed; transaction rolled back:",
    error instanceof Error ? error.message : "database error",
  );
  process.exitCode = 1;
} finally {
  await db.end({ timeout: 5 });
}
