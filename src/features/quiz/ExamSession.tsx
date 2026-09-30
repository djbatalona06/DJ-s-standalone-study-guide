import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flag, List, X } from 'lucide-react';
import { Sprite } from '@/art/Sprite';
import { STAGE_FRAMES } from '@/art/sprites';
import { Button } from '@/components/ui/8bit/button';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { cn } from '@/lib/utils';
import { DOMAINS, TRACKS, domainsOf, type TrackId } from '../../content';
import { loadBank } from '../../content/questions';
import type { Answer, Question } from '../../content/types';
import type { ExamRow } from '../../db/database';
import {
  discardExam, finishExam, flushOutbox, getActiveExam, getExam, getSettings, loadQuizHistory, recentExamScores,
  saveExam, startExam, type FlushSummary,
} from '../../db/repository';
import { todayKey } from '../../domain/day';
import { BOOK_AT } from '../../domain/mastery/booking';
import { buildExam, examMinutes } from '../../domain/quiz/pick';
import * as clock from '../../domain/quiz/clock';
import { isAnswered, isCorrect, scoreExam } from '../../domain/quiz/score';
import { useSettings } from '../useApp';
import { XpLine } from '../XpLine';
import { QuestionView } from './QuestionView';

/** An exam needs enough questions to mean something. Below this, quizzes are the better tool. */
const MIN_EXAM_QUESTIONS = 20;
const SAVE_EVERY_MS = 15_000;

const Loading = () => <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

type Stage =
  | { name: 'loading' }
  | { name: 'intro'; active?: ExamRow; recent: number[] }
  | { name: 'running'; exam: ExamRow }
  | { name: 'results'; exam: ExamRow; sent: FlushSummary | null; queued: boolean };

/** Intro, resume, the exam itself, then the results. */
export function ExamPage({ trackId, onExit }: { trackId: TrackId; onExit: () => void }) {
  const track = TRACKS.find((t) => t.id === trackId);
  const [bank, setBank] = useState<Question[] | null>(null);
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [fault, setFault] = useState<string | null>(null);

  const toIntro = useCallback(async () => {
    const [active, recent] = await Promise.all([getActiveExam(trackId), recentExamScores(trackId, 2)]);
    setStage({ name: 'intro', active, recent });
  }, [trackId]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const loaded = await loadBank(trackId);
        if (!live) return;
        setBank(loaded);
        await toIntro();
      } catch (error) {
        if (live) setFault(error instanceof Error ? error.message : 'Could not load the exam.');
      }
    })();
    return () => { live = false; };
  }, [trackId, toIntro]);

  if (!track?.exam) return <Panel title="No exam"><Button className="h-12 w-full" onClick={onExit}>Back</Button></Panel>;
  if (fault) {
    return (
      <Panel title="Something went wrong">
        <p role="alert">{fault}</p>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
      </Panel>
    );
  }
  if (!bank || stage.name === 'loading') return <Loading />;

  const size = Math.min(track.exam.questions, bank.length);
  const minutes = examMinutes(size, track.exam);
  const byId = new Map(bank.map((q) => [q.id, q]));
  const questionsOf = (exam: ExamRow) => exam.questionIds.map((id) => byId.get(id)).filter((q): q is Question => q !== undefined);

  async function begin() {
    try {
      const settings = await getSettings();
      const day = todayKey(settings.timeZone);
      const picked = buildExam(
        bank!, domainsOf(trackId).map((d) => ({ id: d.id, weight: d.weight })), size, await loadQuizHistory(), String(Date.now()),
      );
      setStage({ name: 'running', exam: await startExam(trackId, picked.map((q) => q.id), minutes * 60_000, day, Date.now()) });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not start the exam.');
    }
  }

  if (stage.name === 'intro') {
    const { active, recent } = stage;
    const left = active ? Math.ceil(active.remainingMs / 60_000) : 0;
    return (
      <section aria-label="Practice exam">
        <h1 className="sr-only">Practice exam: {track.title}</h1>
        <Panel title={`Practice exam · ${track.title}`}>
          {bank.length < MIN_EXAM_QUESTIONS ? (
            <p className="text-muted-foreground">
              This track has {bank.length} questions so far, and an exam needs at least {MIN_EXAM_QUESTIONS}. Try a quiz from Learn.
            </p>
          ) : (
            <>
              <p className="font-pixel text-lg leading-snug">{size} questions · {minutes} min</p>
              <p className="text-muted-foreground">
                Questions follow the exam’s domain weights and favour ones you have not seen. Answers stay hidden until you submit.
                The clock stops while this tab is hidden, and your place is saved if you close it. The real exam does neither, so
                treat this as a check on knowledge, not on stamina.
                {size < track.exam.questions ? ` The bank has ${bank.length} questions, so this is a shorter exam than the real ${track.exam.questions}.` : ''}
              </p>
              <p className="text-sm">
                {recent.length ? `Latest results: ${recent.map((r) => `${Math.round(r * 100)}%`).join(', ')}.` : 'No exams taken yet.'}
              </p>
              {active ? (
                <>
                  <Button className="mt-2 h-12 w-full" onClick={() => setStage({ name: 'running', exam: active })}>
                    Resume exam ({Object.keys(active.answers).length}/{active.total} answered, {left} min left)
                  </Button>
                  <Button variant="secondary" className="mt-3 h-12 w-full" onClick={() => void discardExam(active.id).then(toIntro)}>
                    Throw it away and start over
                  </Button>
                </>
              ) : (
                <Button className="mt-2 h-12 w-full" onClick={() => void begin()}>Start exam</Button>
              )}
            </>
          )}
          <Button variant="ghost" className="mt-3 h-12 w-full" onClick={onExit}>Back to Learn</Button>
        </Panel>
      </section>
    );
  }

  if (stage.name === 'running') {
    return (
      <ExamRunner
        key={stage.exam.id}
        exam={stage.exam}
        questions={questionsOf(stage.exam)}
        onExit={onExit}
        onDone={async (sent, queued) => {
          const done = await getExam(stage.exam.id);
          if (done) setStage({ name: 'results', exam: done, sent, queued });
        }}
      />
    );
  }

  return (
    <ExamResults
      exam={stage.exam} questions={questionsOf(stage.exam)} sent={stage.sent} queued={stage.queued}
      onExit={onExit} onAgain={() => void toIntro()}
    />
  );
}

