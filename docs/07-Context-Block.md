# 07 — Context Block (paste at the start of a build session)

Paste everything between the lines. Then say: "Here are my project documents. Use these as the source of truth for everything you build. Start at Phase N."

---

**Project: Lantern (working title)** — a TypeScript web app (React + Vite), installable as a PWA; standalone study app for CS50 / intro CS + web dev, CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202). Career goal: help desk → sysadmin → cloud. Personal app; no accounts, no analytics, no backend of its own in v1.

**Stack:** Vite + React + TypeScript PWA (vite-plugin-pwa), Dexie (IndexedDB), Vitest (`*.test.ts` only, domain code pure), GitHub Actions CI (`.github/workflows/ci.yml`: typecheck, test, build on every PR), Cloudflare Pages static hosting, npm. UI: Tailwind v4 + shadcn/ui + 8bitcn/ui (https://www.8bitcn.com/, copied into `src/components/ui/8bit/`), themed through HeartBeat's token names in `src/theme/palette.ts` + `styles.css` (dark "terminal" palette, amber XP; `contrast.test.ts` guards AA). Fonts: Press Start 2P for titles/numbers/buttons, Outfit for reading. Original art only: the character is a 16×16 text-grid sprite (`src/art/sprites.ts`), **named by the learner** (`settings.characterName`), with stages Foundations → Help desk → Specialize → Sysadmin → Cloud.

**Architecture rules:** all DB writes through `db/repository/` (one module per section behind a barrel with an index test); features never touch Dexie; nothing awaits a non-Dexie promise inside a Dexie transaction; day keys use the learner's timezone; content lives in typed files (Track → Domain → Topic → Card | Diagram | Question) with stable ids never renumbered; DB stores progress only; `reviewLog` is the source of truth and `cardState`/`mastery` are derived.

**SRS:** SM-2 port from HeartBeat `srs.ts`: ease starts 2.5, floor 1.3, ceiling 3; grades Again/Hard/Good/Easy; "again" = quality 2, returns the card today and dents ease (no reset).

**Questions:** MCQ, multi-select (exact set), ordering and match are built; hotspot-on-diagram is not; explanation mandatory. **Exam:** built; scales to the bank up to 90 questions in 90 minutes; timer (`domain/quiz/clock.ts`) pauses when the tab is hidden; flags; saved on every change and resumes after a reload.

**Readiness** = Σ domain.weight × mastery(domain); mastery = 0.5 recall + 0.5 quiz accuracy (tunable). Book exam when readiness ≥ 85% and last two full exams ≥ 85% (personal rule).

**Weights (verify against CompTIA's official objectives PDF):** Core 1 — Mobile 13, Networking 23, Hardware 25, Virtualization/Cloud 11, Troubleshooting 28. Core 2 — OS 28, Security 28, Software Troubleshooting 23, Operational Procedures 21.

**HeartBeat bridge (no HeartBeat changes in v1):** user pastes a study token minted by HeartBeat `POST /api/study/link` (shown once). Send `POST {HeartBeat origin}/api/study/session` with `Authorization: Bearer <token>`, body `{ sessionId, kind, at }`. `sessionId` = `sessions.id`, 8–64 chars `[A-Za-z0-9_-]`, reused on every retry (dedup key `study-<sessionId>`). Kinds/XP: deck 20, quiz 25, weekly 35, match 10, anatomy 15. Daily cap 120 XP per member-day (clamps to 0 gain, does not refuse). Client clock >48 h off is replaced by server time. 401 = revoked → "Reconnect", keep queue. Network/5xx → keep queue, backoff 2/4/8/16 s, cap 5 min. Mapping: flashcards→deck, quiz→quiz, full exam→weekly, label/match diagram→match, explore diagram→anatomy. Pet credit arrives on next HeartBeat sync (~1 min). No rate limit on the endpoint: never loop-send.

**Local tables:** cardState, reviewLog, quizAnswers, sessions (id = XP sessionId), mastery, pathProgress, userCards, syncQueue, settings (studyToken never exported), meta. Import merge: greater `lastReviewedAt` wins per card; logs union by id; never import the token.

**Content so far:** CS50 99 cards (weeks 0–9); A+ Core 1 110 cards and 71 questions across all five domains; A+ Core 2 128 cards and 81 questions across all four. Cards live in one lazy chunk (`content/library.ts`, read via `useLibrary`); tracks and domains stay in `content/index.ts`. Question banks are lazy chunks in `src/content/questions/`, checked by `validateQuestions`; each question may name a `cardId` that a miss brings back today.

**UI:** tabs Today / Learn / Me now; Practice and Path join when they have content. Hash routes in `src/app/route.ts`. Diagrams: `Diagram` (names, cards, text alternative) in the main bundle, `DiagramArt` geometry as a lazy `diagram-*.js` chunk; Explore, Label, Match and list view built. Flashcards mode (`/flashcards/:deck`, Quizlet layout, not graded) with a required written `hint` on every card. Diagrams: parts are real buttons, keyboard operable, every diagram has a list-view text alternative, tap-to-place labeling. Color never the only signal. Lazy diagram/exam chunks, out of the precache. Strict CSP. Quiet XP, no shaming.

**Licensing:** original content only; CompTIA objectives as outline not text; never copy exam-dump questions; CS50 is CC BY-NC-SA 4.0 so write your own cards and link out; every card has `provenance`.

**Phases:** 0 HeartBeat hardening + server-side PostHog (rate-limit pairing, migration 0019 indexes, skip unchanged nudge replan, clamp updatedAt, couple_id guard, AI quota) → 1 scaffold, SRS, CS50 deck, XP sync → 2 A+ Core 1 + diagram engine (motherboard first) → 3 quizzes/exams/readiness/Core 2 → 4 career pathway → 5 polish/a11y/Lighthouse/offline → 6 measured scale work.

**Working style:** keep changes minimal (reuse before adding), run typecheck + tests + build before each push, never commit keys or tokens, explain the why so the owner learns rather than depends.

---
