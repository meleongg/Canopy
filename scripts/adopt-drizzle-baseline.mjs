import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.CANOPY_DEV_DB_URL;
if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL or CANOPY_DEV_DB_URL before adopting migrations.",
  );
}

const sql = neon(databaseUrl);
const requiredColumns = {
  flashcards: [
    "id",
    "user_id",
    "word_id",
    "target_text_override",
    "phonetic_reading_override",
    "definitions_override",
    "archived_at",
  ],
  ai_sessions: ["id", "user_id", "seed_snapshot"],
  user_preferences: ["user_id", "theme", "import_language"],
};

const existingColumns = await sql.query(
  `select table_name, column_name
   from information_schema.columns
   where table_schema = 'public'
     and table_name in ('flashcards', 'ai_sessions', 'user_preferences')`,
);
const columnsByTable = new Map();
for (const row of existingColumns) {
  const columns = columnsByTable.get(row.table_name) ?? new Set();
  columns.add(row.column_name);
  columnsByTable.set(row.table_name, columns);
}

for (const [table, expectedColumns] of Object.entries(requiredColumns)) {
  const columns = columnsByTable.get(table);
  const missing = expectedColumns.filter((column) => !columns?.has(column));
  if (missing.length > 0) {
    throw new Error(
      `Cannot adopt migrations: ${table} is missing ${missing.join(", ")}. This command only adopts the verified pre-CC-CEDICT baseline.`,
    );
  }
}

const [ledger] = await sql.query(
  "select to_regclass('drizzle.__drizzle_migrations') as migration_table",
);
if (ledger.migration_table) {
  const [{ count }] = await sql.query(
    "select count(*)::int as count from drizzle.__drizzle_migrations",
  );
  if (count > 0) {
    throw new Error(
      "Drizzle migration history already exists. Run npm run db:migrate instead.",
    );
  }
}

const journal = JSON.parse(
  await readFile("drizzle/meta/_journal.json", "utf8"),
);
const baseline = await Promise.all(
  journal.entries.slice(0, 2).map(async (entry) => {
    const contents = await readFile(`drizzle/${entry.tag}.sql`, "utf8");
    return {
      hash: createHash("sha256").update(contents).digest("hex"),
      createdAt: entry.when,
    };
  }),
);

await sql.transaction([
  sql`create schema if not exists drizzle`,
  sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `,
  ...baseline.map(
    (migration) => sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${migration.hash}, ${migration.createdAt})
    `,
  ),
]);

console.log(
  "Adopted the verified pre-CC-CEDICT baseline. Next run: npm run db:migrate",
);
