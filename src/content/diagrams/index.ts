import { MOTHERBOARD } from './motherboard';
import type { Diagram, DiagramArt } from './types';

export type { Diagram, DiagramArt, DiagramPart, Rect } from './types';

export const DIAGRAMS = { motherboard: MOTHERBOARD } satisfies Record<string, Diagram>;
export type DiagramId = keyof typeof DIAGRAMS;

/** The art for each diagram, one lazy chunk each (`diagram-*.js`). */
export const DIAGRAM_ART: Record<DiagramId, () => Promise<{ default: DiagramArt }>> = {
  motherboard: () => import('./diagram-motherboard'),
};

export function diagramById(id: string): Diagram | undefined {
  return Object.hasOwn(DIAGRAMS, id) ? DIAGRAMS[id as DiagramId] : undefined;
}

export function diagramsOf(domainId: string): Diagram[] {
  return Object.values(DIAGRAMS).filter((diagram) => diagram.domainId === domainId);
}
