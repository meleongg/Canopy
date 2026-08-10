# Product steering decisions

This document records active product decisions that affect multiple routes or
future milestones. It is intentionally concise; `DESIGN.md` defines the visual
and interaction system, while the technical specification defines implementation
contracts.

## Private beta decisions

- The Understory is a focused, five-turn practice round. Before the learner
  sends a message, the assistant opens with the first question. The selected
  setting and vocabulary are visible throughout the round so the learner knows
  what they are practising. Progress is explicit (for example, `Turn 2 of 5`).
- Mobile uses a compact, persistent bottom navigation for Dashboard, Overstory,
  Understory, and History. The profile menu remains the home for account
  settings and sign-out.
- Feedback is contextual. Use inline validation and inline workflow status for
  forms, streaming AI, and recoverable errors. Use a brief toast for completed
  card mutations or similarly independent actions. Never use browser `alert`,
  `prompt`, or `confirm` dialogs.
- A later account-settings milestone includes profile name, password, theme,
  default import language, and account deletion. Deletion must require an
  explicit confirmation step and clearly describe the irreversible effect.
- Until dedicated legal/support pages exist, account deletion and support
  surfaces may link to the Canopy GitHub repository as the contact route. This
  is a contact link, not a substitute for a privacy policy or terms of service.
