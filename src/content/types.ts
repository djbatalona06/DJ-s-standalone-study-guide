/** Where a card's words came from. Every card carries one; the validator rejects a blank. */
export type Provenance = 'original' | 'objective-outline' | 'cs50-derived';

export type TrackId = 'cs50' | 'a1' | 'a2';

export interface Track {
  id: TrackId;
  title: string;
  /** The exam or syllabus this follows, so an objective revision is one search. */
  objectiveVersion: string;
  /** Present for exam tracks. Verify against the publisher's official objectives before relying on them. */
  exam?: { code: string; questions: number; minutes: number; passMark: number; scale: number };
}

export interface Domain {
  id: string;
  trackId: TrackId;
  /** The objective's own number or the course week, for display. */
  code: string;
  title: string;
  /** Share of the exam (or of the course, for CS50). Sums to 1 within a track. */
  weight: number;
  order: number;
  objectiveVersion: string;
}

export interface Card {
  /** Stable forever. Progress keys on it, so it is never renumbered, only retired. */
  id: string;
  domainId: string;
  front: string;
  back: string;
  /** Why the answer is the answer. The part that makes it stick. */
  why: string;
  /** A nudge toward the answer without giving it away. Shown before the card flips. */
  hint: string;
  provenance: Provenance;
  sourceUrl?: string;
  tags?: string[];
}

interface QuestionBase {
  /** Stable forever, like a card id. Answers key on it. */
  id: string;
  domainId: string;
  prompt: string;
  /** Shown after answering. Mandatory: a question without a why teaches nothing. */
  explanation: string;
  provenance: Provenance;
  /** The card that covers this. A miss brings that card back for review today. */
  cardId?: string;
}

/** Pick one. `answer` indexes `choices` as written; display order is shuffled. */
export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  choices: string[];
  answer: number;
}

/** Pick several; only the exact set is right. The prompt says how many. */
export interface MultiQuestion extends QuestionBase {
  type: 'multi';
  choices: string[];
  answers: number[];
}

/** Put the steps in order. `items` is written in the correct order; display is shuffled. */
export interface OrderQuestion extends QuestionBase {
  type: 'order';
  items: string[];
}

/** Pair each term with its definition. Written matched; definitions are shuffled on screen. */
export interface MatchQuestion extends QuestionBase {
  type: 'match';
  pairs: Array<{ term: string; definition: string }>;
}

export type Question = McqQuestion | MultiQuestion | OrderQuestion | MatchQuestion;

/**
 * What a learner gave. Always in terms of the question's own (unshuffled)
 * indices, so scoring never needs to know how it was displayed.
 * mcq: the choice. multi: the chosen set. order: item indices in the learner's order.
 * match: for each term, the index of the definition chosen (-1 for none).
 */
export type Answer = number | number[];
