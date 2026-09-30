import type { DiagramArt } from './types';
import { box, circle, dots, line, poly } from './draw';

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    output: { x: 10, y: 8, w: 80, h: 6 },
    laser: { x: 10, y: 18, w: 50, h: 8 },
    toner: { x: 10, y: 32, w: 26, h: 24 },
    charge: { x: 42, y: 29, w: 12, h: 5 },
    drum: { x: 40, y: 37, w: 16, h: 16, round: true },
    clean: { x: 59, y: 38, w: 7, h: 14 },
    fuser: { x: 70, y: 34, w: 22, h: 26 },
    transfer: { x: 40, y: 56, w: 16, h: 6 },
    pickup: { x: 10, y: 70, w: 16, h: 8 },
    tray: { x: 10, y: 84, w: 80, h: 9 },
  },
  decor: [
    { d: box(4, 4, 92, 92), fill: true },
    // The paper path, drawn under the parts so they sit on top of it.
    { d: 'M18 84V70M18 66H38V54.5H66V47H70M92 47H94V11H90' },
  ],
  detail: [
    // Laser: a spinning mirror and the beam to the drum.
    poly([[50, 19], [55, 22], [50, 25]]), line(56, 26, 52, 37.5),
    // Toner: powder.
    dots([[15, 38], [21, 41], [27, 38], [17, 46], [24, 49], [31, 45], [14, 52], [30, 53]], 0.5),
    // Drum core.
    circle(48, 45, 3.5),
    // Charge roller and transfer roller axles.
    line(44, 31.5, 52, 31.5), line(43, 59, 53, 59),
    // Cleaning blade edge.
    line(59, 45, 56, 45),
    // Fuser: heated roller above, pressure roller below, the nip between them.
    circle(81, 41, 5), circle(81, 53, 5), line(72, 47, 90, 47),
    // Pickup roller axle and tray stack.
    circle(18, 74, 2), line(14, 88, 86, 88),
  ],
};

export default art;
