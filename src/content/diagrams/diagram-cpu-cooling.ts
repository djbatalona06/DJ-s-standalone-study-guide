import type { DiagramArt } from './types';
import { box, circle, line } from './draw';

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    fan: { x: 6, y: 8, w: 40, h: 14 },
    heatsink: { x: 8, y: 26, w: 36, h: 24 },
    pipes: { x: 8, y: 52, w: 36, h: 10 },
    paste: { x: 10, y: 64, w: 32, h: 4 },
    ihs: { x: 10, y: 70, w: 32, h: 6 },
    mount: { x: 6, y: 80, w: 40, h: 8 },
    pump: { x: 62, y: 62, w: 28, h: 14 },
    radiator: { x: 56, y: 8, w: 38, h: 24 },
  },
  decor: [
    // Two tubes from the pump up to the radiator, and the CPU under the pump.
    { d: 'M66 62V32M86 62V32' },
    { d: box(62, 80, 28, 6), fill: true },
    { d: line(58, 90, 94, 90) },
  ],
  detail: [
    // Air cooler fan: hub and blades.
    circle(26, 15, 6), circle(26, 15, 1.5), line(20, 15, 32, 15), line(26, 9, 26, 21),
    // Fins.
    ...Array.from({ length: 8 }, (_, i) => line(11 + i * 4.3, 27, 11 + i * 4.3, 49)),
    // Heat pipes.
    line(10, 55, 42, 55), line(10, 59, 42, 59),
    // Paste, spread.
    line(12, 66, 40, 66),
    // Heat spreader and socket line.
    line(6, 78, 46, 78), line(20, 82, 32, 82),
    // Liquid cooler: radiator fins and a pump impeller.
    ...Array.from({ length: 8 }, (_, i) => line(59 + i * 4.4, 10, 59 + i * 4.4, 30)),
    circle(76, 69, 4.5), circle(76, 69, 1.2),
  ],
};

export default art;
