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
  | { name: 'path' }
  | { name: 'node'; id: string }
  | { name: 'welcome' }
  | { name: 'review'; track: TrackId }
  | { name: 'study'; track: TrackId }
  | { name: 'battle'; track: TrackId }
  | { name: 'quiz'; scope: string }
  | { name: 'exam'; track: TrackId }
  | { name: 'diagram'; id: string }
  | { name: 'flashcards'; deck: string };

const TRACK_IDS: readonly string[] = ['cs50', 'a1', 'a2'];

export function parseRoute(hash: string): Route {
  const [head, arg] = hash.replace(/^#?\/?/, '').split('/');
  switch (head) {
    case '': return { name: 'today' };
    case 'learn': return { name: 'learn' };
    case 'me': return { name: 'me' };
    case 'path': return arg ? { name: 'node', id: decodeURIComponent(arg) } : { name: 'path' };
    case 'welcome': return { name: 'welcome' };
    case 'review':
      return arg && TRACK_IDS.includes(arg) ? { name: 'review', track: arg as TrackId } : { name: 'today' };
    case 'study':
      return arg && TRACK_IDS.includes(arg) ? { name: 'study', track: arg as TrackId } : { name: 'today' };
    case 'battle':
      return arg && TRACK_IDS.includes(arg) ? { name: 'battle', track: arg as TrackId } : { name: 'learn' };
    case 'quiz':
      return arg ? { name: 'quiz', scope: decodeURIComponent(arg) } : { name: 'learn' };
    case 'exam':
      return arg && TRACK_IDS.includes(arg) ? { name: 'exam', track: arg as TrackId } : { name: 'learn' };
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
    case 'node': return `#/path/${encodeURIComponent(route.id)}`;
    case 'study': return `#/study/${route.track}`;
    case 'battle': return `#/battle/${route.track}`;
    case 'quiz': return `#/quiz/${encodeURIComponent(route.scope)}`;
    case 'exam': return `#/exam/${route.track}`;
    case 'diagram': return `#/diagram/${encodeURIComponent(route.id)}`;
    case 'flashcards': return `#/flashcards/${encodeURIComponent(route.deck)}`;
    default: return `#/${route.name}`;
  }
}
