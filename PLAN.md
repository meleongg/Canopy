# Canopy private beta

Canopy's beta finishes the personal learning loop: import vocabulary, review active cards, generate practice, and revisit completed practice privately.

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
13. Validated manual Pleco UTF-8 export workflow; cloud-folder automation is deferred.
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
    path for existing and manually imported Chinese cards.
28. Optional Explore Chinese pinyin matching and Simplified/Traditional
    recognition practice, sourced from the active dictionary and kept outside
    scheduled review until a learner explicitly adds a card.

Decks, analytics, social features, and push notifications remain out of scope for the private beta.

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

CC-CEDICT supplies forms, readings, and English glosses. Frequency, level,
semantic relationships, and example sentences require a separate reliable
source or carefully constrained generation before they can drive recommendations.

Add server-side AI rate limiting (for example, a dedicated Redis/Valkey store or
Vercel WAF rule) after observing enough real activity to justify the operational
cost and configuration. It must use Canopy-isolated credentials; do not share a
database token with another project.
