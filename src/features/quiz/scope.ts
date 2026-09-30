import { DOMAINS, TRACKS, domainsOf, type TrackId } from '../../content';

/** A quiz scope is a track (`a1`) or one of its domains (`a1-d3`). */
export function resolveScope(scope: string): { trackId: TrackId; domainIds: string[]; title: string } | undefined {
  const track = TRACKS.find((t) => t.id === scope);
  if (track) return { trackId: track.id, domainIds: domainsOf(track.id).map((d) => d.id), title: track.title };
  const domain = DOMAINS.find((d) => d.id === scope);
  if (domain) return { trackId: domain.trackId, domainIds: [domain.id], title: domain.title };
  return undefined;
}
