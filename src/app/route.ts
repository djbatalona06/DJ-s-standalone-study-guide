import type { TrackId } from '../content/types';

/**
 * Hash routes, so a static host needs no rewrite rules and a reload lands on
 * the same screen. Small enough that a router dependency would be heavier than
 * the thing it replaces.
 */
export type Route =
  | { name: 'today' }
  | { name: 'learn' }
  | { name: 'me' }
  | { name: 'welcome' }
  | { name: 'review'; track: TrackId }
  | { name: 'diagram'; id: string }
  | { name: 'flashcards'; deck: string };

const TRACK_IDS: readonly string[] = ['cs50', 'a1', 'a2'];

export function parseRoute(hash: string): Route {
  const [head, arg] = hash.replace(/^#?\/?/, '').split('/');
  switch (head) {
    case '': return { name: 'today' };
    case 'learn': return { name: 'learn' };
    case 'me': return { name: 'me' };
    case 'welcome': return { name: 'welcome' };
    case 'review':
      return arg && TRACK_IDS.includes(arg) ? { name: 'review', track: arg as TrackId } : { name: 'today' };
    case 'diagram':
      return arg ? { name: 'diagram', id: decodeURIComponent(arg) } : { name: 'learn' };
    case 'flashcards':
      return arg ? { name: 'flashcards', deck: decodeURIComponent(arg) } : { name: 'learn' };
    default: return { name: 'today' };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'today': return '#/';
    case 'review': return `#/review/${route.track}`;
    case 'diagram': return `#/diagram/${encodeURIComponent(route.id)}`;
    case 'flashcards': return `#/flashcards/${encodeURIComponent(route.deck)}`;
    default: return `#/${route.name}`;
  }
}
