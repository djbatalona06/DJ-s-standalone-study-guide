import type { Diagram } from './types';

/**
 * The diagrams after the motherboard. Definitions live here in the main bundle
 * (names, cards, text alternative); each one's geometry is its own lazy chunk.
 * Drawn from scratch, not any vendor's product: the parts are where they
 * usually are, which is what the exam asks you to recognise.
 */
export const RAM_MODULES: Diagram = {
  id: 'ram-modules', trackId: 'a1', domainId: 'a1-d3', title: 'Memory modules',
  blurb: 'DIMM or SO-DIMM, the extra ECC chip, and the notch, contacts and chips up close.',
  parts: [
    { id: 'dimm', label: 'Desktop DIMM', cardId: 'a1-d3-ram-dimm' },
    { id: 'sodimm', label: 'Laptop SO-DIMM', cardId: 'a1-d3-ram-sodimm' },
    { id: 'ecc', label: 'ECC DIMM', cardId: 'a1-d3-ram-ecc' },
    { id: 'notch', label: 'Key notch', cardId: 'a1-d3-ram-notch' },
    { id: 'contacts', label: 'Edge contacts', cardId: 'a1-d3-ram-contacts' },
    { id: 'chips', label: 'Memory chips', cardId: 'a1-d3-ram-chips' },
  ],
  textAlternative:
    'Three memory modules stacked as horizontal strips, each with a row of small chips along the top and gold ' +
    'contacts along the bottom edge. The first is a full-length desktop DIMM with eight chips. Below it is a ' +
    'SO-DIMM about half as long with four chips, and to its right a close-up of the key notch, a gap in the row ' +
    'of contacts. The third strip is a full-length ECC DIMM with nine chips, the ninth marked with a cross. ' +
    'At the bottom are two close-ups: the edge contacts on the left and three memory chips on the right.',
};

export const STORAGE: Diagram = {
  id: 'storage', trackId: 'a1', domainId: 'a1-d3', title: 'Storage drives and connectors',
  blurb: 'Hard drive, SATA SSD, the two kinds of M.2 module, and the two SATA connectors.',
  parts: [
    { id: 'hdd35', label: '3.5-inch hard drive', cardId: 'a1-d3-sto-hdd35' },
    { id: 'ssd25', label: '2.5-inch SATA SSD', cardId: 'a1-d3-sto-ssd25' },
    { id: 'm2sata', label: 'M.2 SATA SSD (two notches)', cardId: 'a1-d3-sto-m2-sata' },
    { id: 'm2nvme', label: 'M.2 NVMe SSD (one notch)', cardId: 'a1-d3-sto-m2-nvme' },
    { id: 'sata-data', label: 'SATA data connector', cardId: 'a1-d3-sto-sata-data' },
    { id: 'sata-power', label: 'SATA power connector', cardId: 'a1-d3-sto-sata-power' },
  ],
  textAlternative:
    'Across the top: a large 3.5-inch hard drive drawn with a round platter and a pivoting arm, and beside it a ' +
    'smaller 2.5-inch SSD with two chips. Below them, on the left, two long thin M.2 modules stacked: the upper ' +
    'one has two notches in its connector end, the lower one a single notch. On the right, two connectors: a ' +
    'shorter SATA data connector with seven pins above a longer SATA power connector with fifteen.',
};

export const PSU: Diagram = {
  id: 'psu', trackId: 'a1', domainId: 'a1-d3', title: 'Power supply and connectors',
  blurb: 'The supply itself and the five connectors you meet on every build.',
  parts: [
    { id: 'body', label: 'Power supply unit', cardId: 'a1-d3-pc-body' },
    { id: 'atx24', label: '24-pin ATX main', cardId: 'a1-d3-pc-atx24' },
    { id: 'eps8', label: '8-pin CPU (EPS)', cardId: 'a1-d3-pc-eps8' },
    { id: 'pcie', label: 'PCIe graphics power (6+2)', cardId: 'a1-d3-pc-pcie' },
    { id: 'sata', label: 'SATA power', cardId: 'a1-d3-pc-sata' },
    { id: 'molex', label: 'Molex 4-pin', cardId: 'a1-d3-pc-molex' },
  ],
  textAlternative:
    'At the top, the power supply box with a large round fan on the left, a small power switch and the mains ' +
    'inlet on the right. Below it, the connectors as pin blocks. The widest is the 24-pin ATX connector, two ' +
    'rows of twelve, with the 8-pin CPU connector, two rows of four, to its right. Underneath are the PCIe ' +
    'graphics connector, a block of six pins with a separate two-pin piece, and a single row of fifteen pins ' +
    'for SATA power. At the bottom left is the four-pin Molex connector.',
};

