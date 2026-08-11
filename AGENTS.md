# AGENTS.md

## System Architecture & Constraints

* **Primary Languages:** TypeScript, Next.js 16 (App Router, Turbopack)
* **Type Safety & Style:** Strict TypeScript, zero `any`, Tailwind CSS + shadcn/ui, single-font configuration (Merriweather/Plus Jakarta Sans)
* **Database / State:** Neon Serverless PostgreSQL, Drizzle ORM, TanStack Query v5 client-side cache

## Execution & Verification Commands

* **Install Dependencies:** `npm install`
* **Run Local Server:** `npm run dev`
* **Run Test Suite:** `npm run test`
* **Format / Lint:** `npm run lint && npx tsc --noEmit`

## Core Agent Boundaries

* **Dependency Guard:** Do not install external libraries, wrappers, or utilities to solve trivial tasks. Write clean, native helper functions first. If a package is necessary, request explicit approval.
* **Architectural Isolation:** Keep concerns strictly separated. Do not mix business logic with UI rendering files. Group modules logically by domain, not by utility type.
* **Git Hygiene:** Never commit directly to default branches. Create clean, short-lived feature branches prefixed with `feat/` or `fix/`.

## Pull Request Workflow

* **Template:** When preparing a pull request, use `.github/PULL_REQUEST_TEMPLATE.md`.
* **Review Tier:** Recommend exactly one review tier based on the highest-risk change in the pull request: Auto-approve (formatting or standard documentation only), Spot-check (isolated low-risk UI or mechanical work), or Full review (architecture, business logic, auth, permissions, database, APIs, AI behavior, dependencies, or migrations).
* **Human Control:** A recommended Auto-approve tier never authorizes an agent to merge. Only the user may approve, mark ready, or merge a pull request.
* **Evidence:** Include screenshots for user-visible changes when reliable local capture is available; otherwise state why screenshots are unavailable.
* **Draft Deliverable:** For substantial work that belongs on a feature branch, commit the completed work, push the branch, and publish a draft pull request using the template. The draft PR is the final deliverable. Small changes and experiments do not require a new draft PR; add them to an existing relevant draft when appropriate.

## Definition of "Done"

Before you present a task as complete or prompt for a commit, you must execute these validation gates in order:

1. **Linter & Type Checks:** Run the formatting, linting, and type-checking commands to ensure zero errors.
2. **Local Verification:** Run the project's test suite and ensure all tests pass.
3. **Diff Explanation:** For substantial or high-risk changes, call the `/explain-diff-html` skill. For small follow-up fixes, produce a clean terminal diff detailing exactly which files were altered and why, highlighting any potential architectural risks. In both cases, run `git diff --check`.
4. **Draft PR for Feature Work:** For substantial feature-branch work, commit and push the validated changes, then publish the required draft PR. Do not mark it ready for review, approve it, or merge it.
