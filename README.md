# DJ-s-standalone-study-guide

HTML5 only with an XP gate/sync to the Heartbeat PWA iOS app.

The app is called Lantern for now (working title).

A study app for CS50 / intro CS and CompTIA A+ (Core 1 `220-1201`, Core 2 `220-1202`),
built to send XP to [HeartBeat](https://heartbeat-eop.pages.dev) through the study-token
bridge HeartBeat already has. Progress lives on the device; there is no backend of its own.

The plan lives in `docs/` (PRD, TRD, App Flow, UI/UX, Backend Schema, Implementation Plan,
and a context block). Treat those as the source of truth.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 56 tests: scheduler, queue, outbox, content, readiness, repository
npm run typecheck
npm run build
```

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

## What is not built yet

Diagrams, quizzes and exams, the A+ decks, the career pathway, a service worker / install
prompt, and an accessibility and Lighthouse pass. See `docs/06-Implementation-Plan.md`.

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
