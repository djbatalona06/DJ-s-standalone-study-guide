import { CS50_CARDS } from './cs50';
import { DOMAINS, TRACKS } from './tracks';
import type { Card, Domain, Track, TrackId } from './types';

export { DOMAINS, TRACKS };
export type { Card, Domain, Track, TrackId };

/** Every card in the bundle. A+ decks join this list as they are written. */
export const CARDS: Card[] = [...CS50_CARDS];

export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(CARDS.map((card) => [card.id, card]));

export function domainsOf(trackId: TrackId): Domain[] {
  return DOMAINS.filter((domain) => domain.trackId === trackId).sort((a, b) => a.order - b.order);
}

export function cardsOfTrack(trackId: TrackId): Card[] {
  const domainIds = new Set(domainsOf(trackId).map((domain) => domain.id));
  return CARDS.filter((card) => domainIds.has(card.domainId));
}

export function cardsOfDomain(domainId: string): Card[] {
  return CARDS.filter((card) => card.domainId === domainId);
}
