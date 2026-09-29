import { useCallback, useEffect, useRef, useState } from 'react';
import { CARD_BY_ID, cardsOfTrack, type Card, type TrackId } from '../../content';
import type { SessionRow } from '../../db/database';
import {
  finishSession, flushOutbox, getSettings, gradeCard, introducedOn, loadStates, startSession,
  type FlushSummary,
} from '../../db/repository';
import { todayKey } from '../../domain/day';
import { buildQueue, requeue } from '../../domain/srs/queue';
import { GRADES, type Grade } from '../../domain/srs/srs';
import { MIN_CARDS_FOR_XP } from '../../domain/xp/kinds';

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
        const [states, introduced] = await Promise.all([loadStates(), introducedOn(today)]);
        const ids = cardsOfTrack(trackId).map((card) => card.id);
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
      <section className="card" role="alert">
        <h1>Something went wrong</h1>
        <p>{fault}</p>
        <p className="quiet">Your earlier answers were saved as you went.</p>
        <button type="button" className="primary" onClick={onExit}>Back</button>
      </section>
    );
  }

  if (!queue) return <p className="quiet">Loading…</p>;

  if (done) {
    const accuracy = tally.reviewed ? Math.round((tally.correct / tally.reviewed) * 100) : 0;
    return (
      <section className="card" aria-live="polite">
        <h1>Session done</h1>
        <p className="big">{tally.reviewed} cards</p>
        <p className="quiet">
          {accuracy}% good or easy · {Math.max(1, Math.round(tally.activeMs / 60_000))} min
        </p>
        <XpLine done={done} reviewed={tally.reviewed} />
        <button type="button" className="primary" onClick={onExit}>Back to Today</button>
      </section>
    );
  }

  if (queue.length === 0) {
    return (
      <section className="card">
        <h1>Nothing to review</h1>
        <p className="quiet">You are done for today.</p>
        <button type="button" className="primary" onClick={onExit}>Back</button>
      </section>
    );
  }

  const card: Card | undefined = CARD_BY_ID.get(queue[index]);
  if (!card) {
    // A card id that left the bundle: skip it rather than stall the session.
    void grade('good');
    return <p className="quiet">Loading…</p>;
  }

  return (
    <section aria-label="Review">
      <header className="review-head">
        <button
          type="button"
          className="quiet-button"
          onClick={() => void finish(tally)}
        >
          Stop
        </button>
        <p className="quiet" aria-live="polite">{index + 1} of {queue.length}</p>
      </header>

      <article className="card flash">
        <p className="label">Question</p>
        <p className="prompt">{card.front}</p>
        {revealed ? (
          <>
            <p className="label">Answer</p>
            <p className="answer">{card.back}</p>
            <p className="why">{card.why}</p>
          </>
        ) : null}
      </article>

      {revealed ? (
        <div className="grades" role="group" aria-label="How well did you know it?">
          {GRADES.map((value, i) => (
            <button key={value} type="button" className={`grade grade-${value}`} onClick={() => void grade(value)}>
              <span>{GRADE_LABEL[value]}</span>
              <span className="key" aria-hidden="true">{i + 1}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="primary" onClick={() => setRevealed(true)}>
          Show answer
        </button>
      )}
    </section>
  );
}

function XpLine({ done, reviewed }: { done: { sent: FlushSummary | null; queued: boolean }; reviewed: number }) {
  if (!done.queued) {
    return (
      <p className="quiet">
        {reviewed < MIN_CARDS_FOR_XP
          ? `Sessions of ${MIN_CARDS_FOR_XP} cards or more earn HeartBeat XP.`
          : 'Saved.'}
      </p>
    );
  }
  if (!done.sent || done.sent.attempted === 0) {
    return <p className="quiet">Saved. It will go to HeartBeat when you are linked and online.</p>;
  }
  if (done.sent.needsReconnect) {
    return <p>Saved, but the HeartBeat link needs reconnecting in Me.</p>;
  }
  if (done.sent.sent === 0) return <p className="quiet">Saved. It will retry when you are back online.</p>;
  return done.sent.xp > 0
    ? <p>+{done.sent.xp} XP for the pet.</p>
    : <p className="quiet">Today’s study XP is maxed out. Nice.</p>;
}
