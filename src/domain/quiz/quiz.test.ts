import { describe, expect, it } from 'vitest';
import type { Question } from '../../content/types';
import { bookingAdvice } from '../mastery/booking';
import { ACCURACY_WINDOW, MIN_ANSWERS, questionHistory, quizAccuracy } from '../mastery/quiz';
import * as clock from './clock';
import { buildExam, examMinutes, pickQuiz, quotas } from './pick';
import { isAnswered, isCorrect, scoreExam } from './score';
import { permutation, shuffled } from './shuffle';

const base = { domainId: 'd1', explanation: 'because', provenance: 'original' as const };
const mcq: Question = { ...base, id: 'q-mcq', type: 'mcq', prompt: 'p', choices: ['a', 'b', 'c'], answer: 1 };
const multi: Question = { ...base, id: 'q-multi', type: 'multi', prompt: 'p', choices: ['a', 'b', 'c', 'd'], answers: [0, 2] };
const hotspot: Question = { ...base, id: 'q-hot', type: 'hotspot', prompt: 'p', diagramId: 'd', answer: 2 };
const order: Question = { ...base, id: 'q-order', type: 'order', prompt: 'p', items: ['one', 'two', 'three'] };
const match: Question = {
  ...base, id: 'q-match', type: 'match', prompt: 'p',
  pairs: [{ term: 'a', definition: '1' }, { term: 'b', definition: '2' }],
};

describe('shuffling', () => {
  it('is repeatable for one seed and keeps every item', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffled(items, 'x')).toEqual(shuffled(items, 'x'));
    expect([...shuffled(items, 'x')].sort()).toEqual(items);
    expect(shuffled(items, 'x')).not.toEqual(shuffled(items, 'y'));
  });

  it('never returns an ordering question already solved', () => {
    for (let i = 0; i < 200; i++) expect(permutation(3, `seed${i}`, true)).not.toEqual([0, 1, 2]);
  });
});

describe('scoring', () => {
  it('multiple choice is right only on the one answer', () => {
    expect(isCorrect(mcq, 1)).toBe(true);
    expect(isCorrect(mcq, 0)).toBe(false);
    expect(isCorrect(mcq, undefined)).toBe(false);
  });

  it('multi-select must be the exact set: no partial credit, no extras, order does not matter', () => {
    expect(isCorrect(multi, [2, 0])).toBe(true);
    expect(isCorrect(multi, [0])).toBe(false);
    expect(isCorrect(multi, [0, 2, 3])).toBe(false);
    expect(isCorrect(multi, [0, 0])).toBe(false);
    expect(isCorrect(multi, [1, 3])).toBe(false);
  });

  it('a hotspot is right only on the one part', () => {
    expect(isCorrect(hotspot, 2)).toBe(true);
    expect(isCorrect(hotspot, 1)).toBe(false);
    expect(isCorrect(hotspot, undefined)).toBe(false);
    expect(isAnswered(hotspot, 0)).toBe(true);
    expect(isAnswered(hotspot, -1)).toBe(false);
  });

  it('ordering needs every item in place', () => {
    expect(isCorrect(order, [0, 1, 2])).toBe(true);
    expect(isCorrect(order, [1, 0, 2])).toBe(false);
    expect(isAnswered(order, [])).toBe(false);
  });

  it('matching needs every pair right; a blank is wrong', () => {
    expect(isCorrect(match, [0, 1])).toBe(true);
    expect(isCorrect(match, [1, 0])).toBe(false);
    expect(isCorrect(match, [0, -1])).toBe(false);
    expect(isAnswered(match, [-1, -1])).toBe(false);
    expect(isAnswered(match, [-1, 1])).toBe(true);
  });

  it('a wrong shape of answer is never correct', () => {
    expect(isCorrect(mcq, [1])).toBe(false);
    expect(isCorrect(multi, 0)).toBe(false);
  });

  it('scores an exam and splits it by domain', () => {
    const other: Question = { ...mcq, id: 'q-other', domainId: 'd2' };
    const s = scoreExam([mcq, other, multi], { 'q-mcq': 1, 'q-other': 0 });
    expect(s).toMatchObject({ correct: 1, answered: 2, total: 3 });
    expect(s.fraction).toBeCloseTo(1 / 3);
    expect(s.byDomain.get('d1')).toEqual({ correct: 1, total: 2 });
    expect(s.byDomain.get('d2')).toEqual({ correct: 0, total: 1 });
  });
});

