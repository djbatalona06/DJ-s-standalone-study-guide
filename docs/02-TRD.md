# 02 — TRD: Lantern technical requirements

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| App | Vite + React + TypeScript, installable PWA | Same as HeartBeat, so its patterns and `docs/design-system.md` carry over. |
| Local data | Dexie (IndexedDB) | Proven in HeartBeat; live queries drive re-renders. |
| Scheduler | SM-2 ported from `app/src/domain/study/srs.ts` | Already tested; keep its behavior (ease starts 2.5, floor 1.3, ceiling 3; "again" = quality 2, brings the card back today and dents ease rather than resetting it). |
| Diagrams | Hand-authored SVG fragments in a registry, one lazy chunk per diagram | Original art only (see 6). Matches `features/party/art/house/index.tsx`. |
| Tests | Vitest, `*.test.ts` only, domain code pure (no React, no Dexie) | HeartBeat's convention. Components are not unit-tested by design. |
| Hosting | Cloudflare Pages (static) | The study app needs **no backend of its own** in v1. |
| Backend | None. Talks to HeartBeat's `POST /api/study/session` only | Keeps the free-tier surface small. |
| CI | typecheck, test, build, Lighthouse | Mirror HeartBeat's gates; do not add a visual-regression gate until baselines exist. |
| UI kit | Tailwind CSS v4 + shadcn/ui + [8bitcn/ui](https://www.8bitcn.com/) (Radix underneath) | The 8-bit look (UI brief §2a). Components are copied into `src/components/ui/`, so we own them. |
| Fonts | Press Start 2P + Outfit via `@fontsource` | Bundled, so offline works and no third party sees a request. |
| Offline / install | `vite-plugin-pwa` (Workbox `generateSW`) | Precaches the app shell; diagram art is cached on first use. |

Package manager: npm. Node LTS.

**Why Lantern uses Tailwind when HeartBeat does not.** HeartBeat's `docs/TAILWIND.md` rejects Tailwind because its themes are CSS custom properties written at runtime, and Tailwind resolves at build time. Lantern keeps the same rule, that every colour is a token, and still uses Tailwind: `styles.css` defines HeartBeat's token names, points shadcn's variables (`--background`, `--primary`, `--ring`, …) at them, and maps those into Tailwind with `@theme inline`. A utility like `bg-primary` then compiles to `var(--primary)` and follows the palette. Components still never name a colour. The cost is the one TAILWIND.md warns about: two vocabularies (`--color-accent` is our brand accent; shadcn's `bg-accent` is a hover background). Custom colours use Tailwind's variable syntax, e.g. `text-(--color-xp)`.

## 2. Architecture

```
src/
  domain/            pure TS, tested beside each module
    srs/             scheduler, due-queue, ease
    mastery/         per-domain mastery, readiness, exam-booking rule
    exam/            question types, scoring, timer (visibility-aware)
    pathway/         career graph, prerequisites, next-action
    xp/              session -> kind mapping, queue, backoff
  db/
    database.ts      Dexie schema (see 05)
    repository/      one module per section behind a barrel (HeartBeat pattern)
  content/           authored data, validated at build
    tracks/  domains/  cards/  questions/  diagrams/  pathway/
  features/          screens (see 03), never touch Dexie directly
  art/diagrams/      SVG registry, lazy-loaded
  standalone/        export/import
```

Rules carried over from HeartBeat:

- **All writes go through `db/repository/`.** Components call repository functions. Nothing in `features/` touches the database.
- **A repository directory, not a file.** Adding a section is a new file plus one `export *` line in the barrel; a test fails if the barrel misses a file.
- **Nothing inside a Dexie transaction awaits a non-Dexie promise** (no dynamic `import()`, no `fetch`).
- **Day keys use the learner's timezone**, not UTC.

## 3. Content pipeline

- Authored as typed TS/JSON in `content/`, not in the database. The database stores **progress**, not content, so a content update never migrates user data.
- Every card, question and diagram node has a **stable id** (`c1-hw-mb-001`). Progress rows key on it. Never renumber; deprecate instead.
- A build-time validator fails the build when: an id is duplicated; a card lacks a domain or objective; a question's correct answer is not among its options; a diagram hotspot has no matching card; a `provenance` field is missing.
- `objectiveVersion` on every domain (`220-1201`, `220-1202`, `cs50x-2026`) so an objective revision is one search.

## 4. Question model

`type Question = MCQ | MultiSelect | Ordering | Match | Hotspot | PBQ`

| Type | Scoring |
|---|---|
| MCQ | one correct id |
| MultiSelect | exact set match, with "select N" shown, as on the real exam |
| Ordering | exact sequence |
| Match | all pairs correct; partial credit shown but not counted |
| Hotspot | tap the right part of an SVG diagram |
| PBQ (lightweight) | a small scripted scenario (for example "choose the cable, then the port"); scored by steps |

Explanations are mandatory on every question; the review screen is where the learning happens.

## 5. Exam mode

