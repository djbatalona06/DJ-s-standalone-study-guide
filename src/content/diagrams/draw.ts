/**
 * Path helpers for the diagram art. Everything is drawn in one 100×100 space
 * and returned as SVG path data, so a diagram's geometry reads as a list of
 * shapes rather than a wall of numbers.
 */
const n = (v: number) => String(Math.round(v * 100) / 100);

export const box = (x: number, y: number, w: number, h: number) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
export const line = (x1: number, y1: number, x2: number, y2: number) => `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
export const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;
export const poly = (points: ReadonlyArray<readonly [number, number]>) =>
  `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
export const pill = (cx: number, cy: number, w: number, h: number) =>
  `M${n(cx - w / 2 + h / 2)} ${n(cy - h / 2)}h${n(w - h)}a${n(h / 2)} ${n(h / 2)} 0 0 1 0 ${n(h)}h${n(h - w)}a${n(h / 2)} ${n(h / 2)} 0 0 1 0 ${n(-h)}Z`;

/** Small dots, one per point: pins and contacts. */
export const dots = (points: ReadonlyArray<readonly [number, number]>, r = 0.55) =>
  points.map(([x, y]) => circle(x, y, r)).join('');

/** `count` points in a row starting at (x, y), `step` apart. */
export const row = (x: number, y: number, count: number, step: number): Array<[number, number]> =>
  Array.from({ length: count }, (_, i) => [x + i * step, y]);

/** `count` short vertical ticks: the gold fingers on an edge connector. */
export const ticks = (x: number, y1: number, y2: number, count: number, step: number) =>
  Array.from({ length: count }, (_, i) => line(x + i * step, y1, x + i * step, y2)).join('');

/** Points spaced evenly around a circle, starting at the top. */
export const around = (cx: number, cy: number, r: number, count: number): Array<[number, number]> =>
  Array.from({ length: count }, (_, i) => {
    const a = (-90 + (360 / count) * i) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
