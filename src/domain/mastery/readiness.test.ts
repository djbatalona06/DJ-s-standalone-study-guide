import { describe, expect, it } from 'vitest';
import { MATURE_DAYS, cardMastery, domainMastery, readiness } from './readiness';
import { newState, type CardState } from '../srs/srs';

const seen = (id: string, interval: number): CardState => ({
  ...newState(id, '2026-03-10', 0), interval, reviews: 1,
});

describe('cardMastery', () => {
  it('is nothing until a card has been answered', () => {
    expect(cardMastery(undefined)).toBe(0);
    expect(cardMastery(newState('a', '2026-03-10', 0))).toBe(0);
  });

  it('grows with the interval and stops at one', () => {
    expect(cardMastery(seen('a', MATURE_DAYS / 3))).toBeCloseTo(1 / 3);
    expect(cardMastery(seen('a', 400))).toBe(1);
  });
});

describe('domainMastery', () => {
  const states = new Map([['a', seen('a', MATURE_DAYS)], ['b', seen('b', 0)]]);

  it('averages over every card, seen or not', () => {
    const m = domainMastery({ id: 'd', weight: 1, cardIds: ['a', 'b', 'c', 'd'] }, states);
    expect(m.recall).toBeCloseTo(0.25);
    expect(m.mastery).toBeCloseTo(0.25);
  });

  it('blends quiz accuracy in evenly when there is any', () => {
    const m = domainMastery({ id: 'd', weight: 1, cardIds: ['a'] }, states, 0.5);
    expect(m.mastery).toBeCloseTo(0.75);
  });

  it('is zero, not NaN, for a domain with no cards yet', () => {
    expect(domainMastery({ id: 'd', weight: 1, cardIds: [] }, states).mastery).toBe(0);
  });
});

describe('readiness', () => {
  it('weights domains by their share of the exam', () => {
    const states = new Map([['a', seen('a', MATURE_DAYS)]]);
    const result = readiness(
      [
        { id: 'big', weight: 0.75, cardIds: ['a'] },
        { id: 'small', weight: 0.25, cardIds: ['b'] },
      ],
      states,
    );
    expect(result.readiness).toBeCloseTo(0.75);
    expect(result.weakest?.domainId).toBe('small');
  });

  it('names no weakest domain when nothing has cards', () => {
    expect(readiness([{ id: 'x', weight: 1, cardIds: [] }], new Map()).weakest).toBeUndefined();
  });
});
