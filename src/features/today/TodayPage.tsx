import { useLiveQuery } from 'dexie-react-hooks';
import { CARDS, TRACKS, cardsOfTrack, domainsOf, cardsOfDomain, type TrackId } from '../../content';
import { db } from '../../db/database';
import { flushOutbox } from '../../db/repository';
import { buildQueue, dueCount } from '../../domain/srs/queue';
import { readiness } from '../../domain/mastery/readiness';
import { XP_DAILY_CAP } from '../../domain/xp/kinds';
import { useSettings, useStates, useToday } from '../useApp';

interface Props {
  onReview: (track: TrackId) => void;
  onGo: (tab: 'learn' | 'me') => void;
}

export function TodayPage({ onReview, onGo }: Props) {
  const settings = useSettings();
  const day = useToday();
  const states = useStates();
  const pending = useLiveQuery(async () => {
    const rows = await db.outbox.toArray();
    return rows.filter((row) => row.sentAt === undefined && row.rejectedAt === undefined).length;
  }, []);
  const introduced = useLiveQuery(() => db.cardState.where('introducedOn').equals(day).count(), [day]);
  const earnedToday = useLiveQuery(async () => {
    const sessions = await db.sessions.where('dayKey').equals(day).toArray();
    const rows = await db.outbox.bulkGet(sessions.map((s) => s.id));
    return rows.reduce((n, row) => n + (row?.xp ?? 0), 0);
  }, [day]);

  if (!states || introduced === undefined) return <p className="quiet">Loading…</p>;

  const withCards = TRACKS.filter((track) => cardsOfTrack(track.id).length > 0);
  const total = CARDS.length;

  return (
    <>
      <header className="page-head">
        <h1>Today</h1>
        <p className="quiet">{total} cards in the bundle</p>
      </header>

      {withCards.map((track) => {
        const ids = cardsOfTrack(track.id).map((card) => card.id);
        const due = dueCount(ids, states, day);
        const queue = buildQueue(ids, states, day, {
          newPerDay: settings.newPerDay,
          introducedToday: introduced,
        });
        const domains = domainsOf(track.id).map((domain) => ({
          id: domain.id,
          weight: domain.weight,
          cardIds: cardsOfDomain(domain.id).map((card) => card.id),
        }));
        const ready = readiness(domains, states);
        return (
          <section className="card" key={track.id} aria-labelledby={`h-${track.id}`}>
            <h2 id={`h-${track.id}`}>{track.title}</h2>
            <p className="big">
              {queue.length === 0 ? 'Nothing due' : `${queue.length} to review`}
            </p>
            <p className="quiet">
              {due} due · {Math.max(0, settings.newPerDay - introduced)} new allowed today
            </p>
            <div
              className="meter"
              role="meter"
              aria-label={`${track.title} readiness`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ready.readiness * 100)}
            >
              <div className="meter-fill" style={{ width: `${Math.round(ready.readiness * 100)}%` }} />
            </div>
            <p className="quiet">
              {Math.round(ready.readiness * 100)}% learned
              {ready.weakest && ready.readiness > 0
                ? ` · weakest: ${domainsOf(track.id).find((d) => d.id === ready.weakest?.domainId)?.title}`
                : ''}
            </p>
            {queue.length > 0 ? (
              <button type="button" className="primary" onClick={() => onReview(track.id)}>
                Start reviewing
              </button>
            ) : (
              <p className="quiet">You are done for today. Try a new track in Learn.</p>
            )}
          </section>
        );
      })}

      <section className="card" aria-labelledby="h-xp">
        <h2 id="h-xp">HeartBeat XP</h2>
        {settings.linkState === 'unlinked' && (
          <>
            <p className="quiet">Not linked. Studying works without it.</p>
            <button type="button" className="secondary" onClick={() => onGo('me')}>Connect</button>
          </>
        )}
        {settings.linkState === 'linked' && (
          <p>
            {earnedToday ?? 0} of {XP_DAILY_CAP} XP today
            {(pending ?? 0) > 0 ? ` · ${pending} waiting to send` : ''}
            {(earnedToday ?? 0) >= XP_DAILY_CAP ? ' — maxed for today' : ''}
          </p>
        )}
        {settings.linkState === 'needs-reconnect' && (
          <>
            <p>The link was revoked. Your sessions are safe and will send once you reconnect.</p>
            <button type="button" className="secondary" onClick={() => onGo('me')}>Reconnect</button>
            <button type="button" className="quiet-button" onClick={() => void flushOutbox(Date.now())}>
              Try again
            </button>
          </>
        )}
      </section>
    </>
  );
}