export const LASER_PRINTER: Diagram = {
  id: 'laser-printer', trackId: 'a1', domainId: 'a1-d3', title: 'Laser printer',
  blurb: 'Follow a page from the tray to the output: charge, write, develop, transfer, fuse.',
  parts: [
    { id: 'tray', label: 'Paper tray', cardId: 'a1-d3-lp-tray' },
    { id: 'pickup', label: 'Pickup roller', cardId: 'a1-d3-lp-pickup' },
    { id: 'toner', label: 'Toner cartridge', cardId: 'a1-d3-lp-toner' },
    { id: 'charge', label: 'Primary charge roller', cardId: 'a1-d3-lp-charge' },
    { id: 'drum', label: 'Photosensitive drum', cardId: 'a1-d3-lp-drum' },
    { id: 'laser', label: 'Laser and mirror', cardId: 'a1-d3-lp-laser' },
    { id: 'transfer', label: 'Transfer roller', cardId: 'a1-d3-lp-transfer' },
    { id: 'clean', label: 'Cleaning blade', cardId: 'a1-d3-lp-clean' },
    { id: 'fuser', label: 'Fuser', cardId: 'a1-d3-lp-fuser' },
    { id: 'output', label: 'Output tray', cardId: 'a1-d3-lp-output' },
  ],
  textAlternative:
    'A cutaway of a laser printer with the paper path drawn as a line. At the bottom is the paper tray with the ' +
    'pickup roller above it at the left. Paper travels up the left side, then right between the round ' +
    'photosensitive drum above and the transfer roller below. Above the drum are the primary charge roller and, ' +
    'across the top, the laser and mirror assembly. The toner cartridge sits to the left of the drum and the ' +
    'cleaning blade to its right. The paper then passes between the two rollers of the fuser on the right and ' +
    'leaves up to the output tray along the top.',
};

export const OSI: Diagram = {
  id: 'osi', trackId: 'a1', domainId: 'a1-d2', title: 'OSI model',
  blurb: 'Seven layers, top to bottom: which one is each protocol and device?',
  parts: [
    { id: 'l7', label: 'Layer 7: Application', cardId: 'a1-d2-osi-7' },
    { id: 'l6', label: 'Layer 6: Presentation', cardId: 'a1-d2-osi-6' },
    { id: 'l5', label: 'Layer 5: Session', cardId: 'a1-d2-osi-5' },
    { id: 'l4', label: 'Layer 4: Transport', cardId: 'a1-d2-osi-4' },
    { id: 'l3', label: 'Layer 3: Network', cardId: 'a1-d2-osi-3' },
    { id: 'l2', label: 'Layer 2: Data link', cardId: 'a1-d2-osi-2' },
    { id: 'l1', label: 'Layer 1: Physical', cardId: 'a1-d2-osi-1' },
  ],
  textAlternative:
    'Seven horizontal bands stacked from layer 7 at the top to layer 1 at the bottom, each with a small symbol ' +
    'at its right end. In order from the top: application (a window), presentation (a padlock), session (two ' +
    'opposite arrows), transport (a row of ports), network (a triangle of hosts), data link (a frame) and ' +
    'physical (a wave).',
};

