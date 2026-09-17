# Canopy

Canopy is a private Mandarin vocabulary workspace for English-speaking
learners. Bring in words you want to keep, review them on a gentle rhythm, and
use them in reading, conversation, voice, and low-stakes dictionary practice.

The beta supports Mandarin vocabulary with a learner-controlled Simplified or
Traditional display preference. It is not a Cantonese course or a fully offline
learning application.

## What is included

- A reviewed, editable import flow for Pleco-style UTF-8 text exports and
  manually added vocabulary.
- Private flashcards, archive/restore/delete controls, and a mobile-friendly
  scheduled review session.
- The Overstory for generated reading practice and the Understory for focused,
  turn-based text or voice conversation.
- Dictionary lookup, recent lookup history, contextual help, and optional
  Explore Chinese contrast practice that stays outside scheduled review until a
  learner adds a card.
- Learner defaults for proficiency, correction style, conversation goal,
  Chinese script, formality, playback speed, theme, and reading size.
- A home-screen-ready web app manifest for Safari's **Add to Home Screen** and
  other supported browsers. It launches into the authenticated workspace but
  does not promise offline private learning or AI practice.

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
- [Pleco export workflow](docs/pleco-import-workflow.md) describes the supported
  manual import path.
- `pinyin-pro` supports Mandarin readings, and `@node-rs/jieba` supports
  Chinese segmentation.

## Deployment notes

Run committed Drizzle migrations against the target Neon database before
deploying code that depends on a schema change. Use a dedicated OpenAI project
with usage alerts and a conservative enforced spend cap. Server-side AI rate
limiting is intentionally deferred until real beta activity justifies its
operational cost and configuration.
