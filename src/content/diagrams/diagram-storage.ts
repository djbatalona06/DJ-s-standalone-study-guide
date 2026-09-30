import type { DiagramArt } from './types';
import { box, circle, dots, line, row, ticks } from './draw';

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    hdd35: { x: 6, y: 8, w: 52, h: 38 },
    ssd25: { x: 64, y: 8, w: 30, h: 22 },
    m2sata: { x: 6, y: 56, w: 52, h: 12 },
    m2nvme: { x: 6, y: 74, w: 52, h: 12 },
    'sata-data': { x: 64, y: 56, w: 30, h: 10 },
    'sata-power': { x: 64, y: 74, w: 30, h: 10 },
  },
  decor: [],
  detail: [
    // Hard drive: platter, spindle, and the actuator arm.
    circle(28, 27, 15), circle(28, 27, 2.5), line(52, 14, 31, 26), circle(52, 14, 1.6), box(44, 38, 11, 5),
    // SSD: controller and two flash chips, connector edge.
    box(67, 12, 7, 6), box(77, 12, 7, 6), box(87, 12, 4, 6), line(66, 24, 92, 24), ticks(78, 25.5, 28, 8, 1.6),
    // M.2 SATA: two chips, fingers at the right end, two key notches.
    box(9, 59, 9, 6), box(21, 59, 9, 6), ticks(46, 57.5, 66.5, 4, 1.5), box(56, 58.5, 2, 2), box(56, 63, 2, 2),
    // M.2 NVMe: controller and chip, fingers, one key notch.
    box(9, 77, 9, 6), box(21, 77, 9, 6), box(33, 77, 6, 6), ticks(46, 75.5, 84.5, 4, 1.5), box(56, 81.5, 2, 2),
    // SATA data: seven pins and a step in the plug.
    dots(row(67, 61, 7, 3.9), 0.6), line(64, 58, 94, 58),
    // SATA power: fifteen pins.
    dots(row(66, 79, 15, 1.9), 0.5), line(64, 76.5, 94, 76.5),
  ],
};

export default art;
