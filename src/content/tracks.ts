import type { Domain, Track } from './types';

/**
 * The three tracks and their domains.
 *
 * The A+ weightings and exam formats come from third-party listings, not from
 * CompTIA's own objectives PDF, which could not be reached when this was
 * written. Re-verify them against the official document before trusting the
 * readiness number. The domain names are the objectives' own headings; no
 * objective text is reproduced.
 */
export const TRACKS: Track[] = [
  { id: 'cs50', title: 'CS50 / intro CS', objectiveVersion: 'cs50x-2026' },
  {
    id: 'a1',
    title: 'A+ Core 1',
    objectiveVersion: '220-1201',
    exam: { code: '220-1201', questions: 90, minutes: 90, passMark: 675, scale: 900 },
  },
  {
    id: 'a2',
    title: 'A+ Core 2',
    objectiveVersion: '220-1202',
    exam: { code: '220-1202', questions: 90, minutes: 90, passMark: 700, scale: 900 },
  },
];

const cs50 = (n: number, title: string): Domain => ({
  id: `cs50-w${n}`,
  trackId: 'cs50',
  code: `Week ${n}`,
  title,
  weight: 1 / 10,
  order: n,
  objectiveVersion: 'cs50x-2026',
});

const a1 = (n: number, title: string, weight: number): Domain => ({
  id: `a1-d${n}`, trackId: 'a1', code: `${n}.0`, title, weight, order: n, objectiveVersion: '220-1201',
});

const a2 = (n: number, title: string, weight: number): Domain => ({
  id: `a2-d${n}`, trackId: 'a2', code: `${n}.0`, title, weight, order: n, objectiveVersion: '220-1202',
});

export const DOMAINS: Domain[] = [
  cs50(0, 'Computational thinking and binary'),
  cs50(1, 'C basics'),
  cs50(2, 'Arrays and strings'),
  cs50(3, 'Algorithms'),
  cs50(4, 'Memory'),
  cs50(5, 'Data structures'),
  cs50(6, 'Python'),
  cs50(7, 'SQL'),
  cs50(8, 'HTML, CSS and JavaScript'),
  cs50(9, 'Flask and web applications'),

  a1(1, 'Mobile devices', 0.13),
  a1(2, 'Networking', 0.23),
  a1(3, 'Hardware', 0.25),
  a1(4, 'Virtualization and cloud computing', 0.11),
  a1(5, 'Hardware and network troubleshooting', 0.28),

  a2(1, 'Operating systems', 0.28),
  a2(2, 'Security', 0.28),
  a2(3, 'Software troubleshooting', 0.23),
  a2(4, 'Operational procedures', 0.21),
];
