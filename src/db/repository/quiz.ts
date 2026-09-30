import { db, type ExamRow, type QuizAnswerRow } from '../database';
import type { Answer, Question, TrackId } from '../../content/types';
import type { DayKey } from '../../domain/day';
import { questionHistory, quizAccuracy, type AnswerRow } from '../../domain/mastery/quiz';
import { isAnswered, isCorrect, scoreExam } from '../../domain/quiz/score';
import { finishSession, startSession } from './sessions';
import { id } from './shared';

/**
 * Writes answers and, for each miss, brings the linked card back today.
 * Must run inside a transaction that includes `quizAnswers` and `cardState`.
 * A card never seen before is left alone (it will arrive as a new card), and a
 * suspended card stays hidden.
 */
async function saveAnswers(
  sessionId: string,
  items: ReadonlyArray<{ question: Question; answer: Answer | undefined }>,
  day: DayKey,
  at: number,
): Promise<boolean[]> {
  const results: boolean[] = [];
  for (const { question, answer } of items) {
    const correct = isCorrect(question, answer);
    results.push(correct);
    if (!isAnswered(question, answer)) continue;
    await db.quizAnswers.add({ id: id(), questionId: question.id, domainId: question.domainId, correct, at, sessionId });
    if (!correct && question.cardId) {
      const state = await db.cardState.get(question.cardId);
      if (state && !state.suspended && state.dueOn > day) {
        await db.cardState.put({ ...state, dueOn: day, updatedAt: at });
      }
    }
  }
  return results;
}

/** One practice-quiz answer. Returns whether it was right. */
export async function recordAnswer(
  sessionId: string,
  question: Question,
  answer: Answer,
  day: DayKey,
  at: number,
): Promise<boolean> {
  const [correct] = await db.transaction('rw', db.quizAnswers, db.cardState, () =>
    saveAnswers(sessionId, [{ question, answer }], day, at));
  return correct;
}

function rows(list: QuizAnswerRow[]): AnswerRow[] {
  return list.map(({ questionId, domainId, correct, at }) => ({ questionId, domainId, correct, at }));
}

export async function loadAnswerRows(): Promise<AnswerRow[]> {
  return rows(await db.quizAnswers.toArray());
}

/** Per question: how often asked, and whether the last answer was right. */
export async function loadQuizHistory() {
  return questionHistory(await loadAnswerRows());
}

export async function loadQuizAccuracy() {
  return quizAccuracy(await loadAnswerRows());
}

export async function startExam(
  trackId: TrackId,
  questionIds: string[],
  totalMs: number,
  day: DayKey,
  at: number,
): Promise<ExamRow> {
  const session = await startSession('exam', trackId, day, at);
  const row: ExamRow = {
    id: session.id, trackId, questionIds, answers: {}, flagged: [], index: 0,
    remainingMs: totalMs, totalMs, status: 'active', startedAt: at, total: questionIds.length,
  };
  await db.exams.put(row);
  return row;
}

export async function getExam(examId: string): Promise<ExamRow | undefined> {
  return db.exams.get(examId);
}

export async function getActiveExam(trackId: TrackId): Promise<ExamRow | undefined> {
  const active = await db.exams.where('trackId').equals(trackId).filter((e) => e.status === 'active').toArray();
  return active.sort((a, b) => b.startedAt - a.startedAt)[0];
}

type ExamPatch = Partial<Pick<ExamRow, 'answers' | 'flagged' | 'index' | 'remainingMs'>>;

/** Saves progress. A finished exam is never changed. */
export async function saveExam(examId: string, patch: ExamPatch): Promise<void> {
  await db.transaction('rw', db.exams, async () => {
    const exam = await db.exams.get(examId);
    if (exam && exam.status === 'active') await db.exams.put({ ...exam, ...patch });
  });
}

/** Throws the exam away. It never earned XP, and its session row simply stays unfinished. */
export async function discardExam(examId: string): Promise<void> {
  await db.exams.delete(examId);
}

/**
 * Scores an exam and ends it in one transaction: the answers, the score, and the
 * queued XP land together or not at all. Safe to call twice (the timer running
 * out and a tap on Submit can race); the second call changes nothing.
 */
export async function finishExam(
  examId: string,
  questions: readonly Question[],
  remainingMs: number,
  day: DayKey,
  at: number,
): Promise<{ queued: boolean; already: boolean }> {
  return db.transaction('rw', db.exams, db.quizAnswers, db.cardState, db.sessions, db.outbox, async () => {
    const exam = await db.exams.get(examId);
    if (!exam || exam.status === 'done') return { queued: false, already: true };
    const score = scoreExam(questions, exam.answers);
    await saveAnswers(examId, questions.map((question) => ({ question, answer: exam.answers[question.id] })), day, at);
    await db.exams.put({ ...exam, status: 'done', finishedAt: at, correct: score.correct, total: questions.length, remainingMs });
    const { queued } = await finishSession(
      examId,
      { reviewed: score.answered, correct: score.correct, activeMs: Math.max(0, exam.totalMs - remainingMs) },
      at,
    );
    return { queued, already: false };
  });
}

/** Score (0–1) of each finished exam for a track, newest first. */
export async function recentExamScores(trackId: TrackId, n = 2): Promise<number[]> {
  const done = await db.exams.where('trackId').equals(trackId).filter((e) => e.status === 'done').toArray();
  return done
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
    .slice(0, n)
    .map((e) => (e.total ? (e.correct ?? 0) / e.total : 0));
}
