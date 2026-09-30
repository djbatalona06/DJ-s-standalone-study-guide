import type { Diagram } from './types';

/**
 * A generic ATX board, drawn from scratch. Not any vendor's layout: the parts
 * are where they usually are, which is what the exam asks you to recognise.
 */
export const MOTHERBOARD: Diagram = {
  id: 'motherboard',
  trackId: 'a1',
  domainId: 'a1-d3',
  title: 'Motherboard',
  blurb: 'Fifteen parts every A+ hardware question assumes you can point at.',
  parts: [
    { id: 'rear-io', label: 'Rear I/O panel', cardId: 'a1-d3-mb-rear-io' },
    { id: 'eps8', label: '8-pin CPU power', cardId: 'a1-d3-mb-eps8' },
    { id: 'cpu-socket', label: 'CPU socket', cardId: 'a1-d3-mb-cpu-socket' },
    { id: 'fan-header', label: 'CPU fan header', cardId: 'a1-d3-mb-fan-header' },
    { id: 'dimm', label: 'DIMM slots', cardId: 'a1-d3-mb-dimm' },
    { id: 'atx24', label: '24-pin ATX power', cardId: 'a1-d3-mb-atx24' },
    { id: 'pcie-x16', label: 'PCIe x16 slot', cardId: 'a1-d3-mb-pcie-x16' },
    { id: 'pcie-x1', label: 'PCIe x1 slot', cardId: 'a1-d3-mb-pcie-x1' },
    { id: 'm2', label: 'M.2 slot', cardId: 'a1-d3-mb-m2' },
    { id: 'chipset', label: 'Chipset', cardId: 'a1-d3-mb-chipset' },
    { id: 'sata', label: 'SATA ports', cardId: 'a1-d3-mb-sata' },
    { id: 'cmos', label: 'CMOS battery', cardId: 'a1-d3-mb-cmos' },
    { id: 'uefi', label: 'UEFI firmware chip', cardId: 'a1-d3-mb-uefi' },
    { id: 'usb-header', label: 'Internal USB header', cardId: 'a1-d3-mb-usb-header' },
    { id: 'front-panel', label: 'Front-panel header', cardId: 'a1-d3-mb-front-panel' },
  ],
  textAlternative:
    'A rectangular ATX motherboard seen from above, rear ports on the left edge. Along the top: the ' +
    'rear I/O panel at the far left, the 8-pin CPU power connector beside it, then the square CPU ' +
    'socket with the CPU fan header just to its right. Four tall DIMM slots stand to the right of the ' +
    'socket, and the 24-pin ATX power connector runs down the right edge. Across the middle-left: a ' +
    'long PCIe x16 slot, a short PCIe x1 slot below it, then an M.2 slot. The chipset sits lower ' +
    'right with the SATA ports stacked on the right edge beside it. Along the bottom: the coin-shaped ' +
    'CMOS battery, the UEFI firmware chip, an internal USB header, and the front-panel header in the ' +
    'bottom-right corner.',
};
