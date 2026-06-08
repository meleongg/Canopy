import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.CANOPY_DEV_DB_URL;

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL or CANOPY_DEV_DB_URL before clearing seed data.",
  );
}

const sql = neon(databaseUrl);
const userId = "local-canopy-user";
const wordIds = ["seed-word-ying-gai", "seed-word-fu-jin", "seed-word-pai-dui"];

await sql`delete from "ai_sessions" where "user_id" = ${userId}`;
await sql`delete from "flashcards" where "user_id" = ${userId}`;
for (const wordId of wordIds) {
  await sql`delete from "words" where "id" = ${wordId}`;
}
await sql`delete from "session" where "user_id" = ${userId}`;
await sql`delete from "account" where "user_id" = ${userId}`;
await sql`delete from "user" where "id" = ${userId}`;

console.log(`Cleared seed data for ${userId}.`);
