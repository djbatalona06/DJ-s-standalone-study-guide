import { describe, expect, it } from 'vitest';
import { streak } from './streak';

describe('streak', () => {
  it('is zero with nothing studied', () => {
    expect(streak([], '2026-09-30')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(streak(['2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-30')).toBe(3);
  });

  it('keeps yesterday’s run alive until today is over', () => {
    expect(streak(['2026-09-28', '2026-09-29'], '2026-09-30')).toBe(2);
  });

  it('stops at a gap', () => {
    expect(streak(['2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30'], '2026-09-30')).toBe(3);
  });

  it('is zero when the last study day was two days ago', () => {
    expect(streak(['2026-09-28'], '2026-09-30')).toBe(0);
  });

  it('ignores duplicates and crosses month ends', () => {
    expect(streak(['2026-08-31', '2026-09-01', '2026-09-01'], '2026-09-01')).toBe(2);
  });
});
