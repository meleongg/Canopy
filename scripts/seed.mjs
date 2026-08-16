import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.CANOPY_DEV_DB_URL;

if (!databaseUrl) {
  throw new Error("Set DATABASE_URL or CANOPY_DEV_DB_URL before running seed.");
}

const sql = neon(databaseUrl);
const userId = "local-canopy-user";

const rows = [
  {
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
    insert into "flashcards" (
      "id",
      "user_id",
      "language_code",
      "target_text",
      "phonetic_reading",
      "definitions",
      "interval",
      "repetition",
      "easiness",
      "next_review_at",
      "created_at"
    )
    values (
      ${row.flashcardId},
      ${userId},
      ${row.languageCode},
      ${row.targetText},
      ${JSON.stringify(row.phoneticReading)}::jsonb,
      ${JSON.stringify(row.definitions)}::jsonb,
      ${row.interval},
      ${row.repetition},
      ${row.easiness},
      now(),
      now()
    )
    on conflict ("user_id", "language_code", "target_text") do nothing
  `;
}

console.log(`Seeded ${rows.length} vocabulary cards for ${userId}.`);
