import type { DiagramArt } from './types';
import { box, circle, dots, line, poly, row } from './draw';

const Y = (i: number) => 4 + i * 13.5;

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: Object.fromEntries(
    [7, 6, 5, 4, 3, 2, 1].map((layer, i) => [`l${layer}`, { x: 8, y: Y(i), w: 84, h: 11 }]),
  ),
  decor: [],
  detail: [
    // 7 Application: a window.
    box(78, Y(0) + 2, 10, 7), line(78, Y(0) + 4.5, 88, Y(0) + 4.5),
    // 6 Presentation: a padlock.
    box(80, Y(1) + 5, 7, 4.5), 'M81.5 ' + (Y(1) + 5) + 'v-1.5a2 2 0 0 1 4 0v1.5',
    // 5 Session: two opposite arrows.
    line(78, Y(2) + 4, 88, Y(2) + 4), line(85, Y(2) + 2, 88, Y(2) + 4), line(85, Y(2) + 6, 88, Y(2) + 4),
    line(88, Y(2) + 8, 78, Y(2) + 8), line(81, Y(2) + 6, 78, Y(2) + 8), line(81, Y(2) + 10, 78, Y(2) + 8),
    // 4 Transport: a row of ports.
    box(78, Y(3) + 2, 11, 7), dots(row(80.5, Y(3) + 5.5, 3, 3.2), 0.6),
    // 3 Network: three hosts in a triangle.
    poly([[83.5, Y(4) + 2], [88, Y(4) + 9], [79, Y(4) + 9]]), circle(83.5, Y(4) + 2, 1), circle(88, Y(4) + 9, 1), circle(79, Y(4) + 9, 1),
    // 2 Data link: a frame with a header and trailer.
    box(78, Y(5) + 3, 11, 5), line(81, Y(5) + 3, 81, Y(5) + 8), line(86, Y(5) + 3, 86, Y(5) + 8),
    // 1 Physical: a wave.
    'M78 ' + (Y(6) + 5.5) + 'q2.75 -6 5.5 0t5.5 0',
  ],
};

export default art;
