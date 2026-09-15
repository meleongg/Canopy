import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.CANOPY_DEV_DB_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Set CANOPY_DEV_DB_URL or DATABASE_URL before backfilling script variants.",
  );
}

const sql = neon(databaseUrl);
const cards = await sql`
  select id, target_text
  from flashcards
  where (simplified_text is null or traditional_text is null)
    and language_code in ('zh-CN', 'zh-HK')
`;
let updated = 0;
for (const card of cards) {
  const matches = await sql`
    select dictionary_entries.id, dictionary_entries.simplified,
      dictionary_entries.traditional
    from dictionary_entries
    inner join dictionary_releases
      on dictionary_entries.release_id = dictionary_releases.id
    where dictionary_releases.is_active = true
      and (
        dictionary_entries.simplified = ${card.target_text}
        or dictionary_entries.traditional = ${card.target_text}
      )
  `;
  if (matches.length !== 1) continue;
  const match = matches[0];
  if (!match) continue;
  await sql`
    update flashcards
    set dictionary_entry_id = ${match.id},
      simplified_text = ${match.simplified},
      traditional_text = ${match.traditional}
    where id = ${card.id}
  `;
  updated += 1;
}

console.log(`Enriched ${updated} of ${cards.length} eligible Chinese cards.`);
