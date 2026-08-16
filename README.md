# Canopy

Canopy is a language-agnostic vocabulary workspace built around The Sprouting Queue, The Overstory Sandbox, and The Understory Chat.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app does not create local `.env` files. Runtime configuration is validated through `db/env.ts` and expects these deployment variables:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` with a fallback of `http://localhost:3000`

For the Vercel private beta, configure the same values in Preview and Production
and keep OpenAI credentials server-only. Apply committed Drizzle migrations to
the target Neon database before deploying code that depends on them:

```bash
DATABASE_URL="$CANOPY_PROD_DB_URL" npm run db:migrate
```

Use `npm run db:push` only for an intentional direct schema sync, such as local
development; it does not provide the versioned deployment history of
`db:migrate`. Use a dedicated OpenAI project with usage alerts and a
conservative enforced spend cap. Server-side rate limiting is intentionally
deferred until real beta activity justifies it.

### Adopting an older local database

If a development database was created with `db:push` before migrations were
tracked, do not run `db:push` again once data migrations exist. First run the
one-time adoption command, which verifies the old baseline schema before
recording only migrations it already reflects, then apply pending migrations:

```bash
npm run db:adopt-baseline
npm run db:migrate
```

The adoption command stops if migration history already exists or the expected
baseline columns are absent. It does not apply new migrations itself.

## Linguistic Processing

- **Linguistic Processing (Pure JS / Pre-compiled Ecosystem):**
  - _Mandarin:_ **`pinyin-pro`** (Accurately parses characters, polyphonic nuances, and tone markers natively on the server side).
  - _Cantonese:_ **`to-jyutping`** (Extracts reliable, numerical Jyutping structures).
  - _Tokenization:_ **`@node-rs/jieba`** (High-velocity Rust N-API tokenizer to segment multi-character vocabulary boundaries cleanly with zero local build toolchain requirements).

## Validation

```bash
npm run validate
```

Run this before opening or updating a pull request. It runs linting, strict
TypeScript checks, and the unit test suite in order.
