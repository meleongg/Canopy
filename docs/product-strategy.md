# Product Strategy: Canopy

## 1. One-Liner & Value Proposition

- **One-Liner:** A cozy, habit-building vocabulary sandbox that turns in-context
  Mandarin discoveries into grounded flashcards, then into immersive reading and
  dialogue practice.
- **Target User:** The self-directed, intermediate-to-advanced Mandarin learner
  (English-speaking) who values authentic content over rigid curriculum.
- **Value Proposition:** Canopy eliminates the "lookup graveyard" by capturing
  vocabulary **inside the app**—with CC-CEDICT grounding and optional LLM
  context—then bridging passive saving to active mastery through generative AI
  "Harvests" (Stories & Chat) in a calm, aesthetic environment.

## 2. Problems & Positioning

- **Core Problems Solved:**

1. **The Lookup Graveyard:** Saving words in external tools or notes and never
   reviewing or integrating them into memory.
2. **Fragmented Capture:** Leaving the app to look up terms elsewhere and
   losing surrounding context breaks the learning loop.
3. **Clinical Burnout:** Traditional flashcard apps feel like robotic data entry,
   killing the emotional connection and curiosity required for language acquisition.
4. **Disconnected Learning:** Being trapped in "closed-garden" platforms that force
   pre-selected generic content instead of the learner’s own discoveries from
   media, lyrics, and real conversations.
5. **Copyright Exposure from Proprietary Dictionaries:** Bundling or redistributing
   third-party commercial dictionary text is out of bounds; Canopy uses CC-CEDICT
   for lexical grounding and original LLM text for contextual explanation.

- **Main Competitors:** Anki (too technical/clinical), Duolingo (too gamified/generic), LingQ/BaoBao (too cluttered/closed).
- **Our Differentiators:**
- **In-Context Capture:** Headword (≤8 Chinese characters) plus optional source
  context in one surface; inbound (decipher what you found) and outbound (how do
  I say this) modes.
- **Grounded Lexicon:** CC-CEDICT validates forms, readings, and standard glosses;
  the LLM never replaces the licensed baseline dictionary.
- **The "Harvest" Sandbox:** Moves beyond flashcards; uses selected words to
  generate custom-tailored reading material and interactive roleplay.
- **Cozy-First Design:** Prioritizes a grounding, aesthetic user experience that
  feels like a digital garden, not a data-entry workspace.

- **UI/UX & Branding Guide:**
- **Identity:** Botanical, grounded, patient. Geometric tree iconography.
- **Theme/Tokens:** Soft Linen (.light) & SlateNight (.dark).
- **Typography:** Merriweather (Headers), Plus Jakarta Sans (Data).
- **Layout:** Flat UI, rounded-lg/xl corners, minimalist linework.

## 3. Scope Controls

- **Core product loop:**

1. **Capture (Grove Add Card):** Editable draft with CC-CEDICT autofill and
   LLM inbound/outbound assist on the same panel. Confirm to save.
2. **The Grove Dashboard:** Central hub with a "Sprouting Queue" (lightweight SM-2 SRS) and "Cluster Picker" (check 3-7 words to activate content generation).
3. **The Overstory (Reading Sandbox):** Edge-runtime AI text streaming that weaves selected vocabulary into custom short stories.
4. **The Understory (Interactive Helper):** Interactive AI chat canvas for situational roleplay using selected vocabulary.

- **Explicitly Out of Scope:**
- External dictionary-app file sync, vocabulary file upload, or redistribution
  of proprietary dictionary databases.
- Advanced data analytics, charts, or gamified leaderboards.
- Social features or competitive ranking.
- Complex, multi-layered deck management/filtering.
- Automated push notification systems (focus on user-initiated "waterings").
- Non-Mandarin acquisition in the near term (private beta is Mandarin-only).
