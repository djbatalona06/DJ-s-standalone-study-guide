import { DOMAINS, TRACKS } from './tracks';
import type { Card, Domain, Track, TrackId } from './types';

export { DOMAINS, TRACKS };
export type { Card, Domain, Track, TrackId };

export function domainsOf(trackId: TrackId): Domain[] {
  return DOMAINS.filter((domain) => domain.trackId === trackId).sort((a, b) => a.order - b.order);
}

/** The card library, fetched once and shared. Anything that shows card text waits on this. */
export type Library = typeof import('./library');
let pending: Promise<Library> | undefined;
export const loadLibrary = (): Promise<Library> => (pending ??= import('./library'));
