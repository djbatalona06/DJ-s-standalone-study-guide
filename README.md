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
- **CS50 deck**: 43 original cards across weeks 0–5, each with a "why". Every card has a
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
- **Motherboard diagram:** Explore (tap a part, read its card), Label (put the names on,
  then check), Match (each pair is checked at once; right ones lock, first tries are scored),
  and a list view (`L`). Fully keyboard-operable.
- **A+ Core 1 deck:** 110 original cards across all five domains (Mobile 15, Networking 25,
  Hardware 30 including the 15 motherboard cards, Virtualization/Cloud 12, Troubleshooting 28),
  written from the 220-1201 objectives as an outline, each with a why and a hint.
- **Installable and offline:** a service worker precaches the app; diagram art is cached
  the first time you open it.

## What exists (quizzes and exams)

- **Four question types**, all keyboard operable: multiple choice, multi-select (the exact set, no partial
  credit), ordering (arrow buttons, no dragging) and matching (native selects). Every question has an
  explanation, and most link to the card that covers it: a miss brings that card back in Review today.
- **Quick quiz** per domain or track (10 questions: unseen first, then last-missed, then last-right).
  Sessions of 5+ answers earn a `quiz` credit in HeartBeat.
- **Practice exam** per track: questions follow the exam's domain weights and favour ones you have not
  asked yet. It scales down with the bank (71 Core 1 questions today, so 71 questions in 71 minutes) and becomes
  the real 90 in 90 as the bank grows. The clock stops while the tab is hidden, flags and a question list
  work, and a reload resumes where you were. Submitting earns a `weekly` credit and shows domain scores
  and every miss with its explanation.
- **Readiness** now blends recent quiz accuracy with card recall, and Learn shows the booking rule
  (readiness and your last two exams at 85%).
- Question banks are their own chunk (`src/content/questions/`), loaded only when you open a quiz.

## What is not built yet

More diagrams, Core 2 cards and questions, more CS50 cards (weeks 6–9), hotspot questions, the career
pathway (and the character's later stages), and a Lighthouse pass. See `docs/06-Implementation-Plan.md`.

## Take the wheel

Good first changes if you want to learn the codebase:

- **Draw the help desk sprite.** Copy `hacker-idle-a` in `src/art/sprites.ts`, give him a
  headset, and run `npm test`. The test tells you if a row is the wrong length.
- **Add the RAM-keying diagram.** Copy `src/content/diagrams/motherboard.ts` and
  `diagram-motherboard.ts`, then run `npm test`. `validateDiagram` lists what is missing.
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
