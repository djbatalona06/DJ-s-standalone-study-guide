import { A1_CARDS } from './aplus-core1';
import { A2_CARDS } from './aplus-core2';
import { DIAGRAM_CARDS } from './diagram-cards';
import { CS50_CARDS } from './cs50';
import { DOMAINS, TRACKS, domainsOf } from './index';
import type { Card, TrackId } from './types';

/**
 * Every card, in one chunk. The screens that need card text load it through
 * `useLibrary`, so the first paint does not wait for around 300 cards it may
 * not show. Tracks, domains and the question banks stay in the main content
 * module because the shell and the readiness maths need only their ids.
 * A+ decks join `CARDS` as they are written.
 */
export const CARDS: Card[] = [...CS50_CARDS, ...A1_CARDS, ...DIAGRAM_CARDS, ...A2_CARDS];

export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(CARDS.map((card) => [card.id, card]));

export function cardsOfTrack(trackId: TrackId): Card[] {
  const domainIds = new Set(domainsOf(trackId).map((domain) => domain.id));
  return CARDS.filter((card) => domainIds.has(card.domainId));
}

export function cardsOfDomain(domainId: string): Card[] {
  return CARDS.filter((card) => card.domainId === domainId);
}

export interface Deck {
  id: string;
  title: string;
  /** The track to send "review these properly" to. */
  trackId: TrackId;
  cards: Card[];
}

/**
 * A browsable set of cards for Flashcards mode. The id is a track (`a1`), a
 * domain (`a1-d3`) or a diagram (`motherboard`), so any of them can link here.
 */
export function deckById(id: string, diagrams: ReadonlyArray<{ id: string; title: string; trackId: TrackId; parts: ReadonlyArray<{ cardId: string }> }>): Deck | undefined {
  const track = TRACKS.find((t) => t.id === id);
  if (track) return { id, title: track.title, trackId: track.id, cards: cardsOfTrack(track.id) };
  const domain = DOMAINS.find((d) => d.id === id);
  if (domain) return { id, title: domain.title, trackId: domain.trackId, cards: cardsOfDomain(domain.id) };
  const diagram = diagrams.find((d) => d.id === id);
  if (diagram) {
    const cards = diagram.parts.map((p) => CARD_BY_ID.get(p.cardId)).filter((c): c is Card => c !== undefined);
    return { id, title: diagram.title, trackId: diagram.trackId, cards };
  }
  return undefined;
}
