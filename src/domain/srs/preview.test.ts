import { describe, expect, it } from 'vitest';
import { intervalLabel, previewIntervals } from './preview';
import { newState, review } from './srs';

describe('previewIntervals', () => {
  it('matches what grading a new card actually schedules', () => {
    const preview = previewIntervals(undefined, 'c', '2026-09-30', 0);
    expect(preview).toEqual({ again: 0, hard: 1, good: 1, easy: 6 });
  });

  it('matches review() for a card already in progress', () => {
    let state = newState('c', '2026-09-01', 0);
    state = review(state, 'good', '2026-09-01', 0);
    state = review(state, 'good', '2026-09-02', 0);
    const preview = previewIntervals(state, 'c', '2026-09-08', 0);
    expect(preview.good).toBe(review(state, 'good', '2026-09-08', 0).interval);
    expect(preview.hard).toBeLessThan(preview.good);
    expect(preview.easy).toBeGreaterThan(preview.good);
  });
});

describe('intervalLabel', () => {
  it.each([
    [0, 'today'], [1, '1 d'], [6, '6 d'], [13, '13 d'], [21, '3 wk'], [90, '3 mo'], [365, '1 y'],
  ])('%i days reads %s', (days, label) => {
    expect(intervalLabel(days)).toBe(label);
  });
});
