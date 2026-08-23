# Canopy private beta

Canopy's beta finishes the personal learning loop: import vocabulary, review active cards, generate practice, and revisit completed practice privately.

## Completed

The following roadmap items have been delivered and verified:

1. Pull-request validation (`npm run validate`) and approval guidance.
2. Learner-owned card lifecycle: overrides, archive, restore, and deletion.
3. Private completed Overstory and Understory history.
4. DESIGN.md-led UX hardening across the private beta experience.
5. Private account settings and learner defaults.
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

Decks, analytics, social features, and push notifications remain out of scope for the private beta.

## Nice-to-have after beta activity justifies it

Explore dictionary-backed discovery features using the shared CC-CEDICT lookup
data without turning its full corpus into learner cards or scheduled review:

- A dedicated dictionary explorer with Simplified, Traditional, pinyin, and
  English-gloss search plus an explicit add-to-collection action.
- Optional contextual discovery around terms a learner already studies, such as
  exact compounds containing a shared character; clearly label this as
  exploration rather than a semantic or curriculum recommendation.
- Pinyin and tone contrast practice, Traditional/Simplified recognition, and
  sense-selection exercises that remain outside the learner's formal review
  rhythm until they choose to add a card.
- Personal lookup history and a separate, curated “Explore Chinese” practice
  mode with deliberate topic/level filters rather than a random draw from the
  whole dictionary.
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

Refine practice history when saved-session volume justifies it: add All,
Overstory, and Understory filters with scoped empty states, then introduce
pagination or a load-more control rather than expanding the initial 60-session
list indefinitely.
