import { describe, expect, it } from 'vitest';
import {
  EASE_CEILING, EASE_FLOOR, EASE_START, MAX_INTERVAL, adjustEase, isDue, newState, nextInterval, review,
  type CardState,
} from './srs';

const DAY = '2026-03-10';

function graded(overrides: Partial<CardState> = {}): CardState {
  return { ...newState('c', DAY, 0), ...overrides };
}

describe('scheduling', () => {
  it('shows a new card again tomorrow, or in six days if it was easy', () => {
    expect(review(graded(), 'good', DAY, 1).dueOn).toBe('2026-03-11');
    expect(review(graded(), 'hard', DAY, 1).dueOn).toBe('2026-03-11');
    expect(review(graded(), 'easy', DAY, 1).dueOn).toBe('2026-03-16');
  });

  it('gives a card that survived tomorrow a week', () => {
    const next = review(graded({ streak: 1, interval: 1, reviews: 1 }), 'good', DAY, 1);
    expect(next.interval).toBe(6);
  });

  it('grows by ease after the two fixed steps and always moves at least a day further', () => {
    const next = review(graded({ streak: 2, interval: 6, ease: 2.5, reviews: 2 }), 'good', DAY, 1);
    expect(next.interval).toBe(15);
    expect(nextInterval({ streak: 5, interval: 1, }, 'good', EASE_FLOOR)).toBeGreaterThanOrEqual(2);
  });

  it('caps the interval at a year', () => {
    expect(nextInterval({ streak: 9, interval: 360 }, 'easy', EASE_CEILING)).toBe(MAX_INTERVAL);
  });
});

describe('again', () => {
  it('brings the card back today without resetting what it had earned', () => {
    const before = graded({ streak: 4, interval: 20, ease: 2.6, reviews: 8 });
    const after = review(before, 'again', DAY, 1);
    expect(after.dueOn).toBe(DAY);
    expect(after.interval).toBe(0);
    expect(after.streak).toBe(0);
    expect(after.reviews).toBe(9);
    expect(after.ease).toBeLessThan(before.ease);
    expect(after.ease).toBeGreaterThan(before.ease - 0.4);
  });

  it('counts a lapse only for a card that had been answered before', () => {
    expect(review(graded(), 'again', DAY, 1).lapses).toBe(0);
    expect(review(graded({ reviews: 3 }), 'again', DAY, 1).lapses).toBe(1);
  });
});

describe('ease', () => {
  it('never leaves its floor and ceiling', () => {
    let low = EASE_START;
    for (let i = 0; i < 40; i += 1) low = adjustEase(low, 'again');
    expect(low).toBe(EASE_FLOOR);
    let high = EASE_START;
    for (let i = 0; i < 40; i += 1) high = adjustEase(high, 'easy');
    expect(high).toBe(EASE_CEILING);
  });

  it('recovers from a NaN rather than propagating it', () => {
    expect(adjustEase(Number.NaN, 'good')).toBeGreaterThanOrEqual(EASE_FLOOR);
  });
});

describe('isDue', () => {
  it('offers due and overdue cards, never tomorrow’s', () => {
    expect(isDue({ dueOn: DAY }, DAY)).toBe(true);
    expect(isDue({ dueOn: '2026-03-01' }, DAY)).toBe(true);
    expect(isDue({ dueOn: '2026-03-11' }, DAY)).toBe(false);
  });
});