describe('quotas and exam building', () => {
  const domains = [
    { id: 'a', weight: 0.13 }, { id: 'b', weight: 0.23 }, { id: 'c', weight: 0.25 },
    { id: 'd', weight: 0.11 }, { id: 'e', weight: 0.28 },
  ];

  it('always sums to the size and follows the weights', () => {
    const q = quotas(domains, 90);
    expect([...q.values()].reduce((n, v) => n + v, 0)).toBe(90);
    expect(q.get('e')).toBe(25); // 0.28 × 90 = 25.2
    expect(q.get('d')).toBe(10); // 9.9 rounds up on the fraction
    for (const size of [1, 7, 33, 90, 91]) {
      expect([...quotas(domains, size).values()].reduce((n, v) => n + v, 0)).toBe(size);
    }
  });

  const bank: Question[] = domains.flatMap((d) =>
    Array.from({ length: 30 }, (_, i): Question => ({ ...mcq, id: `${d.id}-${i}`, domainId: d.id })));

  it('draws each domain in proportion, with no repeats', () => {
    const exam = buildExam(bank, domains, 90, new Map(), 's1');
    expect(exam).toHaveLength(90);
    expect(new Set(exam.map((q) => q.id)).size).toBe(90);
    expect(exam.filter((q) => q.domainId === 'e')).toHaveLength(25);
  });

  it('uses questions not asked before first, within each domain', () => {
    const first = buildExam(bank, domains, 90, new Map(), 's1');
    const history = new Map(first.map((q) => [q.id, { lastCorrect: true, times: 1 }]));
    const second = buildExam(bank, domains, 90, history, 's2');
    for (const d of domains) {
      const askedBefore = first.filter((q) => q.domainId === d.id).length;
      const fresh = second.filter((q) => q.domainId === d.id && !history.has(q.id)).length;
      const want = second.filter((q) => q.domainId === d.id).length;
      expect(fresh).toBe(Math.min(want, 30 - askedBefore));
    }
  });

  it('is repeatable for one seed', () => {
    const ids = (s: string) => buildExam(bank, domains, 90, new Map(), s).map((q) => q.id);
    expect(ids('same')).toEqual(ids('same'));
  });

  it('shrinks to a small bank and tops up a short domain from the rest', () => {
    const small = bank.filter((q) => q.domainId === 'a' ? q.id.endsWith('-0') : Number(q.id.split('-')[1]) < 9);
    expect(small).toHaveLength(37); // 1 + 4 × 9
    const exam = buildExam(small, domains, 90, new Map(), 's');
    expect(exam).toHaveLength(37);
    expect(exam.filter((q) => q.domainId === 'a')).toHaveLength(1);
    const half = buildExam(small, domains, 20, new Map(), 's');
    expect(half).toHaveLength(20);
    expect(new Set(half.map((q) => q.id)).size).toBe(20);
  });

  it('scales the time with the size', () => {
    expect(examMinutes(90, { questions: 90, minutes: 90 })).toBe(90);
    expect(examMinutes(45, { questions: 90, minutes: 90 })).toBe(45);
    expect(examMinutes(1, { questions: 90, minutes: 90 })).toBe(1);
  });
});

