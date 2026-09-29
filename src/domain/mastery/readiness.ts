import type { CardState } from '../srs/srs';

/** A card counts as fully learned once it is scheduled this many days out. */
export const MATURE_DAYS = 21;

export interface DomainInput {
  id: string;
  weight: number;
  cardIds: readonly string[];
}

export interface DomainMastery {
  domainId: string;
  weight: number;
  cards: number;
  /** 0–1, from how far out the cards are scheduled. */
  recall: number;
  /** 0–1 from quiz answers, when there are any. */
  quiz?: number;
  mastery: number;
}

/** One card's contribution: nothing until seen, then growing with its interval. */
export function cardMastery(state: CardState | undefined): number {
  if (!state || state.reviews === 0) return 0;
  return Math.min(1, state.interval / MATURE_DAYS);
}

/**
 * Mastery of one domain. Recall is the mean of its cards; when quiz accuracy is
 * known it is blended in evenly. The even split is a starting guess, to be tuned
 * against real practice-exam results.
 */
export function domainMastery(
  domain: DomainInput,
  states: ReadonlyMap<string, CardState>,
  quizAccuracy?: number,
): DomainMastery {
  const cards = domain.cardIds.length;
  const recall = cards === 0
    ? 0
    : domain.cardIds.reduce((n, id) => n + cardMastery(states.get(id)), 0) / cards;
  const mastery = quizAccuracy === undefined ? recall : 0.5 * recall + 0.5 * quizAccuracy;
  return { domainId: domain.id, weight: domain.weight, cards, recall, quiz: quizAccuracy, mastery };
}

/** Weighted by the exam's own domain weights, so the number tracks what the exam tests. */
export function readiness(
  domains: readonly DomainInput[],
  states: ReadonlyMap<string, CardState>,
  quizByDomain: ReadonlyMap<string, number> = new Map(),
): { readiness: number; domains: DomainMastery[]; weakest?: DomainMastery } {
  const detail = domains.map((d) => domainMastery(d, states, quizByDomain.get(d.id)));
  const total = detail.reduce((n, d) => n + d.weight * d.mastery, 0);
  const withCards = detail.filter((d) => d.cards > 0);
  const weakest = withCards.length
    ? withCards.reduce((a, b) => (b.mastery < a.mastery ? b : a))
    : undefined;
  return { readiness: total, domains: detail, weakest };
}
