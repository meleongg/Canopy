# Canopy private beta

Canopy's beta finishes the personal learning loop: import vocabulary, review active cards, generate practice, and revisit completed practice privately.

## Delivery order

1. Protect every pull request with lint, TypeScript, and backend contract tests.
2. Give each learner ownership over their card lifecycle: personal overrides, archive, restore, and delete.
3. Save completed Overstory and five-turn Understory practice privately.
4. Complete a DESIGN.md-led UX hardening pass across every user-facing route: navigation, auth, dashboard, seed selection, generation, chat completion, history, empty states, and mobile affordances.
5. Add a private account settings area for profile, password, theme preference, and learner defaults such as import language; keep operational OpenAI and billing controls out of the learner-facing app.
6. Establish a reliable CC-CEDICT lookup foundation: use manually downloaded, version-pinned releases in a dedicated shared dictionary table, never learner vocabulary; retain provenance and CC BY-SA 4.0 attribution. Import a new release as a staged snapshot, atomically activate it only after validation, then clean up its predecessor. Do not infer unknown-word meanings solely from model output.
7. Migrate vocabulary content from globally shared `words` records into learner-owned `flashcards`: copy each card's language, text, reading, and definitions; enforce uniqueness by learner and term; update imports and reads; then remove `words`. This prevents one learner's import or edits from changing another learner's vocabulary.
8. Add contextual vocabulary assistance for generated Chinese: hover/focus pinyin and definitions for intentionally supported terms, plus a reviewed add-to-flashcard flow. When a term is already a learner's card, prefer that card's reading and definitions, label it as in their collection, and offer to open it rather than create a duplicate.
9. Add a dedicated, mobile-friendly review session: the Dashboard becomes a compact launchpad and reference surface, while a focused route presents one due card at a time with progress, ratings, and a clear exit path.
10. Refine the Dashboard after review is separated: keep it a compact learning launchpad with the due count, Start review, and at most five compact due-card previews. Keep periodic import/manual card creation clearly available as a secondary acquisition flow. Replace the current creation-only Consistency Well with a gentle seven-day learning-rhythm view based on meaningful review and completed practice activity; do not add streak-loss mechanics, leaderboards, or advanced analytics.
11. Add a dedicated Collection view in a separate PR: move complete active/archived vocabulary browsing out of Dashboard, use compact expandable rows, and provide server-backed search, filters, and pagination so large collections remain manageable. Preserve personal card edit, archive/restore, deletion, and context actions there.
12. Add Privacy Policy and Terms pages with a public-surface cleanup PR: simplify the Landing page footer to the Canopy value line and relevant legal links, remove redundant learning-area labels, and remove the marketing footer from authenticated app routes.
13. Add optional Free practice as a separate, clearly labelled session alongside formal review: let the learner choose a small number of active cards for recall and answer reveal without changing next-review dates, intervals, or other scheduling state. It must not call the formal review mutation or imply that its controls affect the learner's review rhythm.
14. Investigate a Pleco acquisition workflow before building automation: validate the user-exported UTF-8 text/category flow, then determine whether a user-authorized cloud-folder import is worthwhile. Do not assume Pleco provides a server API, webhook, or unattended recent-search export.
15. Deploy to Vercel + Neon with a dedicated OpenAI project, usage alerts, and a conservative enforced spend cap.

Decks, analytics, social features, and push notifications remain out of scope for the private beta.

## Nice-to-have after beta activity justifies it

Add server-side AI rate limiting (for example, a dedicated Redis/Valkey store or
Vercel WAF rule) after observing enough real activity to justify the operational
cost and configuration. It must use Canopy-isolated credentials; do not share a
database token with another project.

Refine practice history when saved-session volume justifies it: add All,
Overstory, and Understory filters with scoped empty states, then introduce
pagination or a load-more control rather than expanding the initial 60-session
list indefinitely.
