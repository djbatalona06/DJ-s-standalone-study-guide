# 05 — Backend Schema: Lantern

v1 has **no backend of its own**. "Schema" means (1) the local Dexie database, (2) the read-only content model, and (3) the HeartBeat tables the bridge touches. Section 4 sketches an optional v2 sync.

## 1. Content model (authored files, not database rows)

```
Track → Domain (objective) → Topic → Card | Diagram | Question
```

```ts
interface Track   { id: 'cs50' | 'a1' | 'a2'; title: string; objectiveVersion: string; examCode?: string }
interface Domain  { id: string; trackId: string; code: string; title: string; weight: number; order: number; objectiveVersion: string }
interface Topic   { id: string; domainId: string; title: string; order: number }
interface Card    { id: string; topicId: string; front: string; back: string; why: string; hint: string /* required; must not contain the answer */; imageId?: string; diagramPartId?: string; tags: string[]; provenance: Provenance; sourceUrl?: string }
interface Diagram { id: string; topicId: string; title: string; viewBox: string; parts: DiagramPart[]; textAlternative: string }
interface DiagramPart { id: string; label: string; cardId: string; hotspot: string }
type Question = MCQ | MultiSelect | Ordering | Match | Hotspot | PBQ // all carry: id, topicId, prompt, explanation, difficulty, provenance
interface CareerNode { id: string; type: 'role' | 'cert' | 'skill' | 'project'; title: string; stage: string; prerequisites: string[]; estimatedHours: number; readiness?: { minReadiness: number; minExamScore: number }; source?: string; retrievedOn?: string }
type Provenance = 'original' | 'objective-outline' | 'cs50-derived'
```

Rules: ids are stable and never renumbered; `weight` is a fraction that sums to 1 per exam; `provenance` is required; `salary`/`demand` fields are allowed only with `source` and `retrievedOn`.

## 2. Local database (Dexie / IndexedDB)

Progress only. Content is imported from the bundle at startup; the DB never stores card text (except optional user-authored cards, see `userCards`).

| Table | Primary key | Fields | Indexes |
|---|---|---|---|
| `cardState` | `cardId` | `ease`, `intervalDays`, `dueAt`, `reps`, `lapses`, `lastReviewedAt`, `suspended` | `dueAt`, `[suspended+dueAt]` |
| `reviewLog` | `id` (uuid) | `cardId`, `at`, `grade` (1–4), `msTaken`, `prevIntervalDays`, `nextIntervalDays`, `sessionId` | `cardId`, `at`, `sessionId` |
| `quizAnswers` | `id` | `sessionId`, `questionId`, `at`, `response` (json), `correct`, `msTaken`, `flagged` | `sessionId`, `questionId`, `at` |
| `sessions` | `id` (= XP `sessionId`) | `kind` (`deck`/`quiz`/`weekly`/`match`/`anatomy`), `trackId`, `startedAt`, `endedAt`, `activeMs`, `score?`, `examCode?`, `status` (`active`/`done`/`abandoned`), `dayKey` | `endedAt`, `dayKey`, `[kind+endedAt]` |
| `mastery` | `[trackId+domainId]` | `mastery` (0–1), `cardsSeen`, `questionsSeen`, `updatedAt` | `trackId` |
| `pathProgress` | `nodeId` | `status`, `startedAt`, `doneAt`, `note` | `status` |
| `userCards` | `id` | `topicId`, `front`, `back`, `createdAt` | `topicId` |
| `syncQueue` | `sessionId` | `kind`, `at`, `attempts`, `nextAttemptAt`, `lastError`, `sentAt?` | `nextAttemptAt` |
| `settings` | `id` (=`'me'`) | `theme`, `calm`, `dailyTarget`, `examDates`, `studyToken?`, `heartbeatOrigin`, `timeZone`, `linkState`, `schemaVersion` | none |
| `meta` | `key` | `contentVersion`, `lastExportAt` | none |

Notes:

