# 01 — PRD: Lantern (working title), a study platform for CS50 and CompTIA A+

Status: draft v0.1, 2026-09-29. "Lantern" is a placeholder name.

## 1. Problem

The flashcards inside HeartBeat (226 developer cards, tested SM-2 scheduler, `app/src/domain/study/`) work, but they are one feature inside a couples tracker. They have no images, no domains, no per-card history, no exams and no way to answer "am I ready to book the test?". Hardware topics for CompTIA A+ (a motherboard, RAM keying, connectors) are visual and cannot be learned from text-only cards.

## 2. Users

| User | Need |
|---|---|
| **Primary: you** | Pass A+ Core 1 and Core 2, learn intro CS and web/app development, and move from help desk toward sysadmin and cloud. |
| **Secondary (optional): your partner** | Same app, own progress, own XP link into HeartBeat. |

Not a public product. No accounts, no leaderboard, no ads.

## 3. Goals

1. **Three tracks** with original content: CS50 / intro CS + web/app dev, A+ Core 1 (220-1201), A+ Core 2 (220-1202).
2. **Spaced-repetition flashcards** with domain tagging and per-card review history.
3. **Interactive diagrams**: explore, label, and drag-to-match, starting with the motherboard.
4. **Quizzes and timed practice exams** with single-choice, multi-select, ordering, match, hotspot, and lightweight performance-based questions.
5. **Readiness score** per domain, weighted by the official domain percentages, with a clear "book the exam" rule.
6. **Career pathway**: a graph from A+ to help desk to sysadmin to cloud, with prerequisites, hours and next actions.
7. **XP into HeartBeat** through the existing study-token bridge, with zero HeartBeat changes for v1.
8. **Works offline** and keeps progress on the device; JSON export/import as the backup.

## 4. Non-goals (v1)

- Accounts, server-side progress, or cross-device sync (deferred to v2; see 05).
- Copying CompTIA question text or any exam-dump material. Objectives are used as structure only.
- Copying CS50 lecture text. CS50 is CC BY-NC-SA 4.0; write your own cards and link to the course.
- A leaderboard or social features.
- Video hosting.
- Native apps.

## 5. Features

| Feature | Detail | Phase |
|---|---|---|
| Flashcards | SM-2 scheduling ported from `domain/study/srs.ts` (ease 2.5, floor 1.3, ceiling 3). Cards carry domain and tags. "Again" returns the card today without resetting it (kept from HeartBeat). | 1 |
| CS50 deck | Original cards per CS50x week: binary/ASCII, C basics, arrays, sorting/searching, memory, data structures, Python, SQL, web, Flask. | 1 |
| XP sync | Study token, offline queue, idempotent `sessionId`, "Reconnect" on 401. | 1 |
| Diagram engine | Explore (tap a part, read a card), Label (place names), Match (drag term to part). SVG registry, keyboard and screen-reader accessible. | 2 |
| A+ Core 1 content | Motherboard first, then RAM keying, storage interfaces, ports and connectors, PSU connectors, CPU sockets and cooling, laptop internals, laser printer imaging, cable types, OSI and topologies. | 2 |
| Quizzes and exams | Practice by domain; full timed exam (90 questions, 90 minutes); review screen with explanations. | 3 |
| Mastery and readiness | Per-domain mastery from review history and quiz results; readiness = weighted average by official domain percentages. | 3 |
| A+ Core 2 content | Operating systems, security, software troubleshooting, operational procedures. | 3 |
| Career pathway | Data-driven graph of role, cert, skill and project nodes. | 4 |
| Polish | Accessibility audit, Lighthouse budget, offline, install prompt. | 5 |

## 6. Success metrics

Measured on-device (no analytics service is needed for a one-person app).

| Metric | Target |
|---|---|
| Days studied per week | ≥ 5 |
| Cards due cleared per day | ≥ 90% |
| Core 1 practice-exam score | ≥ 85% on two consecutive full exams before booking |
| Core 2 practice-exam score | ≥ 85% on two consecutive full exams before booking |
| XP sync success | ≥ 99% of sessions credited within a minute of reconnecting |
| Lighthouse (PWA, a11y) | ≥ 95 |

The 85% threshold is a personal rule of thumb, not CompTIA guidance (pass marks are 675 and 700 out of 900). Tune it with your own results.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Content is the real work; 3 tracks is months of writing. | Ship CS50 + motherboard first. Everything else is data, added one deck at a time. |
| Exam objectives change (220-1201/1202 are current as of this writing). | Store `objectiveVersion` on every domain and card; re-verify against CompTIA's official PDF before finalizing. |
| Copyright. | Original wording only; provenance field on every card; no imported question banks. |
| XP gamification pulling attention from actual learning. | Payment is by sessions, capped at 120 XP/day by the server; readiness is decided by exam scores, not XP. |
| Study-bridge endpoint has no rate limit. | Client-side backoff; note in HeartBeat hardening (audit report). |
| Scope creep into "a whole LMS". | Non-goals above; Phase gates in 06. |

## 8. Open questions

1. Is the partner a real user in v1 (own install, own link) or only a design possibility?
2. Do you want v2 cross-device sync, or is export/import enough?
3. Name, domain and icon.

## 9. Assumptions to confirm

- Separate repo and origin, not a route inside HeartBeat.
- HeartBeat's design language is reused.
- "Studying site" means this study app, not the nursing "Jenny's Study Guide" app.
- Salary and demand figures in the career pathway are added at build time from cited sources; none are invented here.
