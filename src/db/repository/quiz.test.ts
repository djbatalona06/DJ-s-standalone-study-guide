import { beforeEach, describe, expect, it } from 'vitest';
import type { Question } from '../../content/types';
import { db } from '../database';
import {
  discardExam, exportProgress, finishExam, getActiveExam, gradeCard, importProgress, loadQuizAccuracy,
  loadQuizHistory, recentExamScores, recordAnswer, saveExam, setSuspended, startExam,
} from './index';

const DAY = '2026-03-10';
const LATER = '2026-03-20';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const q = (n: number, extra: Partial<Question> = {}): Question => ({
  id: `q${n}`, domainId: n % 2 ? 'a1-d1' : 'a1-d2', type: 'mcq', prompt: 'p',
  choices: ['x', 'y'], answer: 0, explanation: 'why', provenance: 'original', ...extra,
} as Question);

describe('recording an answer', () => {
  it('writes one row and says whether it was right', async () => {
    expect(await recordAnswer('s1', q(1), 0, DAY, 1000)).toBe(true);
    expect(await recordAnswer('s1', q(2), 1, DAY, 2000)).toBe(false);
    const rows = await db.quizAnswers.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.correct).sort()).toEqual([false, true]);
  });

  it('brings the linked card back today after a miss, if it was already scheduled out', async () => {
    await gradeCard('card-a', 'good', 's0', DAY, 1000);
    await gradeCard('card-a', 'good', 's0', LATER, 2000); // pushed well into the future
    const before = (await db.cardState.get('card-a'))!;
    expect(before.dueOn > LATER).toBe(true);
    await recordAnswer('s1', q(1, { cardId: 'card-a' }), 1, LATER, 3000);
    expect((await db.cardState.get('card-a'))!.dueOn).toBe(LATER);
    // The interval and ease are untouched: a quiz miss is a nudge, not a grade.
    expect((await db.cardState.get('card-a'))!.interval).toBe(before.interval);
  });

  it('leaves a card alone when the answer was right, unseen, or suspended', async () => {
    await gradeCard('c-right', 'good', 's0', DAY, 1000);
    await gradeCard('c-susp', 'good', 's0', DAY, 1000);
    await setSuspended('c-susp', true, 1500);
    const dueRight = (await db.cardState.get('c-right'))!.dueOn;
    const dueSusp = (await db.cardState.get('c-susp'))!.dueOn;
    await recordAnswer('s1', q(1, { cardId: 'c-right' }), 0, DAY, 2000);
    await recordAnswer('s1', q(2, { cardId: 'c-susp' }), 1, DAY, 2000);
    await recordAnswer('s1', q(3, { cardId: 'c-unseen' }), 1, DAY, 2000);
    expect((await db.cardState.get('c-right'))!.dueOn).toBe(dueRight);
    expect((await db.cardState.get('c-susp'))!.dueOn).toBe(dueSusp);
    expect(await db.cardState.get('c-unseen')).toBeUndefined();
  });

  it('feeds accuracy and history', async () => {
    for (let i = 0; i < 5; i++) await recordAnswer('s1', q(1 + 2 * i), i < 4 ? 0 : 1, DAY, 1000 + i);
    expect((await loadQuizAccuracy()).get('a1-d1')).toBeCloseTo(0.8);
    expect((await loadQuizHistory()).get('q1')).toEqual({ lastCorrect: true, times: 1 });
  });
});

