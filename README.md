# Canopy

Canopy is a language-agnostic vocabulary scratchpad and AI dialogue sandbox built with Next.js 16, Drizzle, Neon, Better Auth, Tailwind CSS, and the Vercel AI SDK.

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

## Linguistic Processing

- **Linguistic Processing (Pure JS / Pre-compiled Ecosystem):**
  - _Mandarin:_ **`pinyin-pro`** (Accurately parses characters, polyphonic nuances, and tone markers natively on the server side).
  - _Cantonese:_ **`to-jyutping`** (Extracts reliable, numerical Jyutping structures).
  - _Tokenization:_ **`@node-rs/jieba`** (High-velocity Rust N-API tokenizer to segment multi-character vocabulary boundaries cleanly with zero local build toolchain requirements).

## Validation

```bash
npm run lint
npm run build
```
