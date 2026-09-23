# Canopy private beta

Canopy remains a private Mandarin vocabulary workspace: capture words you care
about, review them on a gentle rhythm, and use them in reading, conversation,
voice, and low-stakes dictionary practice. Acquisition is pivoting away from
Pleco exports, file upload, and batch text import toward an in-app vocabulary
engine:

**In-Context Capture → Grounded Verification (CC-CEDICT) → Flashcard Save → Spaced Repetition Review**

Overstory, Understory, review, collection, and Explore Chinese stay. Pleco
integration, manual `.txt` export import / upload, and static third-party
dictionary sync workflows are deprecated and will be removed in PR A below.

## Completed

The following roadmap items have been delivered and verified:

1. Pull-request validation (`npm run validate`) and approval guidance.
2. Learner-owned card lifecycle: overrides, archive, restore, and deletion.
3. Private completed Overstory and Understory history.
4. DESIGN.md-led UX hardening across the private beta experience.
5. Private account settings and learner defaults, including theme and reading
   size preferences.
6. Version-pinned CC-CEDICT import, provenance, attribution, and staged release activation.
7. Learner-owned flashcard vocabulary storage.
8. Contextual dictionary assistance with a reviewed add-to-collection flow.
9. Dedicated mobile-friendly review sessions.
10. Compact Dashboard and gentle seven-day learning rhythm.
11. Public Privacy and Terms pages plus authenticated-surface cleanup.
12. Optional Free practice that does not affect scheduling.
13. ~~Validated manual Pleco UTF-8 export workflow; cloud-folder automation is deferred.~~
    **Removed — batch Pleco/upload import deleted in PR A.**
14. Dedicated Collection view with server-backed full-text search, active/archived browsing, pagination, personal card management, and context actions.
15. Production deployment checklist verified in Vercel, Neon, and the dedicated OpenAI project, including migrations, usage alerts, and a conservative enforced spend cap.
16. Stable shared Dictionary Help with per-round caching and configurable highlight density.
17. A shared, developer-owned Understory conversation-duration constant that
    governs generation limits, progress, and completion UI.
18. Optional text-to-speech playback for completed Understory and Overstory
    text, with local speed controls and dictionary-term pronunciation.
19. Private practice history filters, cursor pagination, and client-side page
    caching.
20. Dedicated dictionary explorer with ranked Simplified, Traditional, pinyin,
    and English-gloss search, explicit collection adds, and indexed English
    lookup.
21. Contextual shared-character discovery from recent active cards, clearly
    labeled as exploration, plus Dictionary Help for learner-authored Understory
    replies.
22. Private recent dictionary lookup history with deliberate replay and clear
    controls.
23. Optional Understory speech-to-text input with an editable transcript before
    a learner sends a reply, using an authenticated transcription service rather
    than browser-provided recognition.
24. Optional turn-based Understory live voice selected during setup, with
    microphone guidance, editable transcripts, automatic companion playback when
    supported, and typed chat as a reliable fallback.
25. Learner-owned practice preferences for proficiency, correction style,
    conversation goal, Chinese script, formality, and default voice speed,
    applied to Understory and Overstory generation while keeping per-reply
    playback controls.
26. Short, skippable new-learner onboarding that establishes practice defaults
    before the first dashboard visit.
27. Dictionary-backed Simplified/Traditional card variants with a single review
    record, reactive card display preferences, and a conservative enrichment
    path for existing Chinese cards.
28. Optional Explore Chinese pinyin matching and Simplified/Traditional
    recognition practice, sourced from the active dictionary and kept outside
    scheduled review until a learner explicitly adds a card.
29. Installable home-screen launch support with standalone display, Apple
    metadata, purpose-appropriate icons, and authenticated entry points; it
    does not promise fully offline learning.

Decks, analytics, social features, and push notifications remain out of scope for the private beta.

## Next up — acquisition pivot (execute in order)

Product decisions locked for this sequence:

