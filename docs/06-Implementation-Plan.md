# 06 — Implementation Plan: Lantern

Phases, not a flat list. Each phase ends at a **definition of done (DoD)** you can check. Do not start a phase until the previous DoD is true. Content is the long pole; code is the short one.

Effort guide is for one person working evenings and weekends: S = a few sessions, M = 1–2 weeks, L = 3+ weeks. Treat as rough.

---

## Phase 0 — HeartBeat hardening and server-side PostHog (M) — in the HeartBeat repo

Why first: the study app adds another writer to a free-tier backend that already runs out around 430–480 daily users (audit report, section 3).

Tasks
1. Cloudflare dashboard: WAF rate-limit rule on `/api/pair/*`. (No code.)
2. Migration `0019_scale_indexes.sql`: `idx_nudges_member (member_id, delivered_at)`, `idx_invites_expiry (expires_at)`. **You write it**; verify with `EXPLAIN QUERY PLAN` before and after.
3. Nudge replan: skip the PUT when the plan hash is unchanged.
4. Clamp `updatedAt` to `now + skew` in `entries.ts` and `holdings.ts`; add `couple_id` guard to the holdings upsert.
5. Per-member daily AI quota in `ask.ts` and `transcribe.ts`.
6. Server-side PostHog: `track()` in `_lib.ts`, no-op when `POSTHOG_KEY` is unset, `waitUntil`, hashed ids, counts and enums only, `/api/health` boolean.
7. Reword the privacy lines (README, landing page, design doc, session hook).
8. Decide plan: Workers Paid ($5/month) if measured DAU is near the ceiling.

Tests
- Unit: replan-skip logic; clamp helper; `track()` scrubbing (a test that fails if a property named `payload`, `body`, `token`, `invite` or `timeZone` is passed).
- Query-plan test in CI over the real migrations.

DoD: query plans show `SEARCH ... USING INDEX` for both queries; a scripted 1,000-attempt join spree is rejected by the rate rule; PostHog receives `pair_started` from a preview deploy; `npm test` and `npm run typecheck` pass; `git diff --exit-code -- study/index.html` passes (rebuild it last, per `CLAUDE.md`).

---

## Phase 1 — Scaffold, SRS, CS50 deck, XP sync (M)

Tasks
1. New repo; Vite + React + TS + PWA; copy HeartBeat's theme engine and tokens.
2. `db/database.ts` with `cardState`, `reviewLog`, `sessions`, `syncQueue`, `settings`, `meta`; repository barrel with an index test.
3. Port `srs.ts` and its tests.
4. Content validator (unique ids, domains, provenance) wired into `npm test`.
5. Author the **CS50 deck** (about 80–120 original cards across weeks 0–9).
6. Screens: Onboarding, Today, Review, Me/Settings, Export/Import.
7. HeartBeat link: paste token, `syncQueue`, backoff, `NeedsReconnect`.

Tests: SRS parity with HeartBeat's cases; queue idempotence (same `sessionId` twice = one credit); backoff schedule; export/import round trip; import never imports `studyToken`.

DoD: complete a review session offline; reconnect and see one `deck` credit in HeartBeat within about a minute; a second identical send credits nothing; revoke the link in HeartBeat and see "Reconnect"; Lighthouse ≥ 90.

---

## Phase 2 — A+ Core 1 content and the diagram engine (L)

Tasks
1. Diagram registry, viewer (pan/zoom), Explore mode, list-view fallback, lazy chunks excluded from precache.
2. **Motherboard** first (labeled components, each with a card). Then: RAM keying, storage interfaces (SATA/M.2/NVMe), ports and connectors, PSU connectors, CPU sockets and cooling, laptop internals, laser-printer imaging steps, cable types, OSI and topologies.
3. Label and Match modes, both keyboard-operable.
4. Core 1 cards for all five domains (Mobile 13%, Networking 23%, Hardware 25%, Virtualization/Cloud 11%, Troubleshooting 28%), written from the official objectives as an outline.
5. Enqueue `anatomy` and `match` sessions.

Tests: diagram completeness (`Record<DiagramId, …>` compile check); every part has a card; every diagram has a text alternative; keyboard label test in a headless browser.

DoD: the motherboard diagram is fully usable with keyboard and screen reader; axe clean; a diagram failing to load shows the list view; initial JS still under budget.

