import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Progress } from '@/components/ui/8bit/progress';
import { Panel } from '@/components/Panel';
import { loadBank } from '../../content/questions';
import type { Answer, Question } from '../../content/types';
import type { SessionRow } from '../../db/database';
import {
  finishSession, flushOutbox, getSettings, loadQuizHistory, recordAnswer, startSession, type FlushSummary,
} from '../../db/repository';
import { todayKey } from '../../domain/day';
import { pickQuiz } from '../../domain/quiz/pick';
import { isAnswered } from '../../domain/quiz/score';
import { useSettings } from '../useApp';
import { Character } from '../Character';
import { XpLine } from '../XpLine';
import { QuestionView, shownAnswer } from './QuestionView';
import { resolveScope } from './scope';

const QUIZ_LENGTH = 10;
/** A question left open for ten minutes is not ten minutes of study. */
const MAX_QUESTION_MS = 120_000;

interface Tally { answered: number; correct: number; activeMs: number }

/** Owns "another quiz": a new key remounts the session, which builds a fresh pick. */
export function QuizPage({ scope, onExit }: { scope: string; onExit: () => void }) {
  const [round, setRound] = useState(0);
  return <QuizSession key={round} scope={scope} onExit={onExit} onAgain={() => setRound((r) => r + 1)} />;
}

function QuizSession({ scope, onExit, onAgain }: { scope: string; onExit: () => void; onAgain: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | undefined>(undefined);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [tally, setTally] = useState<Tally>({ answered: 0, correct: 0, activeMs: 0 });
  const [done, setDone] = useState<{ sent: FlushSummary | null; queued: boolean } | null>(null);
  const [fault, setFault] = useState<string | null>(null);

  const { characterName } = useSettings();
  const session = useRef<SessionRow | null>(null);
  const day = useRef('');
  const shownAt = useRef(0);
  const busy = useRef(false);
  const resolved = useMemo(() => resolveScope(scope), [scope]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!resolved) throw new Error('That quiz does not exist.');
        const settings = await getSettings();
        const today = todayKey(settings.timeZone);
        const [bank, history] = await Promise.all([loadBank(resolved.trackId), loadQuizHistory()]);
        const pool = bank.filter((q) => resolved.domainIds.includes(q.domainId));
        const started = await startSession('quiz', resolved.trackId, today, Date.now());
        if (!live) return;
        day.current = today;
        session.current = started;
        shownAt.current = Date.now();
        setQuestions(pickQuiz(pool, history, QUIZ_LENGTH, started.id));
      } catch (error) {
        if (live) setFault(error instanceof Error ? error.message : 'Could not start the quiz.');
      }
    })();
    return () => { live = false; };
  }, [resolved]);

  const finish = useCallback(async (finalTally: Tally) => {
    const current = session.current;
    if (!current) return;
    try {
      const { queued } = await finishSession(
        current.id,
        { reviewed: finalTally.answered, correct: finalTally.correct, activeMs: finalTally.activeMs },
        Date.now(),
      );
      setDone({ sent: queued ? await flushOutbox(Date.now()) : null, queued });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save the quiz.');
    }
  }, []);

  const check = useCallback(async () => {
    if (!questions || busy.current || !session.current) return;
    const q = questions[index];
    const given = shownAnswer(q, session.current.id, answer);
    if (given === undefined || (!isAnswered(q, given) && q.type !== 'order')) return;
    busy.current = true;
    try {
      const at = Date.now();
      const correct = await recordAnswer(session.current.id, q, given, day.current, at);
      setAnswer(given);
      setVerdict(correct);
      setTally((t) => ({
        answered: t.answered + 1,
        correct: t.correct + (correct ? 1 : 0),
        activeMs: t.activeMs + Math.min(MAX_QUESTION_MS, at - shownAt.current),
      }));
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save that answer.');
    } finally {
      busy.current = false;
    }
  }, [questions, index, answer]);

  const next = useCallback(async () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      await finish(tally);
      return;
    }
    setIndex(index + 1);
    setAnswer(undefined);
    setVerdict(null);
    shownAt.current = Date.now();
  }, [questions, index, tally, finish]);

  if (fault) {
    return (
      <Panel title="Something went wrong">
        <div role="alert">
          <p>{fault}</p>
          <p className="text-muted-foreground">Answers you already checked were saved.</p>
        </div>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
      </Panel>
    );
  }
  if (!questions) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  if (questions.length === 0) {
    return (
      <Panel title="No questions yet">
        <p className="text-muted-foreground">There are no questions for {resolved?.title ?? 'this'} yet. Flashcards and Review still work.</p>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back to Learn</Button>
      </Panel>
    );
  }

  if (done) {
    const pct = tally.answered ? Math.round((tally.correct / tally.answered) * 100) : 0;
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-6 text-center">
        <Character size={112} label={`${characterName || 'Your character'}, typing on a laptop`} />
        <h1 className="font-pixel text-sm leading-relaxed">Quiz done</h1>
        <Panel className="w-full text-left">
          <p className="font-pixel text-2xl">{tally.correct}/{tally.answered} right</p>
          <p className="text-muted-foreground">{pct}% · {Math.max(1, Math.round(tally.activeMs / 60_000))} min. Misses will come back in Review.</p>
          <XpLine done={done} reviewed={tally.answered} />
          <Button className="mt-3 h-12 w-full" onClick={onExit}>Back to Learn</Button>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onAgain}>Another quiz</Button>
        </Panel>
      </section>
    );
  }

  const q = questions[index];
  const ready = isAnswered(q, answer) || q.type === 'order';
  return (
    <section aria-label="Quiz" className="flex min-h-[calc(100dvh-80px)] flex-col">
      <h1 className="sr-only">Quiz: {resolved?.title}</h1>
      <header className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Stop and save" onClick={() => void finish(tally)}>
          <X aria-hidden="true" />
        </Button>
        <Progress variant="retro" className="h-3 flex-1" value={Math.round((index / questions.length) * 100)} aria-label={`Question ${index + 1} of ${questions.length}`} />
        <p className="font-pixel text-xs" aria-live="polite">{index + 1}/{questions.length}</p>
      </header>

      <Panel>
        <QuestionView q={q} seed={session.current?.id ?? ''} answer={answer} onAnswer={setAnswer} reveal={verdict !== null} />
        {verdict !== null ? (
          <div role="status" className="mt-2 border-t-2 border-dashed border-border pt-3">
            <p className={verdict ? 'flex items-center gap-2 font-semibold text-(--color-success)' : 'flex items-center gap-2 font-semibold text-(--color-danger)'}>
              {verdict ? <Check aria-hidden="true" className="size-5" /> : <X aria-hidden="true" className="size-5" />}
              {verdict ? 'Correct' : 'Not quite'}
            </p>
            <p className="mt-2 text-muted-foreground">{q.explanation}</p>
          </div>
        ) : null}
      </Panel>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+16px)] mt-auto">
        {verdict === null
          ? <Button className="h-14 w-full" disabled={!ready} onClick={() => void check()}>Check answer</Button>
          : <Button className="h-14 w-full" onClick={() => void next()}>{index + 1 >= questions.length ? 'Finish' : 'Next question'}</Button>}
      </div>
    </section>
  );
}
