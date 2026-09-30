import { describe, expect, it } from 'vitest';
import { PALETTE, SPRITES, SPRITE_SIZE, STAGES, STAGE_FRAMES, paint, runs } from './sprites';

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

  it('every stage has two frames, and each stage is drawn differently from the one before', () => {
    for (const stage of STAGES) expect(STAGE_FRAMES[stage]).toHaveLength(2);
    for (let i = 1; i < STAGES.length; i++) {
      expect(SPRITES[STAGE_FRAMES[STAGES[i]][0]]).not.toEqual(SPRITES[STAGE_FRAMES[STAGES[i - 1]][0]]);
    }
  });

  it('paint changes only the pixels it is given', () => {
    expect(paint(['....', '....'], [[0, 1, 'a'], [1, 3, 'o']])).toEqual(['.a..', '...o']);
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