- Mandarin-only acquisition for now.
- Hard-remove Pleco, upload, and batch import (no soft-deprecate, no paste-list importer).
- Shared CEDICT autofill helpers across Dashboard Add Card and Dictionary explorer add.
- Match → editable draft → learner confirms Save.
- Phrase-first headword capped at **8 Chinese characters**; looser limits for
  optional source/context text and outbound English intent. Soft, non-blocking
  help when the whole string has no solid CEDICT match (suggest splitting;
  do not auto-create multiple cards in PR B).
- Inbound/outbound share one capture panel with a mode toggle (UI polish in PR C).
- New card-draft API for LLM capture; do not overload collection `generateContext`.
- CEDICT owns pinyin + standard gloss when matched; LLM owns contextual meaning
  + example/source. Keep existing flashcard columns; add columns only if necessary.

### PR A — Remove Pleco / upload / batch import ✅

Hard-remove the import acquisition path and all Pleco-facing product copy,
including associated tests. Do not soft-deprecate.

Completed in this change:

- Dashboard Import UI, upload/drop-zone, and import/add mode toggle removed;
  Add Card remains the acquisition entry point.
- `POST /api/import-preview`, `POST /api/cards/import`, and Pleco/list parsers
  removed; manual add uses `buildManualVocabularyEntry`.
- Import/Pleco tests removed or replaced with manual-entry coverage.
- Settings/onboarding no longer expose multi-language import controls;
  Mandarin-only acquisition for the private beta.
- Learner DB was already cleaned; no data backfill required.

### PR B — Easy Add Flashcard + CC-CEDICT autofill

Make capture the easiest path into the collection.

- As the learner types or pastes a Mandarin headword/phrase (≤8 characters) or
  uses English-gloss search where supported, rank active CC-CEDICT matches and
  fill reading + standard glosses into an **editable draft**.
- Exact phrase misses: keep the learner’s phrase as `targetText`, optionally
  surface component/token matches, show soft split help, never block save.
- Share grounding helpers with Dictionary explorer “add to collection”.
- Logical contract mapped onto existing columns (no rename migration):
  - `targetText` ← headword
  - `phoneticReading` ← grounded pinyin when CEDICT matches
  - `definitions` ← standard CEDICT glosses
  - `aiExampleContext` / context fields ← contextual note + source sentence
    (manual in this PR; LLM fill in PR C)
  - optional audio remains out of band / existing TTS paths

### PR C — LLM in-context translation (UI details TBD)

Add inbound and outbound capture modes on the same panel (mode toggle), reusing
the dedicated OpenAI project.

1. **Inbound:** target word/phrase + surrounding context → LLM explains meaning
   in that context → CC-CEDICT grounds headword when matched → confirm save.
2. **Outbound:** English communicative intent → 1–2 natural Mandarin options by
   register → isolate headword → CC-CEDICT verifies → confirm save.

Invariants: no proprietary dictionary text; new card-draft API; CEDICT for
lexical fields when matched; LLM for original contextual explanations/examples.
Exact control layout and microcopy are a design concern inside this PR—keep the
panel intuitive and low-friction.

## Nice-to-have after beta activity justifies it

Explore dictionary-backed discovery features using the shared CC-CEDICT lookup
data without turning its full corpus into learner cards or scheduled review:

- Tone contrast and sense-selection exercises that remain outside the
  learner's formal review rhythm until they choose to add a card.
- A separate, curated “Explore Chinese” practice mode with deliberate
  topic/level filters rather than a random draw from the whole dictionary.
- A separate, graph-style vocabulary map is deferred until Canopy has richer,
  typed relationship data than literal shared characters; it should be a
  dedicated exploration page with its own mobile interaction design.
- Dictionary-backed hints for learner-authored Chinese in Understory, with
  concise readings and definitions rather than unverified model-invented
  meanings.
- Optional multi-card split from a long phrase after the learner accepts a
  suggested segmentation (not auto-split in PR B).

CC-CEDICT supplies forms, readings, and English glosses. Frequency, level,
semantic relationships, and example sentences require a separate reliable
source or carefully constrained generation before they can drive recommendations.

Add server-side AI rate limiting (for example, a dedicated Redis/Valkey store or
Vercel WAF rule) after observing enough real activity to justify the operational
cost and configuration. It must use Canopy-isolated credentials; do not share a
database token with another project.