function ExamRunner({ exam, questions, onExit, onDone }: {
  exam: ExamRow;
  questions: Question[];
  onExit: () => void;
  onDone: (sent: FlushSummary | null, queued: boolean) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(exam.answers);
  const [flagged, setFlagged] = useState<string[]>(exam.flagged);
  const [index, setIndex] = useState(Math.min(exam.index, Math.max(0, questions.length - 1)));
  const [panel, setPanel] = useState<'none' | 'list' | 'submit'>('none');
  const [left, setLeft] = useState(exam.remainingMs);
  const [fault, setFault] = useState<string | null>(null);

  const clockRef = useRef<clock.Clock>(
    document.hidden ? clock.pausedClock(exam.remainingMs) : clock.startClock(exam.remainingMs, Date.now()),
  );
  const latest = useRef({ answers, flagged, index });
  latest.current = { answers, flagged, index };
  const finishing = useRef(false);
  // The timer effect must not restart when the parent re-renders, or it would pause the clock.
  const submitRef = useRef<() => Promise<void>>(async () => undefined);

  const save = useCallback(
    (patch: Partial<Pick<ExamRow, 'answers' | 'flagged' | 'index'>> = {}) =>
      saveExam(exam.id, { ...latest.current, ...patch, remainingMs: clock.remaining(clockRef.current, Date.now()) }),
    [exam.id],
  );

  const submit = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const now = Date.now();
      const remainingMs = clock.remaining(clockRef.current, now);
      clockRef.current = clock.pause(clockRef.current, now);
      await saveExam(exam.id, { ...latest.current, remainingMs });
      const settings = await getSettings();
      const { queued } = await finishExam(exam.id, questions, remainingMs, todayKey(settings.timeZone), now);
      const sent = queued ? await flushOutbox(Date.now()) : null;
      await onDone(sent, queued);
    } catch (error) {
      finishing.current = false;
      setFault(error instanceof Error ? error.message : 'Could not submit the exam.');
    }
  }, [exam.id, questions, onDone]);
  submitRef.current = submit;

  // The clock: tick, stop when the tab is hidden, and submit when time is up.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const r = clock.remaining(clockRef.current, Date.now());
      setLeft(r);
      if (r === 0) void submitRef.current();
    }, 500);
    const saver = window.setInterval(() => void save(), SAVE_EVERY_MS);
    const away = () => {
      clockRef.current = clock.pause(clockRef.current, Date.now());
      void save();
    };
    const back = () => { clockRef.current = clock.resume(clockRef.current, Date.now()); };
    const onVisibility = () => (document.hidden ? away() : back());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', away);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(saver);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', away);
      away();
    };
  }, [save]);

  if (questions.length === 0) {
    return <Panel title="This exam has no questions left"><Button className="h-12 w-full" onClick={onExit}>Back</Button></Panel>;
  }
  const q = questions[index];
  const isFlagged = flagged.includes(q.id);
  const unanswered = questions.filter((x) => !isAnswered(x, answers[x.id])).length;

  function answer(a: Answer) {
    const next = { ...answers, [q.id]: a };
    setAnswers(next);
    void save({ answers: next });
  }
  const go = (i: number) => {
    const to = Math.max(0, Math.min(questions.length - 1, i));
    setIndex(to);
    setPanel('none');
    void save({ index: to });
  };
  const toggleFlag = () => {
    const next = isFlagged ? flagged.filter((id) => id !== q.id) : [...flagged, q.id];
    setFlagged(next);
    void save({ flagged: next });
  };

  const spoken = left <= 60_000 ? 'One minute left' : left <= 300_000 ? 'Five minutes left' : left <= 600_000 ? 'Ten minutes left' : '';

  return (
    <section aria-label="Practice exam" className="flex min-h-[calc(100dvh-80px)] flex-col">
      <h1 className="sr-only">Practice exam</h1>
      <p className="sr-only" role="status" aria-live="polite">{spoken}</p>
      <header className="mb-4 flex items-center justify-between gap-3">
        <p className="font-pixel text-xs" aria-live="off">Question {index + 1} of {questions.length}</p>
        <p role="timer" className={cn('font-pixel text-sm', left <= 300_000 && 'text-(--color-danger)')}>
          <span className="sr-only">Time left: </span>{clock.format(left)}
        </p>
      </header>

      {fault ? <p role="alert" className="mb-3 text-(--color-danger)">{fault}</p> : null}

      {panel === 'list' ? (
        <Panel title="Questions">
          <ul className="grid grid-cols-5 gap-3 sm:grid-cols-8" aria-label="Jump to a question">
            {questions.map((x, i) => {
              const state = `${isAnswered(x, answers[x.id]) ? 'answered' : 'blank'}${flagged.includes(x.id) ? ', flagged' : ''}`;
              return (
                <li key={x.id}>
                  <Button
                    variant={isAnswered(x, answers[x.id]) ? 'default' : 'secondary'}
                    className="h-11 w-full px-0 font-pixel text-[0.625rem]"
                    aria-label={`Question ${i + 1}, ${state}`} aria-current={i === index ? 'step' : undefined}
                    onClick={() => go(i)}
                  >
                    {i + 1}{flagged.includes(x.id) ? '⚑' : ''}
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">Filled buttons are answered. ⚑ marks a flag.</p>
          <Button className="h-12 w-full" onClick={() => setPanel('submit')}>Review and submit</Button>
          <Button variant="ghost" className="h-12 w-full" onClick={() => setPanel('none')}>Back to the question</Button>
        </Panel>
      ) : panel === 'submit' ? (
        <Panel title="Submit the exam?">
          <p>{unanswered === 0 ? 'Every question has an answer.' : `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered and will count as wrong.`}</p>
          {flagged.length ? <p>{flagged.length} flagged for review.</p> : null}
          <Button className="h-12 w-full" onClick={() => void submit()}>Submit exam</Button>
          <Button variant="secondary" className="h-12 w-full" onClick={() => setPanel('list')}>Keep going</Button>
        </Panel>
      ) : (
        <Panel>
          <QuestionView q={q} seed={exam.id} answer={answers[q.id]} onAnswer={answer} />
          <Button variant="secondary" className="mt-2 h-12" aria-pressed={isFlagged} onClick={toggleFlag}>
            <Flag aria-hidden="true" className="mr-2 size-4" /> {isFlagged ? 'Flagged for review' : 'Flag for review'}
          </Button>
        </Panel>
      )}

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+16px)] mt-auto grid grid-cols-[1fr_auto_1fr] gap-3">
        <Button variant="secondary" className="h-14" disabled={index === 0 || panel !== 'none'} onClick={() => go(index - 1)}>Previous</Button>
        <Button variant="ghost" size="icon" className="size-14" aria-label="Question list" onClick={() => setPanel(panel === 'list' ? 'none' : 'list')}>
          <List aria-hidden="true" />
        </Button>
        {index + 1 >= questions.length
          ? <Button className="h-14" disabled={panel !== 'none'} onClick={() => setPanel('submit')}>Review</Button>
          : <Button className="h-14" disabled={panel !== 'none'} onClick={() => go(index + 1)}>Next</Button>}
      </div>
    </section>
  );
}

function ExamResults({ exam, questions, sent, queued, onExit, onAgain }: {
  exam: ExamRow; questions: Question[]; sent: FlushSummary | null; queued: boolean; onExit: () => void; onAgain: () => void;
}) {
  const { characterName } = useSettings();
  const score = scoreExam(questions, exam.answers);
  const pct = Math.round(score.fraction * 100);
  const misses = questions.filter((q) => !isCorrect(q, exam.answers[q.id]));
  const nameOf = (id: string) => DOMAINS.find((d) => d.id === id)?.title ?? id;
  const bar = Math.round(BOOK_AT * 100);

  return (
    <section aria-live="polite" className="flex flex-col items-center gap-6">
      <Sprite frames={STAGE_FRAMES.Foundations ?? []} size={112} label={`${characterName || 'Your character'}, typing on a laptop`} />
      <h1 className="font-pixel text-sm leading-relaxed">Exam done</h1>
      <Panel className="w-full">
        <p className="font-pixel text-2xl">{pct}%</p>
        <p className="text-muted-foreground">
          {score.correct} of {score.total} right · {score.answered} answered.{' '}
          {pct >= bar ? `That clears your ${bar}% booking bar.` : `Your booking bar is ${bar}%.`}
        </p>
        <XpLine done={{ sent, queued }} reviewed={score.answered} />
      </Panel>

      <Panel title="By domain" className="w-full">
        {[...score.byDomain].map(([id, r]) => (
          <Meter key={id} label={nameOf(id)} value={(r.correct / r.total) * 100} detail={`${r.correct} of ${r.total}`} />
        ))}
      </Panel>

      <Panel title={`Review your ${misses.length} miss${misses.length === 1 ? '' : 'es'}`} className="w-full">
        {misses.length === 0 ? <p className="flex items-center gap-2"><Check aria-hidden="true" className="size-5" /> No misses. Nice.</p> : null}
        {misses.map((q) => (
          <details key={q.id} className="border-2 border-foreground/40 px-3 py-3">
            <summary className="cursor-pointer text-lg font-semibold">
              <X aria-hidden="true" className="mr-2 inline size-4 text-(--color-danger)" />{q.prompt}
            </summary>
            <div className="mt-3">
              <QuestionView q={q} seed={exam.id} answer={exam.answers[q.id]} onAnswer={() => undefined} reveal />
              <p className="mt-3 border-t-2 border-dashed border-border pt-3 text-muted-foreground">{q.explanation}</p>
            </div>
          </details>
        ))}
        <p className="text-sm text-muted-foreground">Cards linked to these questions come back in Review today.</p>
      </Panel>

      <div className="grid w-full gap-3 sm:grid-cols-2">
        <Button className="h-12" onClick={onExit}>Back to Learn</Button>
        <Button variant="secondary" className="h-12" onClick={onAgain}>Another exam</Button>
      </div>
    </section>
  );
}