export const TOPOLOGIES: Diagram = {
  id: 'topologies', trackId: 'a1', domainId: 'a1-d2', title: 'Network topologies',
  blurb: 'Six ways to join devices, and what breaks when one link or device fails.',
  parts: [
    { id: 'star', label: 'Star', cardId: 'a1-d2-topo-star' },
    { id: 'bus', label: 'Bus', cardId: 'a1-d2-topo-bus' },
    { id: 'ring', label: 'Ring', cardId: 'a1-d2-topo-ring' },
    { id: 'mesh', label: 'Mesh', cardId: 'a1-d2-topo-mesh' },
    { id: 'hybrid', label: 'Hybrid', cardId: 'a1-d2-topo-hybrid' },
    { id: 'p2p', label: 'Point to point', cardId: 'a1-d2-topo-p2p' },
  ],
  textAlternative:
    'Six small panels in two columns. Top left, a star: a central device with five spokes to outer devices. Top ' +
    'right, a bus: one long line with five devices hanging from it and a short bar at each end. Middle left, a ' +
    'ring: five devices around a circle. Middle right, a mesh: five devices with every one joined to every ' +
    'other. Bottom left, a hybrid: two small stars joined by a link. Bottom right, point to point: exactly two ' +
    'devices joined by one line.',
};

export const PORTS: Diagram = {
  id: 'ports', trackId: 'a1', domainId: 'a1-d3', title: 'Ports and connectors',
  blurb: 'Nine ports you will be asked to recognise by shape, on any desk or bench.',
  parts: [
    { id: 'usba', label: 'USB Type-A', cardId: 'a1-d3-pt-usba' },
    { id: 'usbc', label: 'USB-C', cardId: 'a1-d3-pt-usbc' },
    { id: 'hdmi', label: 'HDMI', cardId: 'a1-d3-pt-hdmi' },
    { id: 'dp', label: 'DisplayPort', cardId: 'a1-d3-pt-dp' },
    { id: 'rj45', label: 'RJ45 (Ethernet)', cardId: 'a1-d3-pt-rj45' },
    { id: 'rj11', label: 'RJ11 (telephone)', cardId: 'a1-d3-pt-rj11' },
    { id: 'vga', label: 'VGA', cardId: 'a1-d3-pt-vga' },
    { id: 'dvi', label: 'DVI', cardId: 'a1-d3-pt-dvi' },
    { id: 'audio', label: '3.5 mm audio jack', cardId: 'a1-d3-pt-audio' },
  ],
  textAlternative:
    'A three by three grid of ports. Top row: a flat rectangular USB Type-A, a small pill-shaped USB-C, and a ' +
    'wide HDMI with both bottom corners cut. Middle row: DisplayPort, a similar shape with only one corner cut; ' +
    'an RJ45 with eight contacts and a latch; and a smaller RJ11 with fewer contacts. Bottom row: a trapezoid ' +
    'VGA with fifteen holes in three rows, a wide DVI with a flat blade at one side, and a round audio jack.',
};

export const CABLES: Diagram = {
  id: 'cables', trackId: 'a1', domainId: 'a1-d3', title: 'Cables and fiber connectors',
  blurb: 'Copper, coax and fiber in cross-section, the fiber connectors, and the RJ45 wire order.',
  parts: [
    { id: 'utp', label: 'Unshielded twisted pair', cardId: 'a1-d3-cb-utp' },
    { id: 'stp', label: 'Shielded twisted pair', cardId: 'a1-d3-cb-stp' },
    { id: 'coax', label: 'Coaxial cable', cardId: 'a1-d3-cb-coax' },
    { id: 'sm', label: 'Single-mode fiber', cardId: 'a1-d3-cb-sm' },
    { id: 'mm', label: 'Multimode fiber', cardId: 'a1-d3-cb-mm' },
    { id: 'lc', label: 'LC connector', cardId: 'a1-d3-cb-lc' },
    { id: 'sc', label: 'SC connector', cardId: 'a1-d3-cb-sc' },
    { id: 'st', label: 'ST connector', cardId: 'a1-d3-cb-st' },
    { id: 't568', label: 'T568B wire order', cardId: 'a1-d3-cb-t568' },
  ],
  textAlternative:
    'A three by three grid. Top row, cross-sections: unshielded twisted pair with four pairs of small wires in ' +
    'an outer jacket; shielded twisted pair, the same with an extra ring for the shield; and coaxial cable ' +
    'as concentric circles around a centre conductor. Middle row: single-mode fiber with a very small core, ' +
    'multimode fiber with a wider core, and a small square LC connector with a latch. Bottom row: a larger ' +
    'square SC connector, a round ST connector with bayonet notches, and eight parallel wires in the T568B order.',
};