- `sessions.id` **is** the XP `sessionId`: generated once, matches `^[A-Za-z0-9_-]{8,64}$`, reused on every retry. That is what makes retries free on the HeartBeat side.
- `dayKey` is `YYYY-MM-DD` in the learner's timezone, never UTC (HeartBeat's rule).
- `reviewLog` is the source of truth. `cardState` and `mastery` are derived and can be rebuilt from it; a repair function replays the log.
- The `studyToken` lives in `settings`. **It is excluded from export.**
- `[a+b]` are compound indexes.

**Readiness** (derived, not stored):

```
readiness(track) = Σ over domains ( domain.weight × mastery(domain) )
mastery(domain)  = 0.5 × recallRate(cards, last 30 days) + 0.5 × quizAccuracy(questions, last 30 days)
```

The 0.5/0.5 split is a starting guess; tune it against your own practice-exam results.

## 3. HeartBeat tables the bridge touches (verified)

| Table | Migration | Role for Lantern |
|---|---|---|
| `study_tokens` | `0010_study_link.sql` | `token_hash` (PK, hash only), `couple_id`, `member_id`, `time_zone`, `created_at`, `last_used_at`, `revoked_at`. One live token per member. Created by HeartBeat `POST /api/study/link`. |
| `study_days` | `0010_study_link.sql` | `(member_id, day)` PK, `xp`, `sessions`. Drives the 120 XP daily cap. **Never pruned** (audit finding). |
| `pet_xp_awards` | created inside `functions/api/pet.ts` at request time, not by a numbered migration | `(couple_id, id)` PK, `member_id`, `amount`, `credited`, `created_at`. Award id `study-<sessionId>` deduplicates retries. **Never pruned.** |

Lantern reads and writes none of these directly; it only calls `POST /api/study/session`. Do not add a study-specific table to HeartBeat's D1 for v1.

Growth note: each credited session writes one `pet_xp_awards` row and updates one `study_days` row (a few D1 rows, index entries included). At 5 sessions a day for one learner that is trivial; it matters only if many people ever use the bridge.

## 4. Optional v2 sync (decision deferred)

Only if you use more than one device for real.

- One row **per deck/domain**, not per card: `{ trackId, domainId, updatedAt, cardStateBlob }`, where the blob is a compact array of `[cardId, ease, intervalDays, dueAt, reps, lapses]`.
- `reviewLog` stays local (or is summarized: one row per `(cardId, day)` after 30 days).
- Last-write-wins **per domain** by `updatedAt`, with the same clock rule HeartBeat should adopt: the server clamps `updatedAt` to `now + small skew`.
- Transport: a new `/api/study-state` pair on HeartBeat's Pages Functions, guarded by the study token. **This adds D1 load** (see the audit): budget it before building, and decide it only after Workers Paid.
- Cost check before building: rows per learner ≈ domains (about 15) × writes per day. Keep it under about 30 rows written per day.

## 5. Merge rule for import

1. Import validates `schemaVersion`, `contentVersion` and a checksum.
2. `cardState`: keep the row with the greater `lastReviewedAt`.
3. `reviewLog`, `quizAnswers`, `sessions`: union by `id`; never delete.
4. `settings`: keep local; never import `studyToken`.
5. After merge, rebuild `cardState` and `mastery` from `reviewLog` and show the diff summary.

## 6. Retention and pruning

| Data | Keep |
|---|---|
| `reviewLog` | Forever locally (small: ~100 bytes/review); compact rows older than 12 months into daily aggregates if it exceeds ~50k rows. |
| `quizAnswers` | 12 months, then aggregate per question. |
| `syncQueue` | Delete on success; drop entries older than 30 days with a visible notice. |
| Exports | User-owned. Suggest a monthly backup reminder. |

## 7. Migrations

- Dexie `version(n).stores({...})` per schema change; every migration has a test using `fake-indexeddb`.
- Content changes never need a DB migration (progress keys on stable ids). A **removed** card id stays in `cardState` as an orphan; a startup sweep marks it `suspended` and ignores it in due queues.
