import type { DiagramArt } from './types';
import { box, circle, dots, line, pill, poly, row } from './draw';

const COLS = [6, 37, 68] as const;
const ROWS = [8, 38, 68] as const;
const CX = [19, 50, 81] as const;
const CY = [20, 50, 80] as const;
const ids = ['usba', 'usbc', 'hdmi', 'dp', 'rj45', 'rj11', 'vga', 'dvi', 'audio'];

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: Object.fromEntries(ids.map((id, i) => [id, { x: COLS[i % 3], y: ROWS[Math.floor(i / 3)], w: 26, h: 24 }])),
  decor: [],
  detail: [
    // USB Type-A: a rectangle with a tongue and two contacts.
    box(CX[0] - 8, CY[0] - 4, 16, 8), line(CX[0] - 6, CY[0], CX[0] + 6, CY[0]), dots([[CX[0] - 3, CY[0] + 2], [CX[0] + 3, CY[0] + 2]], 0.6),
    // USB-C: a small pill with a centre tongue.
    pill(CX[1], CY[0], 14, 6), line(CX[1] - 4, CY[0], CX[1] + 4, CY[0]),
    // HDMI: both bottom corners cut.
    poly([[CX[2] - 8, CY[0] - 3], [CX[2] + 8, CY[0] - 3], [CX[2] + 8, CY[0] + 0.5], [CX[2] + 5.5, CY[0] + 3.5], [CX[2] - 5.5, CY[0] + 3.5], [CX[2] - 8, CY[0] + 0.5]]),
    line(CX[2] - 5, CY[0], CX[2] + 5, CY[0]),
    // DisplayPort: one corner cut.
    poly([[CX[0] - 8, CY[1] - 3], [CX[0] + 8, CY[1] - 3], [CX[0] + 8, CY[1] + 0.5], [CX[0] + 5, CY[1] + 3.5], [CX[0] - 8, CY[1] + 3.5]]),
    line(CX[0] - 5, CY[1], CX[0] + 5, CY[1]),
    // RJ45: eight contacts and a latch.
    box(CX[1] - 7, CY[1] - 5, 14, 10), dots(row(CX[1] - 5.25, CY[1] - 2.5, 8, 1.5), 0.4), line(CX[1] - 3, CY[1] + 5, CX[1] - 3, CY[1] + 7.5), line(CX[1] + 3, CY[1] + 5, CX[1] + 3, CY[1] + 7.5), line(CX[1] - 3, CY[1] + 7.5, CX[1] + 3, CY[1] + 7.5),
    // RJ11: narrower, fewer contacts.
    box(CX[2] - 4.5, CY[1] - 4.5, 9, 9), dots(row(CX[2] - 2.25, CY[1] - 2, 4, 1.5), 0.4), line(CX[2] - 2, CY[1] + 4.5, CX[2] - 2, CY[1] + 6.5), line(CX[2] + 2, CY[1] + 4.5, CX[2] + 2, CY[1] + 6.5), line(CX[2] - 2, CY[1] + 6.5, CX[2] + 2, CY[1] + 6.5),
    // VGA: a trapezoid with fifteen holes in three rows.
    poly([[CX[0] - 9, CY[2] - 4.5], [CX[0] + 9, CY[2] - 4.5], [CX[0] + 7, CY[2] + 4.5], [CX[0] - 7, CY[2] + 4.5]]),
    dots(row(CX[0] - 4, CY[2] - 2.5, 5, 2), 0.4), dots(row(CX[0] - 3.5, CY[2], 5, 1.75), 0.4), dots(row(CX[0] - 3, CY[2] + 2.5, 5, 1.5), 0.4),
    // DVI: three rows of eight pins and a flat blade.
    box(CX[1] - 10, CY[2] - 4.5, 17, 9), dots(row(CX[1] - 8.5, CY[2] - 2.5, 8, 1.9), 0.4), dots(row(CX[1] - 8.5, CY[2], 8, 1.9), 0.4), dots(row(CX[1] - 8.5, CY[2] + 2.5, 8, 1.9), 0.4),
    line(CX[1] + 9, CY[2] - 3, CX[1] + 9, CY[2] + 3), line(CX[1] + 11, CY[2] - 3, CX[1] + 11, CY[2] + 3),
    // 3.5 mm jack: a socket and its hole.
    circle(CX[2], CY[2], 4.5), circle(CX[2], CY[2], 1.5),
  ],
};

export default art;
