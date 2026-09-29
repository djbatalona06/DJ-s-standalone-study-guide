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
    if (!PROVENANCE.has(card.provenance)) problems.push(`card ${card.id} has no provenance`);
    if (card.provenance === 'cs50-derived' && !card.sourceUrl) {
      problems.push(`card ${card.id} is derived from CS50 but names no source`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(card.id)) problems.push(`card id ${card.id} is not a stable slug`);
  }

  return problems;
}
