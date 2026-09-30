import type { Diagram, DiagramArt } from './diagrams/types';
import type { Card, Domain, Question, Track } from './types';

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
    // Two parts sharing space would make one of them untappable.
    const shapes = Object.entries(art.shapes);
    for (const [i, [idA, a]] of shapes.entries()) {
      for (const [idB, b] of shapes.slice(i + 1)) {
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
          problems.push(`parts ${diagram.id}/${idA} and ${idB} overlap`);
        }
      }
    }
  }
  return problems;
}

const unique = (items: readonly string[]) => new Set(items.map((x) => x.trim())).size === items.length;

/**
 * Everything that must be true of a question bank before it ships. Like the card
 * check, it runs in the tests, so a broken answer key fails the build instead of
 * teaching somebody the wrong thing.
 */
export function validateQuestions(
  domains: Domain[],
  cards: Card[],
  questions: Question[],
  diagrams: ReadonlyArray<Pick<Diagram, 'id' | 'parts'>> = [],
): string[] {
  const problems: string[] = [];
  const domainIds = new Set(domains.map((d) => d.id));
  const cardIds = new Set(cards.map((c) => c.id));
  const partCount = new Map(diagrams.map((d) => [d.id, d.parts.length]));
  const seen = new Set<string>();

  for (const q of questions) {
    const at = `question ${q.id}`;
    if (seen.has(q.id)) problems.push(`duplicate question id: ${q.id}`);
    seen.add(q.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(q.id)) problems.push(`${at} is not a stable slug`);
    if (!domainIds.has(q.domainId)) problems.push(`${at} names an unknown domain`);
    if (!q.prompt.trim()) problems.push(`${at} has no prompt`);
    if (!q.explanation.trim()) problems.push(`${at} has no explanation`);
    if (!PROVENANCE.has(q.provenance)) problems.push(`${at} has no provenance`);
    if (q.cardId && !cardIds.has(q.cardId)) problems.push(`${at} names a missing card ${q.cardId}`);

    if (q.type === 'mcq') {
      if (q.choices.length < 2) problems.push(`${at} has fewer than two choices`);
      if (!unique(q.choices) || q.choices.some((c) => !c.trim())) problems.push(`${at} has blank or repeated choices`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) problems.push(`${at} has an answer outside its choices`);
    } else if (q.type === 'multi') {
      if (!unique(q.choices) || q.choices.some((c) => !c.trim())) problems.push(`${at} has blank or repeated choices`);
      const ok = q.answers.every((a) => Number.isInteger(a) && a >= 0 && a < q.choices.length);
      if (!ok || new Set(q.answers).size !== q.answers.length) problems.push(`${at} has a bad answer key`);
      if (q.answers.length < 2 || q.answers.length >= q.choices.length) problems.push(`${at} must have at least two right answers and at least one wrong one`);
    } else if (q.type === 'order') {
      if (q.items.length < 3) problems.push(`${at} has fewer than three items to order`);
      if (!unique(q.items) || q.items.some((i) => !i.trim())) problems.push(`${at} has blank or repeated items`);
    } else if (q.type === 'match') {
      if (q.pairs.length < 3) problems.push(`${at} has fewer than three pairs`);
      if (!unique(q.pairs.map((p) => p.term)) || !unique(q.pairs.map((p) => p.definition))) problems.push(`${at} has repeated terms or definitions`);
      if (q.pairs.some((p) => !p.term.trim() || !p.definition.trim())) problems.push(`${at} has a blank term or definition`);
    } else if (q.type === 'hotspot') {
      const parts = partCount.get(q.diagramId);
      if (parts === undefined) problems.push(`${at} names a missing diagram ${q.diagramId}`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= parts) problems.push(`${at} has an answer outside its diagram’s parts`);
    } else {
      problems.push(`${at} has an unknown type`);
    }
  }
  return problems;
}
