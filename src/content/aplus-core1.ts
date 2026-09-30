import type { Card } from './types';

/**
 * A+ Core 1 (220-1201). Topics follow the official objectives as an outline;
 * every word here is original. Verify against CompTIA's objectives PDF before
 * relying on coverage.
 */
const card = (domain: string, slug: string, front: string, back: string, why: string): Card => ({
  id: `${domain}-${slug}`,
  domainId: domain,
  front,
  back,
  why,
  provenance: 'objective-outline',
  tags: slug.startsWith('mb-') ? ['motherboard'] : undefined,
});

const hw = 'a1-d3';

/** One card per part of the motherboard diagram. */
export const MOTHERBOARD_CARDS: Card[] = [
  card(hw, 'mb-rear-io',
    'On a desktop, where do the monitor, network cable and USB keyboard plug in?',
    'The rear I/O panel: the ports built onto the back edge of the motherboard.',
    'They are part of the board, so the board decides which ports you get (USB, RJ45 Ethernet, audio, and video out for integrated graphics). The metal I/O shield just fills the gap in the case.'),
  card(hw, 'mb-eps8',
    'What does the 8-pin (4+4) connector near the top-left of the board power?',
    'The CPU, through the voltage regulators around the socket. It is the EPS12V connector.',
    'The 24-pin cable cannot feed a modern CPU on its own. Forgetting this plug is a classic "fans spin, nothing on screen" build mistake.'),
  card(hw, 'mb-cpu-socket',
    'LGA or PGA: where are the pins?',
    'LGA: the pins are in the socket and the CPU has flat pads. PGA: the pins are on the CPU and the socket has holes.',
    'A socket only takes CPUs made for it, so the socket name (for example LGA1700 or AM5) is the first thing to match when choosing a CPU.'),
  card(hw, 'mb-fan-header',
    'Which header should the CPU cooler’s fan use, and why does it matter?',
    'CPU_FAN, a 4-pin PWM header next to the socket.',
    'Firmware watches CPU_FAN. With nothing on it, many boards warn or stop at boot, and PWM is how the fan speeds up as the CPU warms.'),
  card(hw, 'mb-dimm',
    'The tall slots beside the CPU take what, and how do two sticks run in dual channel?',
    'DIMMs (desktop RAM). Put the pair in the slots the manual names, usually A2 and B2.',
    'A notch in each stick stops the wrong DDR generation fitting. Dual channel gives the CPU two paths to memory, so which slots you use changes the speed.'),
  card(hw, 'mb-atx24',
    'What is the widest power connector on the board?',
    'The 24-pin ATX main power connector (20-pin on old boards).',
    'It carries 3.3 V, 5 V and 12 V to the whole board. A 20+4 pin plug from the power supply fits both kinds.'),
  card(hw, 'mb-pcie-x16',
    'What usually goes in the long PCIe x16 slot nearest the CPU?',
    'The graphics card.',
    '"x16" is sixteen lanes, the most bandwidth a slot offers. The one nearest the CPU is normally wired straight to it.'),
  card(hw, 'mb-pcie-x1',
    'What fits a short PCIe x1 slot?',
    'Small expansion cards: Wi-Fi, sound, an extra network or USB card.',
    'One lane is plenty for them. A short card fits a longer PCIe slot, never the other way round.'),
  card(hw, 'mb-m2',
    'What is the M.2 slot for, and which two ways can an M.2 SSD talk to the system?',
    'A small SSD that screws flat to the board. It runs as NVMe over PCIe (fast) or as SATA (slower).',
    'Same shape, different bus, so check what the slot supports. The notches on the edge connector (B key, M key) are the hint.'),
  card(hw, 'mb-chipset',
    'What does the chipset do?',
    'It links the CPU to the slower parts: SATA, USB, extra PCIe lanes, audio and networking.',
    'Modern CPUs talk to RAM and the main x16 slot directly; the chipset handles the rest. Older boards split this job into a northbridge and a southbridge.'),
  card(hw, 'mb-sata',
    'What plugs into the SATA ports?',
    '2.5" and 3.5" drives and optical drives, one per port. The drive’s power comes separately from the power supply.',
    'SATA III tops out at 6 Gb/s, which is why an NVMe SSD is faster. The L-shaped plug only fits one way round.'),
  card(hw, 'mb-cmos',
    'What does the coin cell on the board do, and what does a dead one look like?',
    'It keeps the clock and firmware settings alive while the PC is unplugged. When it dies, the time resets and settings are lost at every boot.',
    'Swapping the CR2032 (or clearing CMOS on purpose) puts firmware settings back to their defaults, which is also a known fix for a board that will not POST after a bad setting.'),
  card(hw, 'mb-uefi',
    'What lives on the UEFI firmware chip?',
    'The firmware that runs POST, finds a boot device and starts the operating system, plus its setup screens.',
    'UEFI replaced legacy BIOS and adds Secure Boot and booting from GPT disks larger than 2 TB. Updating it is called flashing the firmware.'),
  card(hw, 'mb-usb-header',
    'What connects to the internal USB header?',
    'The case’s front USB ports.',
    'Front ports are only a cable back to the board. If they are dead, check this header before blaming the ports.'),
  card(hw, 'mb-front-panel',
    'What connects to the front-panel header?',
    'The case’s power button, reset button, power LED and drive-activity LED.',
    'The pins are tiny and labelled (PWR_SW, RESET, PLED, HDD_LED). A PC that never turns on may just have the power switch on the wrong pins.'),
];

export const A1_CARDS: Card[] = [...MOTHERBOARD_CARDS];
