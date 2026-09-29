import { describe, expect, it } from 'vitest';
import { buildQueue, dueCount, requeue } from './queue';
import { newState, type CardState } from './srs';

const DAY = '2026-03-10';
const ids = ['a', 'b', 'c', 'd', 'e'];

function states(entries: Record<string, Partial<CardState>>): Map<string, CardState> {
  return new Map(
    Object.entries(entries).map(([id, patch]) => [id, { ...newState(id, DAY, 0), ...patch }]),
  );
}

describe('buildQueue', () => {
  it('puts due cards first, most overdue first, then new cards', () => {
    const map = states({
      b: { dueOn: '2026-03-09' },
      c: { dueOn: '2026-03-01' },
      d: { dueOn: '2026-03-20' },
    });
    expect(buildQueue(ids, map, DAY)).toEqual(['c', 'b', 'a', 'e']);
  });

  it('refuses new cards once the day’s intake is used', () => {
    expect(buildQueue(ids, new Map(), DAY, { newPerDay: 2 })).toEqual(['a', 'b']);
    expect(buildQueue(ids, new Map(), DAY, { newPerDay: 2, introducedToday: 2 })).toEqual([]);
  });

  it('never lets new material crowd out due work', () => {
    const map = states({ a: {}, b: {}, c: {} });
    expect(buildQueue(ids, map, DAY, { max: 3, newPerDay: 5 })).toEqual(['a', 'b', 'c']);
  });

  it('skips suspended cards', () => {
    const map = states({ a: { suspended: true }, b: {} });
    expect(buildQueue(['a', 'b'], map, DAY)).toEqual(['b']);
  });
});

describe('dueCount and requeue', () => {
  it('counts only due, unsuspended, already-seen cards', () => {
    const map = states({ a: {}, b: { dueOn: '2026-04-01' }, c: { suspended: true } });
    expect(dueCount(ids, map, DAY)).toBe(1);
  });

  it('sends a card to the back without losing any', () => {
    expect(requeue(['a', 'b', 'c'], 0)).toEqual(['b', 'c', 'a']);
    expect(requeue(['a', 'b'], 9)).toEqual(['a', 'b']);
  });
});
