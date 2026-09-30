import { describe, expect, it } from 'vitest';
import { shuffled, step } from './flashcards';

describe('shuffled', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('keeps every item exactly once', () => {
    expect([...shuffled(items, 7)].sort((a, b) => a - b)).toEqual(items);
  });

  it('is repeatable for a seed and differs between seeds', () => {
    expect(shuffled(items, 7)).toEqual(shuffled(items, 7));
    expect(shuffled(items, 7)).not.toEqual(shuffled(items, 8));
  });

  it('does not touch the input', () => {
    const copy = [...items];
    shuffled(items, 3);
    expect(items).toEqual(copy);
  });
});

describe('step', () => {
  it('moves forward to the end screen and no further', () => {
    expect(step(0, 3, 1)).toBe(1);
    expect(step(2, 3, 1)).toBe(3);
    expect(step(3, 3, 1)).toBe(3);
  });

  it('never goes before the first card', () => {
    expect(step(0, 3, -1)).toBe(0);
    expect(step(3, 3, -1)).toBe(2);
  });
});
