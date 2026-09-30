# DJ-s-standalone-study-guide

**Lantern** (working title) is a **TypeScript web app**: React + TypeScript, built with Vite, and
installable on a phone as a PWA (progressive web app). It is not a plain HTML5 site. `index.html` is
only the shell the browser loads; every screen is TypeScript (`.ts`/`.tsx`) compiled into
JavaScript by `npm run build`. It runs in any modern browser, needs no app store, and earns XP
in the HeartBeat PWA through HeartBeat's study-token bridge.

A study app for CS50 / intro CS and CompTIA A+ (Core 1 `220-1201`, Core 2 `220-1202`),
built to send XP to [HeartBeat](https://heartbeat-eop.pages.dev) through the study-token
bridge HeartBeat already has. Progress lives on the device; there is no backend of its own.

The plan lives in `docs/` (PRD, TRD, App Flow, UI/UX, Backend Schema, Implementation Plan,
and a context block). Treat those as the source of truth.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # scheduler, queue, outbox, content, questions, quiz engine, exam clock, readiness, repository, palette contrast, sprites, routes
npm run typecheck
npm run build
```

The same three checks run on every pull request and push to `main` in GitHub Actions
(`.github/workflows/ci.yml`); a red check means one of them failed.

## What exists (Phase 1)

- **Scheduler and queue** ported from HeartBeat's `domain/study/srs.ts`, same behaviour:
  ease 2.5 (floor 1.3, ceiling 3), `again` returns the card today without resetting it.
- **CS50 deck**: 99 original cards across weeks 0–9 (C, memory and data structures, then Python, SQL,
  HTML/CSS/JavaScript and Flask), each with a "why" and a hint. Every card has a
  `provenance`; the validator fails the build on a blank one. CS50's own text is CC BY-NC-SA,
  so none is copied.
- **Tracks and domains** for A+ Core 1 and Core 2 with the exam weightings, used for the
  readiness number once their cards exist. The weightings come from third-party listings:
  **verify them against CompTIA's official objectives** before relying on them.
- **XP sync**: sessions of 5+ cards are queued in the same transaction that ends the session,
  sent one at a time with the same `sessionId` on every retry, backed off 2 s → 5 min,
  kept through a 401 ("Reconnect"), and dropped only after 30 days.
- **Screens**: Today, Learn, Review (keyboard: Space reveals, 1–4 grade), Me (link, new cards
  per day, backup export/import that never contains the token).

## What exists (8-bit slice)

- **Look:** an 8-bit "terminal after dark" theme built on [8bitcn/ui](https://www.8bitcn.com/)
  (Tailwind v4 + shadcn/ui), in HeartBeat's token names. `src/theme/contrast.test.ts` keeps
  every text colour readable in both modes.
- **Your character:** a 16×16 pixel hacker (`src/art/sprites.ts`) who works his way from
  help desk to cloud. You name him when you first open the app.
- **Onboarding, hash routes, a streak, and the next interval shown on every grade button.**
- **Flashcards mode (Quizlet-style):** one big card that flips, ← → arrows, a counter,
  shuffle, and every term listed underneath. **Get a hint** (or `H`) shows a hand-written nudge
  before you flip; every card has one, and the validator rejects a hint that contains the answer.
  Open it from any track or domain in Learn, or from the motherboard. Browsing is not graded;
  Review is where cards get scheduled.
- **Eleven diagrams:** the motherboard, memory modules, storage drives and connectors, power
  supply connectors, laser printer, ports, cables and fiber connectors, CPU cooling, inside a laptop,
  the OSI model and network topologies. Each has Explore (tap a part, read its card), Label (put
  the names on, then check), Match (each pair is checked at once; right ones lock, first tries are
  scored), and a list view (`L`), and every part has its own card. Fully keyboard-operable.
- **A+ Core 2 deck:** 128 original cards across Operating systems (38), Security (35), Software
  troubleshooting (25) and Operational procedures (30), each with a why and a hint, plus 81 practice
  questions. Written from the 220-1202 objectives as an outline.
- **A+ Core 1 deck:** 110 original cards across all five domains (Mobile 15, Networking 25,
  Hardware including the motherboard and diagram cards, Virtualization/Cloud 12, Troubleshooting 28),
  written from the 220-1201 objectives as an outline, each with a why and a hint.
- **Installable and offline:** a service worker precaches the app; diagram art is cached
  the first time you open it.

## What exists (quizzes and exams)

- **Five question types**, all keyboard operable: multiple choice, multi-select (the exact set, no partial
  credit), ordering (arrow buttons, no dragging), matching (native selects) and hotspot (tap a part of a
  diagram, or pick it by name; the prompt asks by function so both routes test the same thing). Every question has an
  explanation, and most link to the card that covers it: a miss brings that card back in Review today.
- **Quick quiz** per domain or track (10 questions: unseen first, then last-missed, then last-right).
  Sessions of 5+ answers earn a `quiz` credit in HeartBeat.
- **Practice exam** per track: questions follow the exam's domain weights and favour ones you have not
  asked yet. Core 1 has 109 questions, so its exam is the real 90 in 90 minutes. It scales down when a bank is
  smaller (Core 2 has 81, so 81 in 81) and reaches 90 in 90 as that bank grows. The clock stops while the tab is hidden, flags and a question list
  work, and a reload resumes where you were. Submitting earns a `weekly` credit and shows domain scores
  and every miss with its explanation.
- **Readiness** now blends recent quiz accuracy with card recall, and Learn shows the booking rule
  (readiness and your last two exams at 85%).
- Question banks are their own chunk (`src/content/questions/`), loaded only when you open a quiz. The card
  library is a lazy chunk too (`src/content/library.ts`, read through `useLibrary`), which keeps the initial
  JavaScript near 118 kB gzip against the 150 kB budget.

## What exists (career path)

- **Path tab:** 17 steps in five stages, Foundations to Cloud (A+, Network+, Security+, a cloud
  fundamentals and associate certification, Linux, scripting, Windows Server, three projects, and the
  help desk, sysadmin and cloud roles). Each step is locked, open, in progress or done, from what
  you mark and what it requires; nothing is assumed. The pathway is checked for cycles, missing
  prerequisites and requirements from a later stage (`src/domain/pathway/`).
- **Your character moves up:** finishing a role or certification that opens the next stage changes his
  sprite (headset, ID badge, terminal prompt, clouds). The Today header shows the level.
- **A+ steps show your booking rule** (readiness and your last two exams at 85%) and, once you meet
  it, a link to the certifier. The app never books or sells anything.
- **Pay and demand** appear only with a cited source and retrieval date, and only for an occupation the
  source covers: US Bureau of Labor Statistics figures for help desk (median $62,890, May 2025) and
  sysadmin ($99,130), retrieved 2026-09-30. Both show projected employment *falling* (−3% and −4%,
  2025–35), and the screen says so. There is no figure for the cloud role.
- **The certifier links are unverified:** CompTIA's site could not be reached from the build
  environment, so the addresses in `src/content/pathway.ts` were not opened. Confirm them, and the
  current exam codes, weights and objectives, on CompTIA's own site.

## What is not built yet

CS50 quizzes, a Lighthouse
pass, and a headless keyboard test in CI. See `docs/06-Implementation-Plan.md`.

## Take the wheel

Good first changes if you want to learn the codebase:

- **Redraw a stage.** The four later stages are the Foundations sprite plus one accessory each
  (`HEADSET`, `BADGE`, `PROMPT`, `CLOUDS` in `src/art/sprites.ts`). Change those pixels, or give the
  sysadmin his own sprite, and run `npm test`. The test tells you if a row is the wrong length.
- **Add a diagram.** Copy an entry in `src/content/diagrams/catalog.ts` and a `diagram-*.ts` art file
  (the helpers in `draw.ts` build the paths), write one card per part, then run `npm test`.
  `validateDiagram` lists what is missing and whether two parts overlap. Try SFP and other transceivers,
  or the BIOS boot screen.
- **Tune a colour** in `src/theme/palette.ts` and `src/styles.css`. `contrast.test.ts` fails if
  it stops being readable.

## Linking to HeartBeat

In HeartBeat, open Settings and connect a study app. It shows a token once. Paste it in
Lantern's Me screen. The token is stored on this device only and is sent only to the
HeartBeat address in Settings, in the `Authorization` header.

## Analytics

Lantern has none, on purpose. HeartBeat already counts study sessions server-side
(`study_session_credited`, with the kind and whether the day was capped), which shows how
often and what kind of sessions happen. It cannot show which card confused someone or which
screen was abandoned. If you want that, it has to be a deliberate, opt-in choice here, since
HeartBeat's "no client analytics" promise does not automatically cover a second app.