export const CPU_COOLING: Diagram = {
  id: 'cpu-cooling', trackId: 'a1', domainId: 'a1-d3', title: 'CPU cooling',
  blurb: 'An air cooler on the left, an all-in-one liquid cooler on the right.',
  parts: [
    { id: 'fan', label: 'Cooler fan', cardId: 'a1-d3-cool-fan' },
    { id: 'heatsink', label: 'Heatsink fins', cardId: 'a1-d3-cool-heatsink' },
    { id: 'pipes', label: 'Heat pipes', cardId: 'a1-d3-cool-pipes' },
    { id: 'paste', label: 'Thermal paste', cardId: 'a1-d3-cool-paste' },
    { id: 'ihs', label: 'CPU heat spreader', cardId: 'a1-d3-cool-ihs' },
    { id: 'mount', label: 'Backplate and mounting', cardId: 'a1-d3-cool-mount' },
    { id: 'pump', label: 'Pump block', cardId: 'a1-d3-cool-pump' },
    { id: 'radiator', label: 'Radiator', cardId: 'a1-d3-cool-radiator' },
  ],
  textAlternative:
    'Two coolers side by side, seen from the side. On the left, an air cooler from the top down: a fan, a stack ' +
    'of heatsink fins, a band of heat pipes, a thin layer of thermal paste, the CPU heat spreader, and the ' +
    'backplate and mounting hardware beneath. On the right, a liquid cooler: a radiator across the top joined by ' +
    'two tubes to a pump block that sits on the CPU at the bottom.',
};

export const LAPTOP: Diagram = {
  id: 'laptop', trackId: 'a1', domainId: 'a1-d1', title: 'Inside a laptop',
  blurb: 'The base with the keyboard removed: what sits where, and what connects to what.',
  parts: [
    { id: 'display', label: 'Display cable and hinge', cardId: 'a1-d1-lt-display' },
    { id: 'ram', label: 'SO-DIMM memory', cardId: 'a1-d1-lt-ram' },
    { id: 'storage', label: 'M.2 storage', cardId: 'a1-d1-lt-storage' },
    { id: 'wifi', label: 'Wi-Fi card', cardId: 'a1-d1-lt-wifi' },
    { id: 'board', label: 'Motherboard (CPU area)', cardId: 'a1-d1-lt-board' },
    { id: 'fan', label: 'Fan and heatsink', cardId: 'a1-d1-lt-fan' },
    { id: 'cmos', label: 'CMOS battery', cardId: 'a1-d1-lt-cmos' },
    { id: 'keyboard', label: 'Keyboard ribbon', cardId: 'a1-d1-lt-keyboard' },
    { id: 'battery', label: 'Battery', cardId: 'a1-d1-lt-battery' },
  ],
  textAlternative:
    'The base of a laptop seen from above with the keyboard lifted off. A thin display cable runs along the ' +
    'top edge to the hinge. Down the left side are the memory slot, the M.2 storage slot and the Wi-Fi card, ' +
    'with two antenna wires running up the left edge. In the middle is the motherboard’s CPU area, with a fan ' +
    'and heatsink to its right joined by a heat pipe, and a small round CMOS battery in the top-right corner. ' +
    'A flat keyboard ribbon runs below the CPU. The battery fills the whole front of the base.',
};

export const CATALOG = {
  'ram-modules': RAM_MODULES, storage: STORAGE, psu: PSU, 'laser-printer': LASER_PRINTER, osi: OSI,
  topologies: TOPOLOGIES, ports: PORTS, cables: CABLES, 'cpu-cooling': CPU_COOLING, laptop: LAPTOP,
} satisfies Record<string, Diagram>;
