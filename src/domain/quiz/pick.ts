import type { Question } from '../../content/types';
import { seededRandom, shuffled } from './shuffle';

/** What is known about one question from earlier answers. */
export interface Seen {
  /** Whether the most recent answer was right. */
  lastCorrect: boolean;
  times: number;
}

export type History = ReadonlyMap<string, Seen>;

/** Fewest times asked first; ties broken by the seed, so the pick is repeatable. */
function byNovelty(bank: readonly Question[], history: History, seed: string): Question[] {
  const random = seededRandom(seed);
  return bank
    .map((q) => ({ q, times: history.get(q.id)?.times ?? 0, r: random() }))
    .sort((a, b) => a.times - b.times || a.r - b.r)
    .map((x) => x.q);
}

/**
 * A practice quiz: questions never seen come first, then ones last missed, then
 * ones last got right. Shuffled so the order does not give the tier away.
 */
export function pickQuiz(bank: readonly Question[], history: History, n: number, seed: string): Question[] {
  const random = seededRandom(seed);
  const tier = (q: Question) => {
    const seen = history.get(q.id);
    return !seen ? 0 : seen.lastCorrect ? 2 : 1;
  };
  const ranked = bank
    .map((q) => ({ q, t: tier(q), r: random() }))
    .sort((a, b) => a.t - b.t || a.r - b.r)
    .slice(0, n)
    .map((x) => x.q);
  return shuffled(ranked, `${seed}:order`);
}

/**
 * How many of `size` each domain gets: its weight's share, with leftovers going
 * to the largest fractional parts (so the quotas always sum to exactly `size`).
 */
export function quotas(domains: ReadonlyArray<{ id: string; weight: number }>, size: number): Map<string, number> {
  const raw = domains.map((d, i) => ({ id: d.id, i, exact: d.weight * size }));
  const out = new Map(raw.map((r) => [r.id, Math.floor(r.exact)]));
  let left = size - [...out.values()].reduce((n, v) => n + v, 0);
  const order = [...raw].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || a.i - b.i);
  for (const r of order) {
    if (left <= 0) break;
    out.set(r.id, (out.get(r.id) ?? 0) + 1);
    left -= 1;
  }
  return out;
}

/**
 * An exam shaped like the real one: each domain contributes its weighted share,
 * preferring questions asked least often so a second exam is mostly fresh. A
 * domain short of questions is topped up from the rest. Mixed, not grouped.
 */
export function buildExam(
  bank: readonly Question[],
  domains: ReadonlyArray<{ id: string; weight: number }>,
  size: number,
  history: History,
  seed: string,
): Question[] {
  const want = Math.min(size, bank.length);
  const ranked = byNovelty(bank, history, seed);
  const quota = quotas(domains, want);
  const chosen = new Set<string>();
  const picked: Question[] = [];
  for (const d of domains) {
    let take = quota.get(d.id) ?? 0;
    for (const q of ranked) {
      if (take === 0) break;
      if (q.domainId === d.id && !chosen.has(q.id)) {
        chosen.add(q.id);
        picked.push(q);
        take -= 1;
      }
    }
  }
  for (const q of ranked) {
    if (picked.length >= want) break;
    if (!chosen.has(q.id)) {
      chosen.add(q.id);
      picked.push(q);
    }
  }
  return shuffled(picked, `${seed}:order`);
}

/** The exam scales down with a small bank: 90 questions in 90 minutes is one minute each. */
export function examMinutes(size: number, exam: { questions: number; minutes: number }): number {
  return Math.max(1, Math.round((size * exam.minutes) / exam.questions));
}
