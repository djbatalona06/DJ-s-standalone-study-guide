import { DIAGRAMS } from '../diagrams';
import type { Diagram } from '../diagrams';
import type { HotspotQuestion, McqQuestion, MatchQuestion, MultiQuestion, OrderQuestion, Provenance } from '../types';

/**
 * Small builders so a bank reads as content, not plumbing. Every question is
 * written from an objective as an outline; none is copied from an exam or a
 * question dump. The right answer is written first and the display order is
 * shuffled at run time, so its position in this file gives nothing away.
 */
export function questionBuilders(domainId: string, provenance: Provenance = 'objective-outline') {
  const id = (slug: string) => `q-${domainId}-${slug}`;
  return {
    mcq: (slug: string, prompt: string, right: string, wrong: string[], explanation: string, cardId?: string): McqQuestion => ({
      id: id(slug), domainId, type: 'mcq', prompt, choices: [right, ...wrong], answer: 0, explanation, provenance, cardId,
    }),
    multi: (slug: string, prompt: string, right: string[], wrong: string[], explanation: string, cardId?: string): MultiQuestion => ({
      id: id(slug), domainId, type: 'multi', prompt,
      choices: [...right, ...wrong], answers: right.map((_, i) => i), explanation, provenance, cardId,
    }),
    order: (slug: string, prompt: string, items: string[], explanation: string, cardId?: string): OrderQuestion => ({
      id: id(slug), domainId, type: 'order', prompt, items, explanation, provenance, cardId,
    }),
    match: (slug: string, prompt: string, pairs: Array<[string, string]>, explanation: string, cardId?: string): MatchQuestion => ({
      id: id(slug), domainId, type: 'match', prompt,
      pairs: pairs.map(([term, definition]) => ({ term, definition })), explanation, provenance, cardId,
    }),
    /** Pick a part of a diagram. Throws at load if the part is not there, so a typo fails the tests, not a learner. */
    hotspot: (slug: string, prompt: string, diagramId: string, partId: string, explanation: string, cardId?: string): HotspotQuestion => {
      const diagram = (DIAGRAMS as Record<string, Diagram>)[diagramId];
      const answer = diagram ? diagram.parts.findIndex((part) => part.id === partId) : -1;
      if (answer < 0) throw new Error(`hotspot ${slug}: no part ${partId} in diagram ${diagramId}`);
      return { id: id(slug), domainId, type: 'hotspot', prompt, diagramId, answer, explanation, provenance, cardId };
    },
  };
}
