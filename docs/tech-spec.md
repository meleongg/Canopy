# Technical Spec: Canopy MVP

## 1. Architecture

Canopy is a Next.js 16 App Router application with TypeScript, Better Auth, Neon PostgreSQL through Drizzle ORM, and TanStack Query v5 for client-side server-state caching. Protected pages and API routes resolve the authenticated Better Auth user; no application route may read or mutate another user’s vocabulary.

The application uses a normalized vocabulary model rather than duplicating word data for every learner. `words` stores shared linguistic data. `flashcards` stores each learner’s scheduling and saved context for a word. This permits an individual learner’s review state to remain private while preserving a single canonical spelling, reading, and definition set.

## 2. Data Schema

Better Auth owns the `user`, `session`, `account`, and `verification` tables. Its string user IDs are the foreign-key type used by application tables.

```ts
export const words = pgTable(
  "words",
  {
    id: text("id").primaryKey(),
    languageCode: text("language_code").notNull(),
    targetText: text("target_text").notNull(),
    phoneticReading: jsonb("phonetic_reading").$type<string[]>().notNull(),
    definitions: jsonb("definitions").$type<string[]>().notNull(),
    linguisticMeta: jsonb("linguistic_meta").$type<{
      alternatives?: string[];
      partOfSpeech?: string[];
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("word_lang_target_idx").on(
      table.languageCode,
      table.targetText,
    ),
  ],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
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
    uniqueIndex("flashcard_user_word_idx").on(table.userId, table.wordId),
    index("user_review_queue_idx").on(table.userId, table.nextReviewAt),
  ],
);
```

`ai_sessions` is retained for persisted AI-session history. It has a `userId`, `sessionType` (`story_sandbox` or `helper_chat`), `languageCode`, selected word IDs, and structured story or message content.

## 3. MVP Capabilities

### Grove: ingestion and review

`POST /api/cards/import`

- Payload: `{ rawText: string, languageCode: "zh-CN" | "zh-HK" | "fr-FR" | "und" }`
- Response: `{ importedCount: number, updatedCount: number }`
- Requires authentication.
- Parses tab-separated, CSV-like, and Pleco-style rows. It skips blank/comment rows, normalizes Unicode, removes control characters and bracketed parsing syntax from persisted fields, and deduplicates in the request.
- **Atomic persistence:** Parse and validate the complete payload before opening a transaction. Then upsert vocabulary by `(languageCode, targetText)` and cards by `(userId, wordId)` in one database transaction. If any write fails, roll back the entire import and return an error; never leave a partial batch of words or flashcards. Keep the transaction limited to database writes so parsing and phonetic segmentation do not hold locks.

`POST /api/cards/review`

- Payload: `{ cardId: string, rating: 2 | 3 | 4 | 5 }`
- Response: `{ success: true, nextReviewAt: string }`
- Requires authentication and ownership of the card.
- Applies SM-2 scheduling. A rating below 3 resets repetition and schedules the card for tomorrow; successful repetitions schedule at 1 day, 6 days, then the EF-derived interval.

`GET /api/cards` returns only the requesting user’s serialized cards. `POST /api/import-preview` parses input for the editable dashboard preview before it is persisted.

The `/dashboard` Grove uses the Linen/Slate Night canvas, a paste and file drop-zone, editable import preview, manual add form, Sprouting Queue, tactile `2`, `3`, `4`, and check-mark review controls, and a compact consistency summary.

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
- The route permits exactly three learner turns. A fourth turn is rejected to bound cost and runtime.

`/understory/setup` selects 1–7 cards, Bramble or Mossy, and a scenario. `/understory/chat` renders the Root Canvas conversation with the active botanical companion.

## 4. Interface Rules

Follow `DESIGN.md` exactly: Merriweather for display text, Plus Jakarta Sans for UI text, border-defined Linen panels in light mode and Forest Deep panels in dark mode. Use the documented Moss/Clay/Sage tokens; do not add heavy shadows or unrelated accent colors. Keep primary interactive targets comfortably touch-sized.

## 5. Verification

Before merge, run `npm run lint && npx tsc --noEmit`, then `npm run test`. Endpoint tests must cover malformed imports, repeated imports, rollback on a failed multi-row import, card ownership, SM-2 rating updates, 3–7 story limits, moderation rejection, and the three-turn chat limit.

## 6. Private beta extensions

Cards remain private to the authenticated learner. `PATCH /api/cards/:cardId`
updates that learner's personal display overrides or archive state; it never mutates
the shared `words` row. `DELETE /api/cards/:cardId` removes only that learner's
flashcard. Archived cards do not appear in review queues or AI seed selection.

Completed Overstory stories and completed three-turn Understory rounds are saved
to `ai_sessions` with a vocabulary snapshot. `GET /api/sessions` and
`DELETE /api/sessions/:sessionId` are owner-scoped. The private beta uses a
dedicated OpenAI project with usage alerts and a conservative enforced spend cap.
Server-side AI rate limiting is deferred until beta activity justifies it; if
added, it must use Canopy-isolated credentials.