describe('an exam', () => {
  const questions = Array.from({ length: 6 }, (_, i) => q(i + 1));
  const ids = questions.map((x) => x.id);

  it('can be saved part-way and found again after a reload', async () => {
    const exam = await startExam('a1', ids, 60_000, DAY, 1000);
    await saveExam(exam.id, { answers: { q1: 0 }, flagged: ['q2'], index: 2, remainingMs: 42_000 });
    const back = await getActiveExam('a1');
    expect(back).toMatchObject({ id: exam.id, index: 2, remainingMs: 42_000, flagged: ['q2'], answers: { q1: 0 } });
    expect(await getActiveExam('a2')).toBeUndefined();
  });

  it('scores once, records the answers, and queues one weekly credit', async () => {
    const exam = await startExam('a1', ids, 60_000, DAY, 1000);
    await saveExam(exam.id, { answers: { q1: 0, q2: 0, q3: 0, q4: 1, q5: 0 } }); // q6 left blank
    const first = await finishExam(exam.id, questions, 20_000, DAY, 5000);
    expect(first).toEqual({ queued: true, already: false });
    const second = await finishExam(exam.id, questions, 20_000, DAY, 6000);
    expect(second.already).toBe(true);

    const done = (await db.exams.get(exam.id))!;
    expect(done).toMatchObject({ status: 'done', correct: 4, total: 6, finishedAt: 5000 });
    expect(await db.quizAnswers.count()).toBe(5); // the blank is not a row
    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ sessionId: exam.id, kind: 'weekly' });
    expect(await db.sessions.get(exam.id)).toMatchObject({ reviewed: 5, correct: 4, activeMs: 40_000 });
    expect(await getActiveExam('a1')).toBeUndefined();
  });

  it('earns no XP when fewer than five questions were answered', async () => {
    const exam = await startExam('a1', ids, 60_000, DAY, 1000);
    await saveExam(exam.id, { answers: { q1: 0, q2: 0 } });
    expect((await finishExam(exam.id, questions, 0, DAY, 5000)).queued).toBe(false);
    expect(await db.outbox.count()).toBe(0);
  });

  it('a finished exam cannot be changed by a late save', async () => {
    const exam = await startExam('a1', ids, 60_000, DAY, 1000);
    await finishExam(exam.id, questions, 0, DAY, 5000);
    await saveExam(exam.id, { answers: { q1: 0 } });
    expect((await db.exams.get(exam.id))!.answers).toEqual({});
  });

  it('remembers the newest scores first', async () => {
    for (const [i, right] of [3, 6, 5].entries()) {
      const exam = await startExam('a1', ids, 60_000, DAY, 1000 + i);
      const answers = Object.fromEntries(ids.map((id, k) => [id, k < right ? 0 : 1]));
      await saveExam(exam.id, { answers });
      await finishExam(exam.id, questions, 0, DAY, 2000 + i);
    }
    expect(await recentExamScores('a1')).toEqual([5 / 6, 1]);
  });

  it('can be discarded', async () => {
    const exam = await startExam('a1', ids, 60_000, DAY, 1000);
    await discardExam(exam.id);
    expect(await getActiveExam('a1')).toBeUndefined();
  });
});

describe('backups carry quiz progress', () => {
  it('exports answers and finished exams only, and imports them without duplicating', async () => {
    const questions = [q(1), q(2)];
    await recordAnswer('s1', questions[0], 0, DAY, 1000);
    const done = await startExam('a1', ['q1', 'q2'], 1000, DAY, 1000);
    await finishExam(done.id, questions, 0, DAY, 2000);
    await startExam('a2', ['q1'], 1000, DAY, 3000); // still active

    const file = await exportProgress(9000);
    expect(file.quizAnswers).toHaveLength(1);
    expect(file.exams?.map((e) => e.id)).toEqual([done.id]);

    await db.delete();
    await db.open();
    const summary = await importProgress(file);
    expect(summary).toMatchObject({ answersAdded: 1, examsAdded: 1 });
    expect((await importProgress(file))).toMatchObject({ answersAdded: 0, examsAdded: 0 });
    expect(await db.exams.count()).toBe(1);
  });

  it('still accepts a backup made before quizzes existed', async () => {
    const file = await exportProgress(9000);
    delete file.quizAnswers;
    delete file.exams;
    await expect(importProgress(file)).resolves.toMatchObject({ answersAdded: 0, examsAdded: 0 });
  });
});
