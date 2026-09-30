import { useLiveQuery } from 'dexie-react-hooks';
import { Flame } from 'lucide-react';
import { Sprite } from '@/art/Sprite';
import { STAGE_FRAMES } from '@/art/sprites';
import { Button } from '@/components/ui/8bit/button';
import XpBar from '@/components/ui/8bit/xp-bar';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { href } from '@/app/route';
import { go } from '@/app/useRoute';
import { DIAGRAMS } from '@/content/diagrams';
import { TRACKS, cardsOfDomain, cardsOfTrack, domainsOf, type TrackId } from '@/content';
import { db } from '@/db/database';
import { flushOutbox } from '@/db/repository';
import { buildQueue } from '@/domain/srs/queue';
import { readiness } from '@/domain/mastery/readiness';
import { streak } from '@/domain/streak';
import { XP_DAILY_CAP } from '@/domain/xp/kinds';
import { useSettings, useStates, useStudyDays, useToday } from '../useApp';

function greeting(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

export function TodayPage() {
  const settings = useSettings();
  const day = useToday();
  const states = useStates();
  const studied = useStudyDays();
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

  if (!states || introduced === undefined || !studied) {
    return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;
  }

  const days = streak(studied, day);
  const name = settings.characterName || 'You';
  const tracks = TRACKS.filter((t) => settings.tracks.includes(t.id) && cardsOfTrack(t.id).length > 0);
  const rows = tracks.map((track) => {
    const ids = cardsOfTrack(track.id).map((card) => card.id);
    const queue = buildQueue(ids, states, day, { newPerDay: settings.newPerDay, introducedToday: introduced });
    const ready = readiness(
      domainsOf(track.id).map((d) => ({ id: d.id, weight: d.weight, cardIds: cardsOfDomain(d.id).map((c) => c.id) })),
      states,
    );
    const weakest = ready.weakest && ready.readiness > 0
      ? domainsOf(track.id).find((d) => d.id === ready.weakest?.domainId)?.title
      : undefined;
    return { track, toReview: queue.length, ready, weakest };
  });
  const first = rows.find((row) => row.toReview > 0);
  const total = rows.reduce((n, row) => n + row.toReview, 0);
  const review = (track: TrackId) => go({ name: 'review', track });
  const earned = earnedToday ?? 0;

  return (
    <>
      <header className="mb-8 flex items-center gap-5">
        <Sprite frames={STAGE_FRAMES.Foundations ?? []} size={88} label={`${name}, typing on a laptop`} />
        <div className="min-w-0">
          <h1 className="cursor font-pixel text-sm leading-relaxed">
            {greeting(new Date().getHours())}, {name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lvl 1 · Foundations · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm">
            <Flame aria-hidden="true" className="size-4 text-(--color-xp)" />
            {days > 1 ? `${days}-day streak` : days === 1 ? 'Day 1. Come back tomorrow for day 2.' : 'Day 1 starts with one card.'}
          </p>
        </div>
      </header>

      <Panel title="Due now" id="due">
        <p className="font-pixel text-2xl leading-snug">{total === 0 ? 'All clear' : `${total} cards`}</p>
        <p className="text-muted-foreground">
          {total === 0
            ? 'Nothing due. Try the motherboard below, or come back tomorrow.'
            : `${Math.max(0, settings.newPerDay - introduced)} new cards still allowed today.`}
        </p>
        {first ? (
          <Button className="mt-3 h-12 w-full" onClick={() => review(first.track.id)}>
            Review {first.track.title}
          </Button>
        ) : null}
        {rows.filter((row) => row !== first && row.toReview > 0).map((row) => (
          <Button key={row.track.id} variant="secondary" className="mt-3 h-12 w-full" onClick={() => review(row.track.id)}>
            {row.track.title}: {row.toReview}
          </Button>
        ))}
      </Panel>

      <Panel title="Readiness" id="ready">
        {rows.length === 0 ? <p className="text-muted-foreground">Pick a track in Me to see readiness.</p> : null}
        {rows.map((row) => (
          <Meter
            key={row.track.id}
            label={row.track.title}
            value={row.ready.readiness * 100}
            detail={row.weakest ? `Weakest: ${row.weakest}` : row.toReview ? `${row.toReview} to review today` : 'Nothing due today'}
          />
        ))}
      </Panel>

      {Object.values(DIAGRAMS).map((diagram) => (
        <Panel key={diagram.id} title="Explore" id={`diagram-${diagram.id}`}>
          <p className="font-semibold">{diagram.title}</p>
          <p className="text-muted-foreground">{diagram.blurb}</p>
          <Button asChild variant="secondary" className="mt-3 h-12 w-full">
            <a href={href({ name: 'diagram', id: diagram.id })}>Open the {diagram.title.toLowerCase()}</a>
          </Button>
        </Panel>
      ))}

      <Panel title="HeartBeat XP" id="xp">
        {settings.linkState === 'unlinked' && (
          <>
            <p className="text-muted-foreground">Not linked. Studying works the same without it.</p>
            <Button asChild variant="secondary" className="mt-2 h-12 w-full"><a href={href({ name: 'me' })}>Connect</a></Button>
          </>
        )}
        {settings.linkState === 'linked' && (
          <>
            <XpBar value={Math.min(100, (earned / XP_DAILY_CAP) * 100)} levelUpMessage="MAXED" aria-label={`${earned} of ${XP_DAILY_CAP} XP today`} />
            <p className="mt-3 text-sm">
              <span className="font-pixel text-xs">{earned}/{XP_DAILY_CAP}</span> XP today
              {(pending ?? 0) > 0 ? ` · ${pending} waiting to send` : ''}
              {earned >= XP_DAILY_CAP ? ' · maxed for today' : ''}
            </p>
          </>
        )}
        {settings.linkState === 'needs-reconnect' && (
          <>
            <p>The link was revoked. Your sessions are safe and will send once you reconnect.</p>
            <div className="mt-3 flex gap-4">
              <Button asChild className="h-12 flex-1"><a href={href({ name: 'me' })}>Reconnect</a></Button>
              <Button variant="ghost" className="h-12 flex-1" onClick={() => void flushOutbox(Date.now())}>Try again</Button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
