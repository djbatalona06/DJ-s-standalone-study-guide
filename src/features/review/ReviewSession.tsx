import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Kbd } from '@/components/ui/8bit/kbd';
import { Progress } from '@/components/ui/8bit/progress';
import { Panel } from '@/components/Panel';
import { intervalLabel, previewIntervals } from '@/domain/srs/preview';
import { useSettings, useStates } from '../useApp';
import { useLibrary } from '../useLibrary';
import { loadLibrary, type Card, type TrackId } from '../../content';
import type { SessionRow } from '../../db/database';
import {
  finishSession, flushOutbox, getSettings, gradeCard, introducedOn, loadStates, startSession,
  type FlushSummary,
} from '../../db/repository';
import { todayKey } from '../../domain/day';
import { buildQueue, requeue } from '../../domain/srs/queue';
import { GRADES, type Grade } from '../../domain/srs/srs';
import { Character } from '../Character';
import { XpLine } from '../XpLine';

interface Props {
  trackId: TrackId;
  onExit: () => void;
}

interface Tally {
  reviewed: number;
  correct: number;
  activeMs: number;
}

const GRADE_LABEL: Record<Grade, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };
/** A card left open for an hour is not an hour of study. */
const MAX_CARD_MS = 60_000;

export function ReviewSession({ trackId, onExit }: Props) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Tally>({ reviewed: 0, correct: 0, activeMs: 0 });
  const [done, setDone] = useState<{ sent: FlushSummary | null; queued: boolean } | null>(null);
  const [fault, setFault] = useState<string | null>(null);

  const states = useStates();
  const library = useLibrary();
  const { characterName } = useSettings();
  const session = useRef<SessionRow | null>(null);
  const day = useRef('');
  const shownAt = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const settings = await getSettings();
        const today = todayKey(settings.timeZone);
        const [states, introduced, lib] = await Promise.all([loadStates(), introducedOn(today), loadLibrary()]);
        const ids = lib.cardsOfTrack(trackId).map((card) => card.id);
        const built = buildQueue(ids, states, today, {
          newPerDay: settings.newPerDay,
          introducedToday: introduced,
        });
        if (!live) return;
        day.current = today;
        session.current = await startSession('review', trackId, today, Date.now());
        shownAt.current = Date.now();
        setQueue(built);
      } catch (error) {
        if (live) setFault(error instanceof Error ? error.message : 'Could not start the session.');
      }
    })();
    return () => { live = false; };
  }, [trackId]);

  const finish = useCallback(async (finalTally: Tally) => {
    const current = session.current;
    if (!current) return;
    try {
      const { queued } = await finishSession(current.id, finalTally, Date.now());
      const sent = queued ? await flushOutbox(Date.now()) : null;
      setDone({ sent, queued });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save the session.');
    }
  }, []);

  const grade = useCallback(async (value: Grade) => {
    if (!queue || busy.current || !session.current) return;
    const id = queue[index];
    busy.current = true;
    try {
      const at = Date.now();
      await gradeCard(id, value, session.current.id, day.current, at);
      const next: Tally = {
        reviewed: tally.reviewed + 1,
        correct: tally.correct + (value === 'good' || value === 'easy' ? 1 : 0),
        activeMs: tally.activeMs + Math.min(MAX_CARD_MS, at - shownAt.current),
      };
      setTally(next);

      // A card graded "again" goes to the back, so it comes round again today.
      const nextQueue = value === 'again' ? requeue(queue, index) : queue;
      const nextIndex = value === 'again' ? index : index + 1;
      setQueue(nextQueue);
      setIndex(nextIndex);
      setRevealed(false);
      shownAt.current = Date.now();
      if (nextIndex >= nextQueue.length) await finish(next);
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save that answer.');
    } finally {
      busy.current = false;
    }
  }, [queue, index, tally, finish]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!queue || done || fault) return;
      if (!revealed) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      const picked = GRADES[Number(event.key) - 1];
      if (picked) void grade(picked);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queue, revealed, done, fault, grade]);

  if (fault) {
    return (
      <Panel title="Something went wrong">
        <div role="alert">
          <p>{fault}</p>
          <p className="text-muted-foreground">Your earlier answers were saved as you went.</p>
        </div>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
      </Panel>
    );
  }

  if (!queue || !library) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  if (done) {
    const accuracy = tally.reviewed ? Math.round((tally.correct / tally.reviewed) * 100) : 0;
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-6 text-center">
        <Character size={112} label={`${characterName || 'Your character'}, typing on a laptop`} />
        <h1 className="font-pixel text-sm leading-relaxed">Session done</h1>
        <Panel className="w-full text-left">
          <p className="font-pixel text-2xl">{tally.reviewed} cards</p>
          <p className="text-muted-foreground">
            {accuracy}% good or easy · {Math.max(1, Math.round(tally.activeMs / 60_000))} min
          </p>
          <XpLine done={done} reviewed={tally.reviewed} />
          <Button className="mt-3 h-12 w-full" onClick={onExit}>Back to Today</Button>
        </Panel>
      </section>
    );
  }

  if (queue.length === 0) {
    return (
      <Panel title="Nothing to review">
        <p className="text-muted-foreground">You are done for today.</p>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
      </Panel>
    );
  }

  const card: Card | undefined = library.CARD_BY_ID.get(queue[index]);
  if (!card) {
    // A card id that left the bundle: skip it rather than stall the session.
    void grade('good');
    return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;
  }

  const preview = previewIntervals(states?.get(card.id), card.id, day.current, Date.now());

  return (
    <section aria-label="Review" className="flex min-h-[calc(100dvh-80px)] flex-col">
      <h1 className="sr-only">Review</h1>
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Stop and save" onClick={() => void finish(tally)}>
          <X aria-hidden="true" />
        </Button>
        <Progress
          variant="retro"
          className="h-3 flex-1"
          value={Math.round((index / queue.length) * 100)}
          aria-label={`Card ${index + 1} of ${queue.length}`}
        />
        <p className="font-pixel text-xs" aria-live="polite">{index + 1}/{queue.length}</p>
      </header>

      <Panel className="min-h-64">
        <p className="font-pixel text-[0.625rem] uppercase text-muted-foreground">Question</p>
        <p className="text-xl font-semibold leading-snug">{card.front}</p>
        {revealed ? (
          <>
            <p className="mt-4 font-pixel text-[0.625rem] uppercase text-(--color-accent)">Answer</p>
            <p className="text-lg">{card.back}</p>
            <p className="mt-3 border-t-2 border-dashed border-border pt-3 text-muted-foreground">{card.why}</p>
          </>
        ) : null}
      </Panel>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+16px)] mt-auto">
        {revealed ? (
          <div className="grid grid-cols-4 gap-3" role="group" aria-label="How well did you know it?">
            {GRADES.map((value, i) => (
              <Button
                key={value}
                variant={value === 'good' ? 'default' : 'secondary'}
                className="flex h-16 flex-col gap-1 px-1"
                onClick={() => void grade(value)}
                aria-label={`${GRADE_LABEL[value]}, next in ${intervalLabel(preview[value])}`}
              >
                <span className="font-pixel text-[0.625rem]">{GRADE_LABEL[value]}</span>
                <span className="text-xs font-normal">{intervalLabel(preview[value])}</span>
                <Kbd className="hidden min-[900px]:inline-flex" aria-hidden="true">{i + 1}</Kbd>
              </Button>
            ))}
          </div>
        ) : (
          <Button className="h-14 w-full" onClick={() => setRevealed(true)}>
            Show answer <Kbd className="ml-2 hidden min-[900px]:inline-flex" aria-hidden="true">Space</Kbd>
          </Button>
        )}
      </div>
    </section>
  );
}
