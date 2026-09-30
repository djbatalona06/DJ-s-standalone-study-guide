import type { Seen } from '../quiz/pick';

export interface AnswerRow {
  questionId: string;
  domainId: string;
  correct: boolean;
  at: number;
}

/** Answers older than the latest this many in a domain stop counting: mastery should follow now. */
export const ACCURACY_WINDOW = 30;
/** Fewer answers than this say too little to blend into mastery. */
export const MIN_ANSWERS = 5;

/** Recent accuracy per domain (0–1), for domains with enough answers to mean something. */
export function quizAccuracy(rows: readonly AnswerRow[]): Map<string, number> {
  const byDomain = new Map<string, AnswerRow[]>();
  for (const row of rows) byDomain.set(row.domainId, [...(byDomain.get(row.domainId) ?? []), row]);
  const out = new Map<string, number>();
  for (const [domainId, list] of byDomain) {
    const recent = list.sort((a, b) => b.at - a.at).slice(0, ACCURACY_WINDOW);
    if (recent.length >= MIN_ANSWERS) out.set(domainId, recent.filter((r) => r.correct).length / recent.length);
  }
  return out;
}

/** Per question: how often it has been asked and whether the latest answer was right. */
export function questionHistory(rows: readonly AnswerRow[]): Map<string, Seen> {
  const out = new Map<string, Seen>();
  const lastAt = new Map<string, number>();
  for (const row of rows) {
    const seen = out.get(row.questionId) ?? { lastCorrect: row.correct, times: 0 };
    seen.times += 1;
    if (row.at >= (lastAt.get(row.questionId) ?? -Infinity)) {
      seen.lastCorrect = row.correct;
      lastAt.set(row.questionId, row.at);
    }
    out.set(row.questionId, seen);
  }
  return out;
}
