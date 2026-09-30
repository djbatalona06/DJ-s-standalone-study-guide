import { describe, expect, it } from 'vitest';
import { nextIndex, place, scoreLabels } from './diagram';

describe('nextIndex', () => {
  it('moves forward and back, wrapping', () => {
    expect(nextIndex(3, 0, 'ArrowRight')).toBe(1);
    expect(nextIndex(3, 2, 'ArrowDown')).toBe(0);
    expect(nextIndex(3, 0, 'ArrowLeft')).toBe(2);
    expect(nextIndex(3, 1, 'ArrowUp')).toBe(0);
  });

  it('jumps to the ends', () => {
    expect(nextIndex(5, 2, 'Home')).toBe(0);
    expect(nextIndex(5, 2, 'End')).toBe(4);
  });

  it('ignores other keys and empty diagrams', () => {
    expect(nextIndex(3, 1, 'Enter')).toBeNull();
    expect(nextIndex(0, 0, 'ArrowRight')).toBeNull();
  });
});

const PARTS = [
  { id: 'a', label: 'CPU socket' },
  { id: 'b', label: 'DIMM slots' },
  { id: 'c', label: 'CMOS battery' },
];

describe('scoreLabels', () => {
  it('sorts parts into correct, wrong and missing', () => {
    const score = scoreLabels(PARTS, { a: 'CPU socket', b: 'CMOS battery' });
    expect(score).toEqual({ correct: ['a'], wrong: ['b'], missing: ['c'], complete: false });
  });

  it('is complete once every part has a label', () => {
    const score = scoreLabels(PARTS, { a: 'CPU socket', b: 'DIMM slots', c: 'CMOS battery' });
    expect(score.complete).toBe(true);
    expect(score.correct).toHaveLength(3);
  });
});

describe('place', () => {
  it('puts a label on a part', () => {
    expect(place({}, 'a', 'CPU socket')).toEqual({ a: 'CPU socket' });
  });

  it('moves a label rather than copying it', () => {
    expect(place({ a: 'CPU socket' }, 'b', 'CPU socket')).toEqual({ b: 'CPU socket' });
  });

  it('replaces whatever label the part had', () => {
    expect(place({ a: 'DIMM slots', b: 'CPU socket' }, 'a', 'CMOS battery')).toEqual({
      a: 'CMOS battery',
      b: 'CPU socket',
    });
  });
});
