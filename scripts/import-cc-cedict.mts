import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { neon } from "@neondatabase/serverless";
import { createInterface } from "node:readline";
import {
  CC_CEDICT_LICENSE_URL,
  CC_CEDICT_SOURCE_URL,
  parseCcCedictLine,
} from "../lib/cc-cedict.ts";

const BATCH_SIZE = 250;

type ImportOptions = {
  filePath: string;
  releasedAt: Date;
  expectedEntryCount: number;
};

type ImportRow = {
  entry: NonNullable<ReturnType<typeof parseCcCedictLine>>;
  sourceEntryId: string;
};

function usage(message?: string): never {
  if (message) {
    console.error(message);
  }

  console.error(
    "Usage: npm run dictionary:import -- <file.txt.gz> --released-at <ISO timestamp> --entry-count <count>",
  );
  process.exit(1);
}

function parseOptions(args: string[]): ImportOptions {
  const [filePath, ...flags] = args;
  if (!filePath || filePath.startsWith("-")) {
    usage("Provide the manually downloaded CC-CEDICT .txt.gz file first.");
  }

  let releasedAtValue: string | undefined;
  let entryCountValue: string | undefined;
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const value = flags[index + 1];
    if (flag === "--released-at") {
      releasedAtValue = value;
      index += 1;
    } else if (flag === "--entry-count") {
      entryCountValue = value;
      index += 1;
    } else {
      usage(`Unknown option: ${flag}`);
    }
  }

  const releasedAt = new Date(releasedAtValue ?? "");
  if (Number.isNaN(releasedAt.getTime())) {
    usage(
      "Provide --released-at using the timestamp shown on the download page.",
    );
  }

  const expectedEntryCount = Number(entryCountValue);
  if (!Number.isSafeInteger(expectedEntryCount) || expectedEntryCount < 1) {
    usage("Provide --entry-count using the number shown on the download page.");
  }

  return { filePath, releasedAt, expectedEntryCount };
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function* readEntries(filePath: string): AsyncGenerator<ImportRow> {
  const input = createReadStream(filePath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    const entry = parseCcCedictLine(line);
    if (entry) {
      yield {
        entry,
        sourceEntryId: createHash("sha256").update(line).digest("hex"),
      };
    }
  }
}

async function countEntries(filePath: string) {
  let count = 0;
  for await (const entry of readEntries(filePath)) {
    if (entry) {
      count += 1;
    }
  }
  return count;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  await access(options.filePath);

  const databaseUrl = process.env.DATABASE_URL ?? process.env.CANOPY_DEV_DB_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL or CANOPY_DEV_DB_URL before importing.");
  }

  console.log("Checking the downloaded CC-CEDICT release…");
  const [actualEntryCount, sourceSha256] = await Promise.all([
    countEntries(options.filePath),
    sha256File(options.filePath),
  ]);
  if (actualEntryCount !== options.expectedEntryCount) {
    throw new Error(
      `Expected ${options.expectedEntryCount} entries, but parsed ${actualEntryCount}. Download a complete release and use its published entry count.`,
    );
  }

  const sql = neon(databaseUrl);
  const sourceVersion = options.releasedAt.toISOString();
  const [existingRelease] = await sql`
    select id, source_sha256, is_active
    from dictionary_releases
    where source = 'cc-cedict' and source_version = ${sourceVersion}
  `;
  if (existingRelease && existingRelease.source_sha256 !== sourceSha256) {
    throw new Error(
      "A different file is already recorded for this CC-CEDICT release timestamp. Use the original artifact or provide the timestamp for the downloaded release.",
    );
  }
  if (existingRelease?.is_active) {
    console.log(
      `CC-CEDICT ${sourceVersion} is already the active release; nothing to import.`,
    );
    return;
  }

  const release =
    existingRelease ??
    (
      await sql`
        insert into dictionary_releases (
          id, source, source_version, source_url, license_url, source_released_at,
          source_entry_count, source_sha256
        ) values (
          ${randomUUID()}, 'cc-cedict', ${sourceVersion}, ${CC_CEDICT_SOURCE_URL},
          ${CC_CEDICT_LICENSE_URL}, ${options.releasedAt}, ${actualEntryCount}, ${sourceSha256}
        )
        returning id
      `
    )[0];

  if (!release) {
    throw new Error("Could not create the CC-CEDICT release record.");
  }

  let batch: ImportRow[] = [];
  let imported = 0;

  async function writeBatch() {
    if (batch.length === 0) {
      return;
    }

    await sql.transaction(
      batch.map(
        ({ entry, sourceEntryId }) => sql`
        insert into dictionary_entries (
          id, release_id, source_entry_id, traditional, simplified, pinyin, definitions
        ) values (
          ${randomUUID()}, ${release.id}, ${sourceEntryId}, ${entry.traditional},
          ${entry.simplified}, ${entry.pinyin}, ${JSON.stringify(entry.definitions)}::jsonb
        )
        on conflict (release_id, source_entry_id) do update set
          traditional = excluded.traditional,
          simplified = excluded.simplified,
          pinyin = excluded.pinyin,
          definitions = excluded.definitions
      `,
      ),
    );
    imported += batch.length;
    batch = [];
    console.log(`Imported ${imported}/${actualEntryCount} entries`);
  }

  for await (const row of readEntries(options.filePath)) {
    batch.push(row);
    if (batch.length === BATCH_SIZE) {
      await writeBatch();
    }
  }
  await writeBatch();

  await sql.transaction([
    sql`
      update dictionary_releases
      set is_active = false
      where source = 'cc-cedict' and is_active = true
    `,
    sql`
      update dictionary_releases
      set is_active = true
      where id = ${release.id}
    `,
  ]);
  await sql`
    delete from dictionary_entries
    where release_id in (
      select id
      from dictionary_releases
      where source = 'cc-cedict' and is_active = false
    )
  `;

  console.log(
    `Activated CC-CEDICT ${sourceVersion} (${actualEntryCount} entries, sha256 ${sourceSha256}).`,
  );
}

await main();