describe('practice quiz picking', () => {
  const bank: Question[] = Array.from({ length: 12 }, (_, i) => ({ ...mcq, id: `p${i}` }));

  it('asks unseen questions first, then last-missed, then last-right', () => {
    const history = new Map([
      ['p0', { lastCorrect: true, times: 3 }], ['p1', { lastCorrect: false, times: 1 }],
      ...bank.slice(2, 10).map((q): [string, { lastCorrect: boolean; times: number }] => [q.id, { lastCorrect: true, times: 1 }]),
    ]);
    const ids = pickQuiz(bank, history, 4, 's').map((q) => q.id);
    expect(ids).toContain('p10');
    expect(ids).toContain('p11');
    expect(ids).toContain('p1');
    expect(ids).not.toContain('p0');
  });
});

describe('the exam clock', () => {
  it('counts down while running and stops while paused', () => {
    let c = clock.startClock(60_000, 1_000);
    expect(clock.remaining(c, 11_000)).toBe(50_000);
    c = clock.pause(c, 11_000);
    expect(clock.remaining(c, 500_000)).toBe(50_000); // hidden for a long time, nothing lost
    c = clock.resume(c, 500_000);
    expect(clock.remaining(c, 510_000)).toBe(40_000);
  });

  it('never goes below zero or backwards when the system clock jumps', () => {
    const c = clock.startClock(5_000, 10_000);
    expect(clock.remaining(c, 99_000)).toBe(0);
    expect(clock.expired(c, 99_000)).toBe(true);
    expect(clock.remaining(c, 1_000)).toBe(5_000);
  });

  it('a reloaded exam starts paused with what was saved', () => {
    const c = clock.pausedClock(30_000);
    expect(clock.remaining(c, 1e12)).toBe(30_000);
    expect(clock.remaining(clock.resume(c, 100), 5_100)).toBe(25_000);
  });

  it('formats minutes and seconds', () => {
    expect(clock.format(90 * 60_000)).toBe('90:00');
    expect(clock.format(61_000)).toBe('1:01');
    expect(clock.format(0)).toBe('0:00');
  });
});

describe('quiz accuracy and history', () => {
  const row = (i: number, correct: boolean, domainId = 'd1') => ({ questionId: `q${i}`, domainId, correct, at: i });

  it('says nothing until a domain has enough answers', () => {
    const few = Array.from({ length: MIN_ANSWERS - 1 }, (_, i) => row(i, true));
    expect(quizAccuracy(few).has('d1')).toBe(false);
    expect(quizAccuracy([...few, row(99, false)]).get('d1')).toBeCloseTo(4 / 5);
  });

  it('follows the most recent answers, not the whole past', () => {
    const old = Array.from({ length: 50 }, (_, i) => row(i, false));
    const recent = Array.from({ length: ACCURACY_WINDOW }, (_, i) => row(1000 + i, true));
    expect(quizAccuracy([...old, ...recent]).get('d1')).toBe(1);
  });

  it('remembers how often and how the last answer went', () => {
    const h = questionHistory([
      { questionId: 'a', domainId: 'd', correct: true, at: 1 },
      { questionId: 'a', domainId: 'd', correct: false, at: 3 },
      { questionId: 'a', domainId: 'd', correct: true, at: 2 },
    ]);
    expect(h.get('a')).toEqual({ lastCorrect: false, times: 3 });
  });
});

describe('booking advice', () => {
  it('needs readiness and both of the last two exams at the bar', () => {
    expect(bookingAdvice(0.9, [0.88, 0.86]).ready).toBe(true);
    expect(bookingAdvice(0.9, [0.88, 0.8]).ready).toBe(false);
    expect(bookingAdvice(0.8, [0.9, 0.9]).ready).toBe(false);
    expect(bookingAdvice(0.9, [0.95]).ready).toBe(false);
  });

  it('only the newest two exams count', () => {
    expect(bookingAdvice(0.9, [0.9, 0.9, 0.2]).ready).toBe(true);
  });

  it('says what is missing in plain words', () => {
    expect(bookingAdvice(0.4, []).message).toContain('no practice exams yet');
    expect(bookingAdvice(0.4, [0.7, 0.8]).message).toContain('70% and 80%');
  });
});
