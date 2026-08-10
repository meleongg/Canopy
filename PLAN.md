# Canopy private beta

Canopy's beta finishes the personal learning loop: import vocabulary, review active cards, generate practice, and revisit completed practice privately.

## Delivery order

1. Protect every pull request with lint, TypeScript, and backend contract tests.
2. Give each learner ownership over their card lifecycle: personal overrides, archive, restore, and delete.
3. Save completed Overstory and five-turn Understory practice privately.
4. Complete a DESIGN.md-led UX hardening pass across every user-facing route: navigation, auth, dashboard, seed selection, generation, chat completion, history, empty states, and mobile affordances.
5. Add a private account settings area for profile, password, theme preference, and learner defaults such as import language; keep operational OpenAI and billing controls out of the learner-facing app.
6. Deploy to Vercel + Neon with a dedicated OpenAI project, usage alerts, and a conservative enforced spend cap.

Decks, analytics, social features, and push notifications remain out of scope for the private beta.

## Nice-to-have after beta activity justifies it

Add server-side AI rate limiting (for example, a dedicated Redis/Valkey store or
Vercel WAF rule) after observing enough real activity to justify the operational
cost and configuration. It must use Canopy-isolated credentials; do not share a
database token with another project.
