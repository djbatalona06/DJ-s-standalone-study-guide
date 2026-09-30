import { describe, expect, it } from 'vitest';
import { PALETTE, SPRITES, SPRITE_SIZE, STAGE_FRAMES, runs } from './sprites';

describe('sprites', () => {
  it.each(Object.entries(SPRITES))('%s is 16 rows of 16 known characters', (_, sprite) => {
    expect(sprite).toHaveLength(SPRITE_SIZE);
    for (const row of sprite) {
      expect(row).toHaveLength(SPRITE_SIZE);
      for (const ch of row) expect(Object.keys(PALETTE)).toContain(ch);
    }
  });

  it('every stage frame names a sprite that exists', () => {
    for (const frames of Object.values(STAGE_FRAMES)) {
      for (const key of frames ?? []) expect(SPRITES).toHaveProperty(key);
    }
  });

  it('runs cover every opaque pixel exactly once', () => {
    const sprite = SPRITES['hacker-idle-a'];
    const opaque = sprite.join('').replace(/\./g, '').length;
    expect(runs(sprite).reduce((n, r) => n + r.width, 0)).toBe(opaque);
  });

  it('runs merge neighbours of the same colour', () => {
    expect(runs(['oo.a'])).toEqual([
      { x: 0, y: 0, width: 2, key: 'o' },
      { x: 3, y: 0, width: 1, key: 'a' },
    ]);
  });
});
