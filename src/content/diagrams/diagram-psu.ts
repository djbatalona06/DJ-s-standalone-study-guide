import type { DiagramArt } from './types';
import { box, circle, dots, line, row } from './draw';

/** Two rows of `n` pins. */
const pins2 = (x: number, y: number, n: number, step: number, gap: number) =>
  dots([...row(x, y, n, step), ...row(x, y + gap, n, step)], 0.7);

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    body: { x: 6, y: 6, w: 88, h: 30 },
    atx24: { x: 6, y: 44, w: 58, h: 12 },
    eps8: { x: 70, y: 44, w: 24, h: 12 },
    pcie: { x: 6, y: 62, w: 36, h: 12 },
    sata: { x: 48, y: 62, w: 46, h: 12 },
    molex: { x: 6, y: 80, w: 24, h: 12 },
  },
  decor: [],
  detail: [
    // Supply: fan, blades, switch, inlet, label lines.
    circle(30, 21, 12), circle(30, 21, 3), line(18, 21, 42, 21), line(30, 9, 30, 33), line(21.5, 12.5, 38.5, 29.5), line(38.5, 12.5, 21.5, 29.5),
    box(64, 12, 12, 7), box(80, 12, 10, 10), line(64, 28, 90, 28), line(64, 31, 84, 31),
    // 24-pin: two rows of twelve.
    pins2(9, 47.5, 12, 4.6, 5),
    // EPS 8-pin: two rows of four.
    pins2(75, 47.5, 4, 5, 5),
    // PCIe 6+2: a block of three by two, and a separate pair.
    pins2(10, 65.5, 3, 5, 5), pins2(30, 65.5, 1, 5, 5), line(26, 63, 26, 73),
    // SATA power: fifteen pins in one row, an L in the plug.
    dots(row(51, 68, 15, 2.75), 0.55), line(48, 65, 94, 65),
    // Molex: four pins, two chamfered corners.
    dots(row(10, 86, 4, 5), 0.8), line(6, 83, 9, 81), line(30, 83, 27, 81),
  ],
};

export default art;