- The timer must **pause when the tab is hidden** or the exam is silently lost. (HeartBeat's quiz does not do this: `StudyPage.tsx:452` ticks a `setInterval` unconditionally. Do not port that behavior.)
- Full practice exam: 90 questions, 90 minutes, matching the published format for both cores. Practice by domain is untimed.
- Flag-for-review and a review screen before submit.
- Results write one `sessions` row and update `progress`; a `weekly`-kind XP session is queued.

## 6. Diagrams and art

- **No third-party art.** HeartBeat's `NOTICE.md` forbids it and so does this project. Draw in SVG; use theme CSS variables so light/dark and calm mode work.
- One shared coordinate space per diagram (`viewBox="0 0 100 100"`, absolute positions), the same trick `art/house/` uses.
- A diagram is a record: `{ id, viewBox, layers[], parts[{ id, label, path, cardId, hotspot }] }`. `tsc` enforces completeness with `Record<DiagramId, DiagramModule>`.
- Interactive parts are real `<button>` elements or have `role="button"` with `tabindex`, `aria-label` and a visible focus ring.
- Every diagram has a **text alternative** (an ordered list of parts) that is the accessible version and also the fallback if SVG fails.
- Diagram chunks are **lazy and excluded from the precache**, then cached on first use (same reasoning as HeartBeat's `mascot3d-*.js` and Phaser chunks).

## 7. HeartBeat bridge contract (verified against the repo)

| Item | Value |
|---|---|
| Link | Paired HeartBeat phone POSTs `app/functions/api/study/link.ts`; it returns a scoped study token **once**; stored hashed in `study_tokens`; one live link per member; timezone captured at mint. |
| Send | `POST /api/study/session` with `Authorization: Bearer <study token>` and body `{ sessionId, kind, at }`. |
| `sessionId` | 8–64 characters, `[A-Za-z0-9_-]`. Generate once per session and **reuse on every retry**. |
| Kinds and XP | `deck 20`, `quiz 25`, `weekly 35`, `match 10`, `anatomy 15` (`session.ts:31-37`). |
| Daily cap | 120 XP per member-day in the member's timezone (`STUDY_DAILY_CAP`, `session.ts:39`); over the cap it **clamps to 0 gain, it does not refuse**. |
| Clock | A client `at` more than 48 h from the server is replaced by the server clock (`MAX_CLOCK_SKEW_MS`, `session.ts:43`). |
| Dedup | Award id `study-<sessionId>`, primary key in `pet_xp_awards`; a replay is free. |
| CORS | The endpoint echoes the request origin. |
| Pet credit | The pet picks it up on its next sync, within about a minute. Not instant. |
| Failure | `401` = link revoked: show "Reconnect", keep the queue. Network error or `5xx`: keep the queue, retry with backoff. |

**Mapping for v1 (no HeartBeat change):** flashcard session → `deck`; quiz → `quiz`; full practice exam → `weekly`; drag-to-match or label diagram → `match`; explore a diagram → `anatomy`.

**Adding a kind later:** edit `STUDY_KINDS` and `STUDY_XP` in `HeartBeat/app/src/domain/study/award.ts` **and** the duplicate `STUDY_XP` in `functions/api/study/session.ts`, plus tests. No D1 migration.

Client behavior: queue sessions in `syncQueue`; flush on start, on foreground, and after each session; exponential backoff (2 s, 4 s, 8 s, 16 s, cap 5 min); never block the UI on the network.

**Gaps to design around:** the endpoint has no rate limit (do not loop-send); XP is capped at 120/day so the study app should show "XP for today is maxed" rather than implying more studying earns more.

## 8. Quality bars

| Bar | Target |
|---|---|
| Initial JS (gzip) | ≤ 150 kB, diagrams and exam mode lazy |
| Lighthouse | PWA, Accessibility, Best Practices ≥ 95 |
| a11y | Keyboard-only walk of every screen; axe clean; `prefers-reduced-motion` honored |
| Offline | Everything except XP sync works with no network |
| Tests | Every `domain/` module has a test; content validator runs in CI |

## 9. Licensing and provenance

- **Original content only.** Use CompTIA's objectives as an outline (domain names, topic lists), not as text. Never import or paraphrase an exam-dump question.
- CS50 material is CC BY-NC-SA 4.0. Write your own cards; link to the course; if you ever reuse its text, keep attribution and the same license, and note the project is non-commercial.
- Every card and question has `provenance: 'original' | 'objective-outline' | 'cs50-derived'` and a `sourceUrl` where relevant. The validator rejects blanks.
- Third-party code libraries: MIT/Apache/BSD only; list them in a `NOTICE.md`.

## 10. Currency checks (re-verify before building content)

- A+ exam codes **220-1201** (Core 1) and **220-1202** (Core 2) and their domain weightings, from CompTIA's official objectives PDF. Values in these docs come from third-party listings.
- CS50x current-year syllabus.
- Cloudflare free-tier limits (only relevant for the HeartBeat side).

## 11. Security and privacy

- No server-side user data in v1. The only secret is the study token, stored in IndexedDB (or `localStorage`) on the device. Add a strict CSP to the study app from day one; HeartBeat does not have one, which is the audit's XSS caveat.
- Export files contain progress only, never the study token.
- No analytics. If you ever add some, use HeartBeat's rule: server-side counts, no content.