**Progress (2026-09-30, 8-bit slice, see `docs/superpowers/specs/2026-09-30-8bit-theme-and-diagrams-design.md`):**
- Done: tasks 1 and 5; the motherboard (task 2's first diagram) with 15 cards; Label mode (task 3); the completeness, card, text-alternative and scoring tests; axe clean; list-view fallback; initial JS ≈ 120 kB gzip.
- Also closed from Phase 1: onboarding, hash routes, the install/offline service worker, and the 8-bit theme plus the learner-named character (UI brief §2a–2b).
- Also added: Flashcards mode (Quizlet layout) and a written hint on all 58 cards; the validator requires hints and rejects ones that contain the answer.
- Match mode (task 3): pick a name, pick a part, instant ✓/✗ with icon and text; right pairs lock, first-try matches are scored (`src/domain/diagram/match.ts`); finishing queues `match`. Verified at 390 and 1280 px, dark and light, axe clean, full keyboard-only walk.
- Task 4: 110 Core 1 cards (Mobile 15, Networking 25, Hardware 30, Virtualization/Cloud 12, Troubleshooting 28), all `objective-outline` with a why and a hint; a test keeps every Core 1 domain at 10+ cards. Initial JS ≈ 137 kB gzip with them: split the decks into lazy chunks before Core 2 lands. Domain weights still not verified against CompTIA's page (unreachable from the build environment).
- Next: the RAM-keying diagram; a headless keyboard test in CI.
- CI: `.github/workflows/ci.yml` runs typecheck, tests and build on every PR and push to `main`.
- Still open from Phase 1: the CS50 deck is at 43 cards of the 80–120 target (weeks 6–9 unwritten).

---

## Phase 3 — Quizzes, exams, mastery, readiness, Core 2 (L)

Tasks
1. Question types with scoring (MCQ, multi-select, ordering, match, hotspot, lightweight PBQ).
2. Quiz by domain, review with explanations; misses add to the review queue.
3. Full timed exam: 90 questions, 90 minutes, visibility-aware timer, flags, resume.
4. Mastery and readiness per track; the booking rule (readiness ≥ 85% and last two exams ≥ 85%, adjustable).
5. Core 2 content: OS 28%, Security 28%, Software Troubleshooting 23%, Operational Procedures 21%.
6. `quiz` and `weekly` XP kinds.

Tests: scoring per type, including multi-select exactness; timer pauses on hidden and resumes; readiness math against hand-computed fixtures; exam resume after reload.

DoD: two full practice exams per core can be completed and reviewed; readiness updates; the timer never runs while hidden; every question has an explanation.

---

**Progress (2026-09-30, quizzes and exams):**
- Done: tasks 1–4 and 6 for Core 1. Question types mcq, multi (exact set), ordering and matching, with pure scoring, seeded shuffling, weighted exam building, a visibility-aware clock, and mastery/booking maths, all tested (`src/domain/quiz/`, `src/domain/mastery/`).
- Storage: Dexie schema 2 adds `quizAnswers` and `exams`; an exam is saved on every change and resumes after a reload; finishing is one transaction (answers, score, queued XP) and safe to call twice. Backups carry answers and finished exams.
- Screens: Quick quiz per domain/track, Practice exam (intro/resume, runner with flags and question list, results with every miss explained). Verified in headless Chromium at 390 px: full flow, timer pause while hidden, reload-resume, strict CSP with no violations, axe clean in light and dark.
- 71 Core 1 questions (Mobile 10, Networking 17, Hardware 16, Virtualization 9, Troubleshooting 19). The exam scales to the bank, so it reaches the full 90 questions in 90 minutes once the bank does; grow it toward 150+ so two exams stay mostly fresh.
- Core 2 (Phase 3 task 5): 128 cards and 81 questions across all four domains, all `objective-outline`. The card library moved into a lazy chunk (`content/library.ts`) when Core 2 pushed the initial JS to 154 kB; it is now 118 kB against the 150 kB budget.
- Not yet: hotspot questions (need more diagrams), a lightweight PBQ beyond ordering and matching, more Core 2 questions for two fresh exams.

## Phase 4 — Career pathway (M)

Tasks
1. Graph data: role, cert, skill, project nodes with prerequisites and hours. Path: A+ (Core 1, Core 2) → help desk tier 1 → Network+ / Linux / Microsoft or cloud fundamentals → sysadmin → cloud engineer.
2. Path screen, node detail, next-action logic (`pathway/` pure module, tested for cycles and locked/available states).
3. Booking card linking to CompTIA's official scheduling page.
4. Salary/demand fields **only** with a cited source and date, gathered at build time; hidden otherwise.

Tests: no cycles; prerequisites resolve; a node with a `salary` and no `source` fails validation.

DoD: the path renders with correct locked/available states from real progress; every figure shown has a source and date.

---

## Phase 5 — Polish, accessibility, offline (M)

Tasks: full keyboard and screen-reader walk of every screen; calm mode and reduced motion; strict CSP; Lighthouse ≥ 95; precache audit (diagram and exam chunks lazy); install prompt; error and empty states from `04`; backup reminder.

DoD: Lighthouse PWA/A11y/Best Practices ≥ 95; a11y checklist in `04` section 9 passes on every screen; the app works fully in airplane mode apart from XP sync.

---

## Phase 6 — Measured scale work (only if measured)

Do this only with data from PostHog and Workers logs.

- Conditional polling and visibility backoff in HeartBeat.
- TTL sweeps for `auth_events`, `pet_xp_awards`, `study_days`, `compliments`, consumed `invites`.
- Load test with `pair:live` and a small k6 script; re-derive the audit's table with real numbers.
- Only then consider Queues, Durable Objects, or sharding.
- Optional v2 study sync (see 05 section 4), gated on the D1 budget.

DoD: a written before/after table for requests/day and rows written/day on measured, not estimated, traffic.

---

## Cross-phase rules

- Commit small; run typecheck, tests and the build before every push.
- Anything in `HeartBeat/app/tools/` or build config must be **run**, not only reviewed, before pushing (`CLAUDE.md` explains the six-run breakage this prevented).
- Never commit tokens, keys or study tokens. Keep `POSTHOG_KEY` and the hash salt as Pages secrets.
- Add a Changesets-style note only if you publish a package; not needed for a personal app.
