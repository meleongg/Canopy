# Technical Spec: Canopy MVP

## 1. Architecture

Canopy is a Next.js 16 App Router application with TypeScript, Better Auth, Neon PostgreSQL through Drizzle ORM, and TanStack Query v5 for client-side server-state caching. Protected pages and API routes resolve the authenticated Better Auth user; no application route may read or mutate another user’s vocabulary.

Vocabulary cards are owned by the learner. Each `flashcards` row stores its own
language, text, reading, definitions, optional linguistic metadata, scheduling,
and saved context. This prevents one learner’s edits from changing another
learner’s vocabulary.

Shared CC-CEDICT data lives in `dictionary_releases` / `dictionary_entries` and
is never treated as a bulk learner-card import. Acquisition is in-app Mandarin
capture with optional CEDICT grounding and (planned) LLM contextual assist—not
file upload or batch import from external dictionary apps.

## 2. Data Schema

Better Auth owns the `user`, `session`, `account`, and `verification` tables. Its string user IDs are the foreign-key type used by application tables.

```ts
export const flashcards = pgTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull(),
    targetText: text("target_text").notNull(),
    phoneticReading: jsonb("phonetic_reading").$type<string[]>().notNull(),
    definitions: jsonb("definitions").$type<string[]>().notNull(),
    linguisticMeta: jsonb("linguistic_meta").$type<{
      alternatives?: string[];
      partOfSpeech?: string[];
    }>(),
    interval: integer("interval").default(0).notNull(),
    repetition: integer("repetition").default(0).notNull(),
    easiness: integer("easiness").default(250).notNull(), // 250 = SM-2 EF 2.50
    aiExampleContext: jsonb("ai_example_context").$type<
      ExampleContext[] | ExampleContext
    >(),
    nextReviewAt: timestamp("next_review_at").defaultNow().notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flashcard_user_term_idx").on(
      table.userId,
      table.languageCode,
      table.targetText,
    ),
    index("user_review_queue_idx").on(table.userId, table.nextReviewAt),
  ],
);
```

### Logical capture contract (column mapping)

Product language may describe a capture schema. Prefer mapping onto existing
columns; add new columns only when mapping is insufficient:

| Logical field | Storage |
| --- | --- |
| `headword` | `targetText` (≤8 Chinese characters for new capture; script display follows learner Simplified/Traditional preference) |
| `pinyin` | `phoneticReading` (prefer CC-CEDICT when matched) |
| `definition_cedict` | `definitions` (standard glosses from the active release) |
| `contextual_meaning` | `aiExampleContext` / context payload (LLM or learner note) |
| `source_sentence` | same context payload (where the learner found it, or generated example) |
| `audio_url` | optional / synthesized elsewhere; not required to save |

`ai_sessions` is retained for persisted AI-session history. It has a `userId`, `sessionType` (`story_sandbox` or `helper_chat`), `languageCode`, selected word IDs, and structured story or message content.

## 3. MVP Capabilities

### Grove: capture and review

Learner vocabulary enters the collection through **Add Card** (and Dictionary
explorer add-to-collection), not through batch file upload or external
dictionary export import.

**Removed:** `POST /api/cards/import`, `POST /api/import-preview`, Pleco/list
parsers, upload/drop-zone import UI, and their tests. Do not rebuild them.

**Current / near-term capture:**

- Manual Add Card creates one learner-owned Mandarin flashcard with editable
  headword, reading, definitions, and optional context.
- Planned (PR B): CC-CEDICT autofill into an editable draft before save; shared
  helpers with Dictionary explorer add.
- Planned (PR C): LLM inbound/outbound card-draft assist on the same panel
  (mode toggle), grounded by CC-CEDICT via a dedicated draft API.

`POST /api/cards/review`

- Payload: `{ cardId: string, rating: 2 | 3 | 4 | 5 }`
- Response: `{ success: true, nextReviewAt: string }`
- Requires authentication and ownership of the card.
- Applies SM-2 scheduling. A rating below 3 resets repetition and schedules the card for tomorrow; successful repetitions schedule at 1 day, 6 days, then the EF-derived interval.

`GET /api/cards` returns only the requesting user’s serialized cards.

The `/dashboard` Grove uses the Linen/Slate Night canvas, Add Card capture,
Sprouting Queue, tactile `2`, `3`, `4`, and check-mark review controls, and a
compact consistency summary.

### Legal and grounding invariants

- Use CC-CEDICT (CC BY-SA 4.0) for baseline lexical definitions and readings.
- Use the LLM only for original contextual explanations and example sentences.
- Never scrape, ingest, store, or redistribute proprietary dictionary databases
  or commercial dictionary export files as Canopy source material.

### Overstory: reading sandbox

`POST /api/generate-sandbox` runs on the Edge runtime.

- Payload: `{ cardIds: string[] }`, with 3–7 UUIDs.
- Response: a raw Unicode text stream.
- Requires authentication. The route loads selected cards from the database under the requesting user, rejecting unknown or foreign IDs.
- The story prompt requires every selected target word exactly once. Temperature is `0.3`; selected terms are moderated before generation.

`/overstory` supplies the 3–7 seed picker and a centered reader. Terms in the streamed story are highlighted and expose reading and definition metadata through hover/focus tooltips.

### Understory: dialogue helper

`POST /api/generate-chat` runs on the Edge runtime.

- Payload: `{ cardIds: string[], persona: "bramble" | "mossy", scenario: string, messageHistory: { role: "user" | "assistant", content: string }[] }`
- Response: a raw streaming reply.
- Requires authentication and server-side ownership checks for all selected cards.
- The latest learner message is sent to OpenAI Moderation before it reaches the generation model. Flagged content receives an inline-safe error response.
- The route permits exactly five learner turns. A sixth turn is rejected to
  bound cost and runtime. The assistant opens the round with the first question;
  the selected scenario and vocabulary remain visible in the client.

`/understory/setup` selects 1–7 cards, Bramble or Mossy, and a scenario. `/understory/chat` renders the Root Canvas conversation with the active botanical companion.

## 4. Interface Rules

Follow `DESIGN.md` exactly: Merriweather for display text, Plus Jakarta Sans for UI text, border-defined Linen panels in light mode and Forest Deep panels in dark mode. Use the documented Moss/Clay/Sage tokens; do not add heavy shadows or unrelated accent colors. Keep primary interactive targets comfortably touch-sized.

## 5. Verification

Before merge, run `npm run validate` (lint, TypeScript, and unit tests). Endpoint
tests must cover card ownership, SM-2 rating updates, 3–7 story limits,
moderation rejection, and the five-turn chat limit. Import/Pleco parser and
upload tests are gone; cover CEDICT autofill and (later) card-draft API tests
as those land.

## 6. Private beta extensions

Cards remain private to the authenticated learner. `PATCH /api/cards/:cardId`
updates that learner's card content or archive state. `DELETE /api/cards/:cardId`
removes only that learner's flashcard. Archived cards do not appear in review
queues or AI seed selection.

Completed Overstory stories and completed five-turn Understory rounds are saved
to `ai_sessions` with a vocabulary snapshot. `GET /api/sessions` and
`DELETE /api/sessions/:sessionId` are owner-scoped. The private beta uses a
dedicated OpenAI project with usage alerts and a conservative enforced spend cap.
Server-side AI rate limiting is deferred until beta activity justifies it; if
added, it must use Canopy-isolated credentials.
