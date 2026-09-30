/**
 * Every pixel of the character, as text. Same format as HeartBeat's
 * `domain/rpg/sprites.ts`: sixteen rows of sixteen characters, where each
 * character names a role rather than a colour. `Sprite.tsx` resolves the roles
 * to CSS custom properties, so he recolours with the palette and there is no
 * image file to license, precache or lose.
 *
 * To draw a new pose, copy a sprite, change the characters, and run
 * `npm test`: `sprites.test.ts` checks the shape. Later stages are the
 * Foundations sprite plus what each stage adds (see `paint`).
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

const FOUNDATIONS = {
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

/** One changed pixel: row, column, and the role character to put there. */
type Px = readonly [row: number, col: number, ch: string];

/** Draws over a sprite, so a new stage is the last one plus what changed. */
export function paint(sprite: Sprite, pixels: readonly Px[]): Sprite {
  const rows = sprite.map((row) => row.split(''));
  for (const [r, c, ch] of pixels) rows[r][c] = ch;
  return rows.map((row) => row.join(''));
}

// What each stage adds. Each stage keeps the last one's, so the character
// visibly carries his career with him.
const HEADSET: Px[] = [
  // Headband arcing over the hood, an ear cup each side, a mic at the left cheek.
  ...[5, 6, 7, 8, 9, 10].map((c): Px => [0, c, 'a']),
  [1, 4, 'a'], [1, 11, 'a'], [2, 3, 'a'], [2, 12, 'a'], [3, 2, 'a'], [3, 13, 'a'],
  [4, 2, 'a'], [5, 2, 'a'], [6, 2, 'a'], [4, 13, 'a'], [5, 13, 'a'], [6, 13, 'a'],
  [7, 2, 'a'], [7, 1, 'a'],
];
// An ID badge on the left of the chest, clear of the face.
const BADGE: Px[] = [[8, 4, 'a'], [9, 4, 'l'], [9, 5, 'l']];
const PROMPT: Px[] = [[11, 5, 'a'], [12, 6, 'a'], [13, 5, 'a'], [13, 8, 'a'], [13, 9, 'a']];
// Two flat-bottomed clouds in the top corners, clear of the headset.
const CLOUDS: Px[] = [
  [0, 1, 'a'], [1, 0, 'a'], [1, 1, 'a'], [1, 2, 'a'], [2, 0, 'a'], [2, 1, 'a'], [2, 2, 'a'],
  [0, 14, 'a'], [1, 13, 'a'], [1, 14, 'a'], [1, 15, 'a'], [2, 13, 'a'], [2, 14, 'a'], [2, 15, 'a'],
];

const stage = (extra: readonly Px[]) => ({
  a: paint(FOUNDATIONS['hacker-idle-a'], extra),
  b: paint(FOUNDATIONS['hacker-idle-b'], extra),
});
const helpDesk = stage(HEADSET);
const specialize = stage([...HEADSET, ...BADGE]);
const sysadmin = stage([...HEADSET, ...BADGE, ...PROMPT]);
const cloud = stage([...HEADSET, ...BADGE, ...PROMPT, ...CLOUDS]);

/** The battle bot: an original little robot, blinking its antenna. Two frames, like the character. */
const BOT = {
  'bot-idle-a': [
    '................',
    '.......aa.......',
    '.......oo.......',
    '...oooooooooo...',
    '..ommmmmmmmmmo..',
    '..omllllllllmo..',
    '..omlaallaalmo..',
    '..omllllllllmo..',
    '..ommmmmmmmmmo..',
    '...oooooooooo...',
    '..oommmmmmmmoo..',
    '.ommommmmmmommo.',
    '.ommommaammommo.',
    '.ommommmmmmommo.',
    '..ooo.oooooo.ooo',
    '................',
  ],
  'bot-idle-b': [
    '................',
    '.......ll.......',
    '.......oo.......',
    '...oooooooooo...',
    '..ommmmmmmmmmo..',
    '..omllllllllmo..',
    '..omlllaalllmo..',
    '..omllllllllmo..',
    '..ommmmmmmmmmo..',
    '...oooooooooo...',
    '..oommmmmmmmoo..',
    '.ommommmmmmommo.',
    '.ommommaammommo.',
    '.ommommmmmmommo.',
    '..ooo.oooooo.ooo',
    '................',
  ],
} satisfies Record<string, Sprite>;

export const SPRITES = {
  ...FOUNDATIONS,
  ...BOT,
  'helpdesk-idle-a': helpDesk.a, 'helpdesk-idle-b': helpDesk.b,
  'specialize-idle-a': specialize.a, 'specialize-idle-b': specialize.b,
  'sysadmin-idle-a': sysadmin.a, 'sysadmin-idle-b': sysadmin.b,
  'cloud-idle-a': cloud.a, 'cloud-idle-b': cloud.b,
} satisfies Record<string, Sprite>;

export type SpriteKey = keyof typeof SPRITES;

export const BOT_FRAMES: SpriteKey[] = ['bot-idle-a', 'bot-idle-b'];

/** The stages of the career path, in order. */
export const STAGES = ['Foundations', 'Help desk', 'Specialize', 'Sysadmin', 'Cloud'] as const;
export type Stage = (typeof STAGES)[number];

/** Which frames play for each stage: two, swapping hands, is the typing idle. */
export const STAGE_FRAMES: Record<Stage, SpriteKey[]> = {
  Foundations: ['hacker-idle-a', 'hacker-idle-b'],
  'Help desk': ['helpdesk-idle-a', 'helpdesk-idle-b'],
  Specialize: ['specialize-idle-a', 'specialize-idle-b'],
  Sysadmin: ['sysadmin-idle-a', 'sysadmin-idle-b'],
  Cloud: ['cloud-idle-a', 'cloud-idle-b'],
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
