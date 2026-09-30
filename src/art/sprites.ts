/**
 * Every pixel of the character, as text. Same format as HeartBeat's
 * `domain/rpg/sprites.ts`: sixteen rows of sixteen characters, where each
 * character names a role rather than a colour. `Sprite.tsx` resolves the roles
 * to CSS custom properties, so he recolours with the palette and there is no
 * image file to license, precache or lose.
 *
 * To draw a new pose (the help desk headset is next), copy a sprite, change
 * the characters, and run `npm test`: `sprites.test.ts` checks the shape.
 */
export const SPRITE_SIZE = 16;

export const PALETTE = {
  '.': 'transparent',
  o: 'var(--sprite-outline)',
  m: 'var(--sprite-mid)',
  l: 'var(--sprite-light)',
  a: 'var(--color-accent)',
} as const;

export type PaletteKey = keyof typeof PALETTE;
export type Sprite = readonly string[];

export const SPRITES = {
  // Foundations: hoodie up, laptop open, screen glow in the glasses.
  // Two frames, hands swapping, is the typing idle.
  'hacker-idle-a': [
    '................',
    '.....oooooo.....',
    '....ommmmmmo....',
    '...ommmmmmmmo...',
    '...omllllllmo...',
    '...omaallaamo...',
    '...omllllllmo...',
    '...ommllllmmo...',
    '..ommmmmmmmmmo..',
    '.ommmmmmmmmmmmo.',
    '.ommoooooooommo.',
    '.omlommmmmmommo.',
    '.ommommaammommo.',
    '.ommommmmmmolmo.',
    '.omoooooooooomo.',
    '..oooooooooooo..',
  ],
  'hacker-idle-b': [
    '................',
    '.....oooooo.....',
    '....ommmmmmo....',
    '...ommmmmmmmo...',
    '...omllllllmo...',
    '...omaallaamo...',
    '...omllllllmo...',
    '...ommllllmmo...',
    '..ommmmmmmmmmo..',
    '.ommmmmmmmmmmmo.',
    '.ommoooooooommo.',
    '.ommommmmmmolmo.',
    '.ommommaammommo.',
    '.omlommmmmmommo.',
    '.omoooooooooomo.',
    '..oooooooooooo..',
  ],
} satisfies Record<string, Sprite>;

export type SpriteKey = keyof typeof SPRITES;

/** The stages of the career path, in order. Only the first has art so far. */
export const STAGES = ['Foundations', 'Help desk', 'Specialize', 'Sysadmin', 'Cloud'] as const;
export type Stage = (typeof STAGES)[number];

/** Which frames play for each stage that has been drawn. */
export const STAGE_FRAMES: Partial<Record<Stage, SpriteKey[]>> = {
  Foundations: ['hacker-idle-a', 'hacker-idle-b'],
};

/** A pixel run: one `<rect>` instead of one per pixel. */
export interface Run {
  x: number;
  y: number;
  width: number;
  key: Exclude<PaletteKey, '.'>;
}

/** Collapses each row into runs of the same colour, skipping transparency. */
export function runs(sprite: Sprite): Run[] {
  const out: Run[] = [];
  sprite.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x] as PaletteKey;
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== '.') out.push({ x, y, width: end - x, key });
      x = end;
    }
  });
  return out;
}
