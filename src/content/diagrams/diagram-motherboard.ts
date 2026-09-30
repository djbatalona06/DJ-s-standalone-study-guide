import type { DiagramArt } from './types';

/** The motherboard's geometry. Lazy: this file is its own chunk. */
const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    'rear-io': { x: 6, y: 8, w: 12, h: 30 },
    eps8: { x: 22, y: 5, w: 10, h: 5 },
    'cpu-socket': { x: 28, y: 15, w: 24, h: 24 },
    'fan-header': { x: 55, y: 9, w: 6, h: 4 },
    dimm: { x: 64, y: 8, w: 14, h: 40 },
    atx24: { x: 84, y: 16, w: 7, h: 26 },
    'pcie-x16': { x: 8, y: 49, w: 46, h: 5 },
    'pcie-x1': { x: 8, y: 59, w: 18, h: 4 },
    m2: { x: 8, y: 68, w: 36, h: 5 },
    chipset: { x: 60, y: 60, w: 15, h: 15 },
    sata: { x: 81, y: 55, w: 11, h: 18 },
    cmos: { x: 30, y: 79, w: 9, h: 9, round: true },
    uefi: { x: 46, y: 81, w: 8, h: 6 },
    'usb-header': { x: 62, y: 85, w: 11, h: 5 },
    'front-panel': { x: 79, y: 85, w: 12, h: 5 },
  },
  decor: [
    // The board itself.
    { d: 'M3 3 H97 V97 H3 Z', fill: true },
    // Mounting holes.
    { d: 'M7 44 h2 v2 h-2 Z M91 7 h2 v2 h-2 Z M91 91 h2 v2 h-2 Z M7 91 h2 v2 h-2 Z' },
    // DIMM slot dividers, so four slots read as four.
    { d: 'M67.5 9 V47 M71 9 V47 M74.5 9 V47' },
    // The CPU's pin field.
    { d: 'M32 19 H48 V35 H32 Z' },
    // Traces from the socket to the chipset and slots.
    { d: 'M40 39 V46 M52 30 H58 V58 M54 51 H60 V58 M26 61 H58' },
  ],
};

export default art;
