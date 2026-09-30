import type { McqQuestion, MatchQuestion, MultiQuestion, OrderQuestion, Provenance } from '../types';

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
  };
}
