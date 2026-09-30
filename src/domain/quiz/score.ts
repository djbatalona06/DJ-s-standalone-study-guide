import type { Answer, Question } from '../../content/types';

/** An untouched ordering question counts as unanswered, since it starts shuffled. */
export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (a === undefined) return false;
  if (q.type === 'mcq' || q.type === 'hotspot') return typeof a === 'number' && a >= 0;
  if (typeof a === 'number') return false;
  if (q.type === 'multi') return a.length > 0;
  if (q.type === 'order') return a.length === q.items.length;
  return a.some((v) => v >= 0);
}

const sameSet = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && new Set(a).size === a.length && b.every((v) => a.includes(v));

/** Multi-select is exact: one wrong pick or one missed pick is wrong. No partial credit. */
export function isCorrect(q: Question, a: Answer | undefined): boolean {
  if (!isAnswered(q, a)) return false;
  switch (q.type) {
    case 'mcq':
    case 'hotspot': return a === q.answer;
    case 'multi': return Array.isArray(a) && sameSet(a, q.answers);
    case 'order': return Array.isArray(a) && a.every((v, i) => v === i);
    case 'match': return Array.isArray(a) && a.length === q.pairs.length && a.every((v, i) => v === i);
  }
}

export interface ExamScore {
  correct: number;
  answered: number;
  total: number;
  /** 0–1. */
  fraction: number;
  byDomain: Map<string, { correct: number; total: number }>;
}

export function scoreExam(questions: readonly Question[], answers: Readonly<Record<string, Answer>>): ExamScore {
  const byDomain = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  let answered = 0;
  for (const q of questions) {
    const a = answers[q.id];
    const ok = isCorrect(q, a);
    if (isAnswered(q, a)) answered += 1;
    if (ok) correct += 1;
    const row = byDomain.get(q.domainId) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (ok) row.correct += 1;
    byDomain.set(q.domainId, row);
  }
  const total = questions.length;
  return { correct, answered, total, fraction: total ? correct / total : 0, byDomain };
}
