import type { DiagramArt } from './types';
import { around, circle, line } from './draw';

type P = readonly [number, number];
const node = ([x, y]: P) => circle(x, y, 1.9);
const link = ([x1, y1]: P, [x2, y2]: P) => line(x1, y1, x2, y2);

/** Every pair of points joined. */
const allPairs = (pts: P[]) => pts.flatMap((a, i) => pts.slice(i + 1).map((b) => link(a, b)));

const starHub: P = [27, 19];
const starNodes = around(27, 19, 11, 5) as P[];
const ringNodes = around(27, 51, 9, 5) as P[];
const meshNodes = around(73, 51, 9, 5) as P[];
const busNodes: P[] = [[59, 10], [67, 28], [75, 10], [83, 28], [91, 10]];
const hubA: P = [15, 83];
const hubB: P = [39, 83];
const nodesA: P[] = [[9, 76], [9, 90], [21, 90]];
const nodesB: P[] = [[45, 76], [45, 90], [33, 90]];

const art: DiagramArt = {
  viewBox: '0 0 100 100',
  shapes: {
    star: { x: 6, y: 6, w: 42, h: 27 },
    bus: { x: 52, y: 6, w: 42, h: 27 },
    ring: { x: 6, y: 38, w: 42, h: 27 },
    mesh: { x: 52, y: 38, w: 42, h: 27 },
    hybrid: { x: 6, y: 70, w: 42, h: 26 },
    p2p: { x: 52, y: 70, w: 42, h: 26 },
  },
  decor: [],
  detail: [
    // Star: a hub with five spokes.
    ...starNodes.map((p) => link(starHub, p)), node(starHub), ...starNodes.map(node),
    // Bus: one backbone, a terminator at each end, five drops.
    line(55, 19, 93, 19), line(55, 16, 55, 22), line(93, 16, 93, 22),
    ...busNodes.map(([x, y]) => line(x, 19, x, y)), ...busNodes.map(node),
    // Ring: five hosts in a loop.
    ...ringNodes.map((p, i) => link(p, ringNodes[(i + 1) % 5])), ...ringNodes.map(node),
    // Mesh: every host joined to every other.
    ...allPairs(meshNodes), ...meshNodes.map(node),
    // Hybrid: two small stars joined by a link.
    ...nodesA.map((p) => link(hubA, p)), ...nodesB.map((p) => link(hubB, p)),
    link(hubA, hubB), node(hubA), node(hubB), ...nodesA.map(node), ...nodesB.map(node),
    // Point to point: exactly two ends.
    link([60, 83], [86, 83]), node([60, 83]), node([86, 83]),
  ],
};

export default art;
