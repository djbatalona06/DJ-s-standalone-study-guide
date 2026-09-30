import type { DiagramArt } from './types';
import { box, dots, line, row, ticks } from './draw';

/** `count` chips in a row from x, each w wide. */
const chips = (x: number, y: number, count: number, w: number, gap: number, h = 7) =>
  Array.from({ length: count }, (_, i) => box(x + i * (w + gap), y, w, h)).join('');

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    dimm: { x: 6, y: 6, w: 88, h: 18 },
    sodimm: { x: 6, y: 30, w: 44, h: 18 },
    ecc: { x: 6, y: 54, w: 88, h: 18 },
    notch: { x: 56, y: 30, w: 38, h: 18 },
    contacts: { x: 6, y: 78, w: 42, h: 17 },
    chips: { x: 52, y: 78, w: 42, h: 17 },
  },
  decor: [],
  detail: [
    // Desktop DIMM: eight chips, contacts either side of the key notch.
    chips(9, 8, 8, 7.6, 2.6),
    ticks(8, 20, 22.5, 25, 1.7), ticks(58, 20, 22.5, 20, 1.7), box(50, 21.5, 6, 2.5),
    // SO-DIMM: four chips, notch left of centre.
    chips(9, 32, 4, 7.6, 2.6),
    ticks(8, 44, 46.5, 9, 1.7), ticks(30, 44, 46.5, 11, 1.7), box(23.5, 45.5, 4.5, 2.5),
    // Notch close-up: a gap in a row of contacts.
    ticks(58, 38, 46, 7, 2.2), ticks(80, 38, 46, 7, 2.2), box(72, 42.5, 6, 4.5),
    // ECC DIMM: nine chips, the ninth crossed.
    chips(8.5, 56, 9, 7.2, 1.7),
    line(78.7, 56, 85.9, 63), line(85.9, 56, 78.7, 63),
    ticks(8, 68, 70.5, 25, 1.7), ticks(58, 68, 70.5, 20, 1.7), box(50, 69.5, 6, 2.5),
    // Contacts close-up.
    ticks(9, 82, 92, 19, 2),
    // Chips close-up: three chips with legs.
    box(56, 82, 10, 9), box(70, 82, 10, 9), box(84, 82, 7, 9),
    dots(row(58, 86.5, 3, 3), 0.4), dots(row(72, 86.5, 3, 3), 0.4),
  ],
};

export default art;
