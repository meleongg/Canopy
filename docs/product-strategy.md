# Product Strategy: Canopy

## 1. One-Liner & Value Proposition

- **One-Liner:** A cozy, habit-building vocabulary sandbox that transforms your personal dictionary lookups into immersive reading and dialogue practice.
- **Target User:** The self-directed, intermediate-to-advanced language learner (Mandarin/Cantonese) who values authentic content over rigid curriculum.
- **Value Proposition:** Canopy eliminates the "lookup graveyard" by turning static dictionary lists into living, personalized content. It bridges the gap between passive saving and active mastery through generative AI "Harvests" (Stories & Chat), offering a calm, aesthetic environment that rewards consistency over repetitive drilling.

## 2. Problems & Positioning

- **Core Problems Solved:**

1. **The Lookup Graveyard:** Saving words from Pleco/mobile apps but never actually reviewing or integrating them into memory.
2. **Clinical Burnout:** Traditional flashcard apps feel like robotic data entry, killing the emotional connection and curiosity required for language acquisition.
3. **Disconnected Learning:** Being trapped in "closed-garden" platforms that force you to study pre-selected generic content instead of your own discoveries.

- **Main Competitors:** Anki (too technical/clinical), Duolingo (too gamified/generic), LingQ/BaoBao (too cluttered/closed).
- **Our Differentiators:**
- **Agnostic Ingestion:** Accepts flexible text/dictionary logs rather than forcing a proprietary file format.
- **The "Harvest" Sandbox:** Moves beyond flashcards; uses selected words to generate custom-tailored reading material and interactive roleplay.
- **Cozy-First Design:** Prioritizes a grounding, aesthetic user experience that feels like a digital garden, not a data-entry workspace.

- **UI/UX & Branding Guide:**
- **Identity:** Botanical, grounded, patient. Geometric tree iconography.
- **Theme/Tokens:** Soft Linen (.light) & SlateNight (.dark).
- **Typography:** Merriweather (Headers), Plus Jakarta Sans (Data).
- **Layout:** Flat UI, rounded-lg/xl corners, minimalist linework.

## 3. Scope Controls

- **Core MVP Features:**

1. **Ingestion Drop-Zone:** Smart server-side parser for Pleco/tab-separated logs with atomic upsert (deduplication).
2. **The Grove Dashboard:** Central hub with a "Sprouting Queue" (lightweight SM-2 SRS) and "Cluster Picker" (check 3-7 words to activate content generation).
3. **The Overstory (Reading Sandbox):** Edge-runtime AI text streaming that weaves selected vocabulary into custom short stories.
4. **The Understory (Interactive Helper):** A 3-turn interactive AI chat canvas for situational roleplay using selected vocabulary.

- **Explicitly Out of Scope:**
- Advanced data analytics, charts, or gamified leaderboards.
- Social features or competitive ranking.
- Complex, multi-layered deck management/filtering.
- Automated push notification systems (focus on user-initiated "waterings").
