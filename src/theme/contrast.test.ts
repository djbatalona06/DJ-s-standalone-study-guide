import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTES, TOKENS, contrast, type Mode, type Token } from './palette';

/** Text sits on these grounds somewhere in the app, so each pair must clear AA. */
const TEXT_PAIRS: Array<[Token, Token]> = [
  ['text', 'base'], ['text', 'surface'], ['text', 'surface-muted'],
  ['text-muted', 'base'], ['text-muted', 'surface'],
  ['accent-text', 'accent'], ['xp-text', 'xp'],
  ['accent', 'surface'], ['danger', 'surface'], ['success', 'surface'],
];

/** Non-text UI (focus ring, XP fill, pixel borders drawn in accent) needs 3:1. */
const UI_PAIRS: Array<[Token, Token]> = [
  ['focus', 'base'], ['focus', 'surface'], ['xp', 'surface'], ['accent', 'base'],
];

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

/** The declarations between `/* palette:<mode> *\/` and the next closing brace. */
function cssPalette(mode: Mode): Record<string, string> {
  const start = css.indexOf(`/* palette:${mode} */`);
  expect(start, `styles.css has no /* palette:${mode} */ marker`).toBeGreaterThan(-1);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
}

describe.each(['dark', 'light'] as Mode[])('%s palette', (mode) => {
  const p = PALETTES[mode];

  it.each(TEXT_PAIRS)('%s on %s clears 4.5:1', (fg, bg) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s against %s clears 3:1', (fg, bg) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(3);
  });

  it('matches what styles.css paints', () => {
    const painted = cssPalette(mode);
    for (const token of TOKENS) expect(painted[token], `--color-${token}`).toBe(p[token]);
  });

  it('never uses pure black or pure white', () => {
    for (const value of Object.values(p)) expect(['#000000', '#ffffff']).not.toContain(value);
  });
});
