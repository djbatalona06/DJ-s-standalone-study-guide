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
    // Traces from the socket to the chipset and slots.
    { d: 'M40 39 V46 M52 30 H58 V58 M54 51 H60 V58 M26 61 H58' },
  ],
  detail: [
    // Rear I/O: stacked USB, Ethernet, audio.
    'M8.5 12 h7 v4 h-7 Z M8.5 20 h7 v6 h-7 Z M8.5 30 h7 v5 h-7 Z',
    // EPS pin row.
    'M24 7.5 H30',
    // The CPU's pin field.
    'M32 19 H48 V35 H32 Z M36 19 V35 M40 19 V35 M44 19 V35 M32 23 H48 M32 27 H48 M32 31 H48',
    // Four DIMM slots read as four.
    'M67.5 9 V47 M71 9 V47 M74.5 9 V47',
    // 24-pin: two rows.
    'M86.3 18 V40 M88.7 18 V40',
    // PCIe key notches.
    'M20 49 V54 M12 59 V63',
    // M.2 standoff.
    'M41 69.5 h1.5 v2 h-1.5 Z',
    // Chipset heatsink fins.
    'M63 61 V74 M66 61 V74 M69 61 V74 M72 61 V74',
    // SATA: four ports.
    'M81 59.5 H92 M81 64 H92 M81 68.5 H92',
    // Header pin rows.
    'M64 87.5 H71 M81 87.5 H89',
  ],
};

export default art;
