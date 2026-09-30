/** Display preferences. Pure, so the rules are testable without a browser. */

/** Calm means no motion and the same information. Either the app or the system can ask for it. */
export function isCalm(setting: boolean, systemReduces: boolean): boolean {
  return setting || systemReduces;
}

export const TEXT_SIZES = ['default', 'large', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

const SCALE: Record<TextSize, number> = { default: 100, large: 112.5, larger: 125 };

/** Root font size in percent. Anything unknown (an old or edited backup) is the default. */
export function textScale(size: string | undefined): number {
  return SCALE[size as TextSize] ?? SCALE.default;
}
