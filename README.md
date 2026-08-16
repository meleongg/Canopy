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

For the Vercel private beta, configure the same values in Preview and Production,
run `npm run db:push` against the target Neon database before deployment, and keep
OpenAI credentials server-only. Use a dedicated OpenAI project with usage alerts
and a conservative enforced spend cap. Server-side rate limiting is intentionally
deferred until real beta activity justifies it.

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
