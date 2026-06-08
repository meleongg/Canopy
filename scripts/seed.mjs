import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.CANOPY_DEV_DB_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL or CANOPY_DEV_DB_URL before running seed.");
}

const sql = neon(databaseUrl);
const userId = "local-canopy-user";

const rows = [
  {
    id: "seed-word-ying-gai",
    flashcardId: "seed-card-ying-gai",
    languageCode: "zh-CN",
    targetText: "应该",
    phoneticReading: ["yīng", "gāi"],
    definitions: ["should", "ought to"],
    interval: 0,
    repetition: 0,
    easiness: 250,
  },
  {
    id: "seed-word-fu-jin",
    flashcardId: "seed-card-fu-jin",
    languageCode: "zh-CN",
    targetText: "附近",
    phoneticReading: ["fù", "jìn"],
    definitions: ["nearby", "in the area"],
    interval: 6,
    repetition: 2,
    easiness: 235,
  },
  {
    id: "seed-word-pai-dui",
    flashcardId: "seed-card-pai-dui",
    languageCode: "zh-CN",
    targetText: "排队",
    phoneticReading: ["pái", "duì"],
    definitions: ["to line up", "queue"],
    interval: 18,
    repetition: 4,
    easiness: 265,
  },
];

await sql`
  insert into "user" (
    "id",
    "name",
    "email",
    "email_verified",
    "created_at",
    "updated_at"
  )
  values (
    ${userId},
    'Canopy Local',
    'local@canopy.app',
    true,
    now(),
    now()
  )
  on conflict ("id") do nothing
`;

for (const row of rows) {
  await sql`
    insert into "words" (
      "id",
      "language_code",
      "target_text",
      "phonetic_reading",
      "definitions",
      "created_at"
    )
    values (
      ${row.id},
      ${row.languageCode},
      ${row.targetText},
      ${JSON.stringify(row.phoneticReading)}::jsonb,
      ${JSON.stringify(row.definitions)}::jsonb,
      now()
    )
    on conflict ("language_code", "target_text")
    do update set
      "phonetic_reading" = excluded."phonetic_reading",
      "definitions" = excluded."definitions"
  `;

  await sql`
    insert into "flashcards" (
      "id",
      "user_id",
      "word_id",
      "interval",
      "repetition",
      "easiness",
      "next_review_at",
      "created_at"
    )
    values (
      ${row.flashcardId},
      ${userId},
      ${row.id},
      ${row.interval},
      ${row.repetition},
      ${row.easiness},
      now(),
      now()
    )
    on conflict ("user_id", "word_id") do nothing
  `;
}

console.log(`Seeded ${rows.length} vocabulary cards for ${userId}.`);
