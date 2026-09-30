import type { DiagramArt } from './types';
import { box, circle, line, poly } from './draw';

const COLS = [6, 37, 68] as const;
const ROWS = [8, 38, 68] as const;
const CX = [19, 50, 81] as const;
const CY = [20, 50, 80] as const;
const ids = ['utp', 'stp', 'coax', 'sm', 'mm', 'lc', 'sc', 'st', 't568'];

/** Four twisted pairs, each two small circles, inside a jacket. */
const pairs = (cx: number, cy: number) =>
  ([[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]] as const)
    .map(([dx, dy]) => circle(cx + dx - 0.9, cy + dy, 1.2) + circle(cx + dx + 0.9, cy + dy, 1.2)).join('');

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: Object.fromEntries(ids.map((id, i) => [id, { x: COLS[i % 3], y: ROWS[Math.floor(i / 3)], w: 26, h: 24 }])),
  decor: [],
  detail: [
    // UTP: a jacket around four pairs.
    circle(CX[0], CY[0], 9), pairs(CX[0], CY[0]),
    // STP: the same with a foil shield ring inside the jacket.
    circle(CX[1], CY[0], 9), circle(CX[1], CY[0], 7.4), pairs(CX[1], CY[0]),
    // Coax: jacket, braid, insulation, centre conductor.
    circle(CX[2], CY[0], 9), circle(CX[2], CY[0], 7), circle(CX[2], CY[0], 4.5), circle(CX[2], CY[0], 1.2),
    // Single-mode: a very small core.
    circle(CX[0], CY[1], 9), circle(CX[0], CY[1], 4), circle(CX[0], CY[1], 0.7),
    // Multimode: a wider core.
    circle(CX[1], CY[1], 9), circle(CX[1], CY[1], 5.5), circle(CX[1], CY[1], 3),
    // LC: small square with a latch and a ferrule.
    box(CX[2] - 4, CY[1] - 3, 8, 8), box(CX[2] - 1, CY[1] - 7, 2, 4), poly([[CX[2] - 2, CY[1] + 5], [CX[2] + 2, CY[1] + 5], [CX[2] + 3, CY[1] + 8], [CX[2] - 3, CY[1] + 8]]),
    // SC: larger square with a ferrule.
    box(CX[0] - 5, CY[2] - 4, 10, 10), box(CX[0] - 1.2, CY[2] - 8, 2.4, 4), line(CX[0] - 5, CY[2] + 6, CX[0] + 5, CY[2] + 6),
    // ST: round with bayonet notches and a ferrule.
    circle(CX[1], CY[2], 7), circle(CX[1], CY[2], 1.5), line(CX[1] - 7, CY[2] - 2, CX[1] - 5, CY[2] - 2), line(CX[1] + 7, CY[2] + 2, CX[1] + 5, CY[2] + 2),
    // T568B: eight wires; the first, third, fifth and seventh are striped.
    ...Array.from({ length: 8 }, (_, i) => line(CX[2] - 8 + i * 2.3, CY[2] - 6, CX[2] - 8 + i * 2.3, CY[2] + 6)),
    ...[0, 2, 4, 6].flatMap((i) => [line(CX[2] - 9 + i * 2.3, CY[2] - 3, CX[2] - 7 + i * 2.3, CY[2] - 3), line(CX[2] - 9 + i * 2.3, CY[2] + 1, CX[2] - 7 + i * 2.3, CY[2] + 1)]),
  ],
};

export default art;
