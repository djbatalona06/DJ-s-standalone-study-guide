import type { TrackId } from '../types';

/**
 * A diagram is split in two on purpose.
 *
 * `Diagram` (names, cards, the text alternative) ships in the main bundle, so
 * the list view works even if the art never loads. `DiagramArt` (the geometry)
 * is its own lazy chunk, kept out of the precache and cached on first use.
 */
export interface DiagramPart {
  /** Stable, like a card id. */
  id: string;
  label: string;
  /** The card that explains this part. Every part has one. */
  cardId: string;
}

export interface Diagram {
  id: string;
  trackId: TrackId;
  domainId: string;
  title: string;
  blurb: string;
  /** Parts in reading order: the list view and the arrow keys follow it. */
  parts: DiagramPart[];
  /** A paragraph a screen reader user gets instead of the picture. */
  textAlternative: string;
}

/** Everything is placed in one 100×100 space, the same trick HeartBeat's `art/house/` uses. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  round?: boolean;
}

export interface DiagramArt {
  viewBox: '0 0 100 100';
  /** One hit area per part id. */
  shapes: Record<string, Rect>;
  /** Drawn under the parts, never interactive: the board, holes, traces. */
  decor: Array<{ d: string; fill?: boolean }>;
  /** Drawn over the parts, never interactive: pins, slot dividers, fins. */
  detail: string[];
}
