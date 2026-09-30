/**
 * Lantern's two palettes, in HeartBeat's token names.
 *
 * `styles.css` writes these same values as custom properties; `contrast.test.ts`
 * reads both and fails if they drift or if any pair a screen actually puts text
 * on stops clearing WCAG AA. Tune a colour here, copy it to the CSS, run the
 * test: that is the whole loop.
 *
 * Dark is the one the app is designed around ("terminal after dark"); light is
 * the same room with the lights on. Neither uses pure black or pure white
 * (HeartBeat's rule: a pure black shadow is a hole on a dark palette).
 */
export type Mode = 'light' | 'dark';

export const TOKENS = [
  'base', 'surface', 'surface-muted', 'border', 'text', 'text-muted',
  'accent', 'accent-text', 'xp', 'xp-text', 'success', 'danger', 'focus',
] as const;
export type Token = (typeof TOKENS)[number];

export const PALETTES: Record<Mode, Record<Token, string>> = {
  dark: {
    base: '#0a100c',
    surface: '#111b15',
    'surface-muted': '#18271e',
    border: '#2a4636',
    text: '#d8f3dc',
    'text-muted': '#8fb59a',
    accent: '#3dfc8a',
    'accent-text': '#04130a',
    xp: '#f4c56a',
    'xp-text': '#241c0a',
    success: '#7fd39b',
    danger: '#ff7a8c',
    focus: '#f4c56a',
  },
  light: {
    base: '#eaf1eb',
    surface: '#f8fbf8',
    'surface-muted': '#dde8df',
    border: '#9fb8a6',
    text: '#0f1f15',
    'text-muted': '#3d5747',
    accent: '#0d6e37',
    'accent-text': '#f2fbf5',
    xp: '#7a4f0e',
    'xp-text': '#fff8ea',
    success: '#1f6b3d',
    danger: '#a3241c',
    focus: '#1d5fd1',
  },
};

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
