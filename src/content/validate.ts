import type { Diagram, DiagramArt } from './diagrams/types';
import type { Card, Domain, Track } from './types';

const PROVENANCE = new Set(['original', 'objective-outline', 'cs50-derived']);

/**
 * Everything that must be true of the content before it ships, as a list of
 * problems. Empty means valid. Runs in the tests, so a bad card fails the build
 * instead of reaching a phone.
 */
export function validateContent(tracks: Track[], domains: Domain[], cards: Card[]): string[] {
  const problems: string[] = [];
  const trackIds = new Set(tracks.map((t) => t.id));
  const domainIds = new Set<string>();

  for (const domain of domains) {
    if (domainIds.has(domain.id)) problems.push(`duplicate domain id: ${domain.id}`);
    domainIds.add(domain.id);
    if (!trackIds.has(domain.trackId)) problems.push(`domain ${domain.id} names an unknown track`);
    if (!domain.objectiveVersion) problems.push(`domain ${domain.id} has no objectiveVersion`);
  }

  for (const track of tracks) {
    const sum = domains.filter((d) => d.trackId === track.id).reduce((n, d) => n + d.weight, 0);
    if (Math.abs(sum - 1) > 1e-9) problems.push(`track ${track.id} domain weights sum to ${sum}, not 1`);
  }

  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.id)) problems.push(`duplicate card id: ${card.id}`);
    seen.add(card.id);
    if (!domainIds.has(card.domainId)) problems.push(`card ${card.id} names an unknown domain`);
    if (!card.front.trim() || !card.back.trim()) problems.push(`card ${card.id} has an empty side`);
    if (!card.why.trim()) problems.push(`card ${card.id} has no explanation`);
    if (!card.hint?.trim()) problems.push(`card ${card.id} has no hint`);
    else if (card.back.trim() && card.hint.includes(card.back.trim())) {
      problems.push(`card ${card.id} has a hint that gives the answer away`);
    }
    if (!PROVENANCE.has(card.provenance)) problems.push(`card ${card.id} has no provenance`);
    if (card.provenance === 'cs50-derived' && !card.sourceUrl) {
      problems.push(`card ${card.id} is derived from CS50 but names no source`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(card.id)) problems.push(`card id ${card.id} is not a stable slug`);
  }

  return problems;
}

/**
 * A diagram is only useful if every part explains itself and the picture can
 * be replaced by words. `art` is optional so the check can run on the main
 * bundle alone; the tests pass it too.
 */
export function validateDiagram(diagram: Diagram, cards: Card[], art?: DiagramArt): string[] {
  const problems: string[] = [];
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const ids = new Set<string>();
  const labels = new Set<string>();

  if (!diagram.textAlternative.trim()) problems.push(`diagram ${diagram.id} has no text alternative`);
  for (const part of diagram.parts) {
    if (ids.has(part.id)) problems.push(`diagram ${diagram.id} repeats part id ${part.id}`);
    ids.add(part.id);
    // Labelling works by name, so two parts with one name could never both be right.
    if (labels.has(part.label)) problems.push(`diagram ${diagram.id} repeats label ${part.label}`);
    labels.add(part.label);
    const card = cardById.get(part.cardId);
    if (!card) problems.push(`part ${diagram.id}/${part.id} names a missing card ${part.cardId}`);
    else if (card.domainId !== diagram.domainId) {
      problems.push(`part ${diagram.id}/${part.id} explains itself with a card from another domain`);
    }
  }

  if (art) {
    for (const id of ids) if (!art.shapes[id]) problems.push(`part ${diagram.id}/${id} has no shape`);
    for (const [id, r] of Object.entries(art.shapes)) {
      if (!ids.has(id)) problems.push(`diagram ${diagram.id} draws an unknown part ${id}`);
      if (r.x < 0 || r.y < 0 || r.x + r.w > 100 || r.y + r.h > 100) {
        problems.push(`part ${diagram.id}/${id} sits outside the 100x100 space`);
      }
    }
  }
  return problems;
}
