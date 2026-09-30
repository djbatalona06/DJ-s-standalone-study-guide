import type { DiagramArt } from './types';
import { box, circle, dots, line, ticks } from './draw';

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    display: { x: 10, y: 8, w: 80, h: 6 },
    ram: { x: 8, y: 18, w: 18, h: 9 },
    storage: { x: 8, y: 30, w: 18, h: 6 },
    wifi: { x: 8, y: 39, w: 12, h: 6 },
    board: { x: 30, y: 18, w: 26, h: 26 },
    fan: { x: 60, y: 18, w: 20, h: 20, round: true },
    cmos: { x: 84, y: 18, w: 8, h: 8, round: true },
    keyboard: { x: 30, y: 48, w: 40, h: 4 },
    battery: { x: 8, y: 56, w: 84, h: 20 },
  },
  decor: [
    // The base, and the hinge line above it.
    { d: box(4, 4, 92, 76), fill: true },
    { d: line(4, 16.5, 96, 16.5) },
  ],
  detail: [
    // Display cable: three strands to the hinge.
    line(12, 11, 88, 11),
    // RAM: two notched modules.
    line(10, 21, 24, 21), line(10, 24, 24, 24), box(15, 25, 3, 1.5),
    // M.2 storage: a screw at the end.
    circle(23, 33, 1),
    // Wi-Fi card and its two antenna wires up the left side.
    circle(11, 42, 0.8), line(8, 44, 6, 44), line(6, 44, 6, 12), line(6, 12, 10, 12),
    // CPU package and a heat pipe to the fan.
    box(36, 24, 14, 14), box(39, 27, 8, 8), line(50, 31, 60, 28),
    // Fan blades.
    circle(70, 28, 3), line(63, 28, 77, 28), line(70, 21, 70, 35),
    // CMOS lead: down the right edge and along under the fan to the board.
    line(88, 26, 88, 42), line(88, 42, 56, 42),
    // Keyboard ribbon connector pins.
    dots([[34, 50], [38, 50], [42, 50], [46, 50], [50, 50], [54, 50], [58, 50], [62, 50], [66, 50]], 0.5),
    // Battery cells.
    line(29, 56, 29, 76), line(50, 56, 50, 76), line(71, 56, 71, 76), ticks(86, 60, 72, 2, 3),
  ],
};

export default art;
