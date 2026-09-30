import { describe, expect, it } from 'vitest';
import { EMPTY_MATCH, matchScore, tryMatch } from './match';

const PARTS = [
  { id: 'a', label: 'CPU socket' },
  { id: 'b', label: 'DIMM slots' },
];

describe('tryMatch', () => {
  it('locks a right pair', () => {
    const { state, correct } = tryMatch(PARTS, EMPTY_MATCH, 'a', 'CPU socket');
    expect(correct).toBe(true);
    expect(state.matched).toEqual({ a: 'CPU socket' });
  });

  it('remembers a miss once and places nothing', () => {
    let state = tryMatch(PARTS, EMPTY_MATCH, 'a', 'DIMM slots').state;
    state = tryMatch(PARTS, state, 'a', 'DIMM slots').state;
    expect(state).toEqual({ matched: {}, missed: ['DIMM slots'] });
  });

  it('ignores a locked part and an unknown id', () => {
    const locked = tryMatch(PARTS, EMPTY_MATCH, 'a', 'CPU socket').state;
    expect(tryMatch(PARTS, locked, 'a', 'DIMM slots')).toEqual({ state: locked, correct: false });
    expect(tryMatch(PARTS, locked, 'zz', 'DIMM slots')).toEqual({ state: locked, correct: false });
  });
});

describe('matchScore', () => {
  it('counts first-try matches and finishes when all are matched', () => {
    let state = tryMatch(PARTS, EMPTY_MATCH, 'a', 'DIMM slots').state; // miss
    expect(matchScore(PARTS, state)).toEqual({ matched: 0, firstTry: 0, done: false });
    state = tryMatch(PARTS, state, 'a', 'CPU socket').state;
    state = tryMatch(PARTS, state, 'b', 'DIMM slots').state;
    expect(matchScore(PARTS, state)).toEqual({ matched: 2, firstTry: 1, done: true });
  });
});
