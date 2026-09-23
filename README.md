# Canopy

Canopy is a private Mandarin vocabulary workspace for English-speaking
learners. Capture words in context, review them on a gentle rhythm, and use
them in reading, conversation, voice, and low-stakes dictionary practice.

The beta is Mandarin-only, with a learner-controlled Simplified or Traditional
display preference. It is not a Cantonese course or a fully offline learning
application.

## What's built

- **Add Card** — Mandarin capture with CC-CEDICT autofill and optional LLM
  inbound (“from context”) / outbound (“how do I say…”) draft assist; editable
  draft, then confirm to save
- **Collection & review** — private flashcards with archive/restore/delete,
  full-text search, and mobile-friendly SM-2 review
- **Overstory & Understory** — generated reading practice and turn-based text
  or voice conversation seeded from the learner’s own cards
- **Dictionary & Explore** — lookup, recent history, contextual help, and
  optional contrast practice that stays outside scheduled review until a card
  is added
- **Preferences & shell** — practice defaults, theme/reading size, onboarding,
  Privacy/Terms/Attributions, and home-screen install support (not offline AI)

## What could be next

Optional after real beta usage justifies the work:

- Tone-contrast or sense-selection exercises outside formal review
- Curated Explore topics/levels (not a random draw from the whole dictionary)
- Multi-card split from a long phrase after the learner accepts segmentation
- Richer vocabulary-relationship exploration (beyond shared characters)
- Stronger dictionary hints on learner-authored Understory replies
- Server-side AI rate limiting once traffic warrants it

Out of scope for now: social features, analytics leaderboards, complex deck
management, and push notifications.

## Local development

Install dependencies:

```bash
npm install
```

Make the following values available to local commands. For Next.js development,
an ignored `.env` file is convenient; it must never be committed. Agents working
in this repository do not read `.env` files.

```dotenv
CANOPY_DEV_DB_URL="https://…"
CANOPY_DEV_OPENAI_KEY="…"
CANOPY_DEV_AUTH_SECRET="at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
```

The `CANOPY_DEV_*` values take precedence locally. For Vercel Preview and
Production, configure `DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`,
and `BETTER_AUTH_URL`; keep OpenAI credentials server-only.

Apply migrations to a new or current development database, then start the app:

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If a development database predates tracked migrations, use the one-time
baseline adoption command before applying pending migrations:

```bash
npm run db:adopt-baseline
npm run db:migrate
```

`db:adopt-baseline` verifies the old schema before recording only the migration
history it already reflects. It stops if history already exists or the expected
baseline is absent. Use `npm run db:push` only for an intentional direct local
schema sync; it is not a substitute for versioned deployment migrations.

## Validation

```bash
npm run validate
```

This runs linting, strict TypeScript checks, and the unit suite. Run it before
opening or updating a pull request.

## Data and linguistic sources

- [CC-CEDICT lookup data](docs/cc-cedict.md) supplies shared Chinese forms,
  readings, and English glosses. It remains separate from learner-owned cards.
- `pinyin-pro` supports Mandarin readings, and `@node-rs/jieba` supports
  Chinese segmentation.
- Product and technical detail: [docs/product-strategy.md](docs/product-strategy.md),
  [docs/tech-spec.md](docs/tech-spec.md).

## Deployment notes

Run committed Drizzle migrations against the target Neon database before
deploying code that depends on a schema change. Use a dedicated OpenAI project
with usage alerts and a conservative enforced spend cap. Server-side AI rate
limiting is intentionally deferred until real beta activity justifies its
operational cost and configuration.
