import { describe, expect, it } from 'vitest';
import { isCalm, textScale } from './display';

describe('isCalm', () => {
  it('is calm when the app setting or the system asks', () => {
    expect(isCalm(false, false)).toBe(false);
    expect(isCalm(true, false)).toBe(true);
    expect(isCalm(false, true)).toBe(true);
    expect(isCalm(true, true)).toBe(true);
  });
});

describe('textScale', () => {
  it('maps each size to a percentage of the root font size', () => {
    expect([textScale('default'), textScale('large'), textScale('larger')]).toEqual([100, 112.5, 125]);
  });
  it('falls back to the default for missing or unknown values', () => {
    expect(textScale(undefined)).toBe(100);
    expect(textScale('huge')).toBe(100);
  });
});
