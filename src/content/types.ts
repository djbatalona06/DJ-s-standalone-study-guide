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
  provenance: Provenance;
  sourceUrl?: string;
  tags?: string[];
}
