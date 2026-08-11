# Canopy private beta

Canopy's beta finishes the personal learning loop: import vocabulary, review active cards, generate practice, and revisit completed practice privately.

## Delivery order

1. Protect every pull request with lint, TypeScript, and backend contract tests.
2. Give each learner ownership over their card lifecycle: personal overrides, archive, restore, and delete.
3. Save completed Overstory and five-turn Understory practice privately.
4. Complete a DESIGN.md-led UX hardening pass across every user-facing route: navigation, auth, dashboard, seed selection, generation, chat completion, history, empty states, and mobile affordances.
5. Add a private account settings area for profile, password, theme preference, and learner defaults such as import language; keep operational OpenAI and billing controls out of the learner-facing app.
6. Add contextual vocabulary assistance for generated Chinese: hover/focus pinyin and definitions for intentionally supported terms, plus a reviewed add-to-flashcard flow. Define the reliable lookup/source contract before implementation; do not infer unknown-word meanings solely from model output.
7. Add a dedicated, mobile-friendly review session: the Dashboard becomes a compact launchpad and reference surface, while a focused route presents one due card at a time with progress, ratings, and a clear exit path.
8. Refine Dashboard collection browsing after review is separated: use compact active/archived card rows with expandable details, and keep periodic import/manual card creation in a clearly available secondary acquisition flow rather than a permanent equal column. Replace the current creation-only Consistency Well with a gentle seven-day learning-rhythm view based on meaningful review and completed practice activity; do not add streak-loss mechanics, leaderboards, or advanced analytics.
9. Add optional Free practice as a separate, clearly labelled session alongside formal review: let the learner choose a small number of active cards for recall and answer reveal without changing next-review dates, intervals, or other scheduling state. It must not call the formal review mutation or imply that its controls affect the learner's review rhythm.
10. Investigate a Pleco acquisition workflow before building automation: validate the user-exported UTF-8 text/category flow, then determine whether a user-authorized cloud-folder import is worthwhile. Do not assume Pleco provides a server API, webhook, or unattended recent-search export.
11. Deploy to Vercel + Neon with a dedicated OpenAI project, usage alerts, and a conservative enforced spend cap.

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
