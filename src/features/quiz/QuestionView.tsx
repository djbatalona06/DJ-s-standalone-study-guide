import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { cn } from '@/lib/utils';
import { DIAGRAM_ART, diagramById, type DiagramArt, type DiagramId } from '../../content/diagrams';
import type { Answer, HotspotQuestion, MatchQuestion, McqQuestion, MultiQuestion, OrderQuestion, Question } from '../../content/types';
import { permutation } from '../../domain/quiz/shuffle';

interface Props {
  q: Question;
  /** Fixes the display order, so a reload shows the question the same way. */
  seed: string;
  answer: Answer | undefined;
  onAnswer: (a: Answer) => void;
  /** Lock the inputs and show which answers were right. Never colour alone: every mark has words. */
  reveal?: boolean;
}

/**
 * The answer an untouched question would submit. Only ordering has one: it is
 * shown pre-shuffled, and "this is already in order" is a legitimate answer.
 */
export function shownAnswer(q: Question, seed: string, answer: Answer | undefined): Answer | undefined {
  if (answer !== undefined || q.type !== 'order') return answer;
  return permutation(q.items.length, `${seed}:${q.id}`, true);
}

const row = 'flex min-h-12 items-start gap-3 border-2 border-foreground/40 px-3 py-3 has-[:checked]:bg-secondary';
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

export function QuestionView({ q, seed, answer, onAnswer, reveal = false }: Props) {
  const key = `${seed}:${q.id}`;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-4 text-xl font-semibold leading-snug">{q.prompt}</legend>
      {q.type === 'mcq' && <Mcq q={q} order={permutation(q.choices.length, key)} answer={answer} onAnswer={onAnswer} reveal={reveal} />}
      {q.type === 'multi' && <Multi q={q} order={permutation(q.choices.length, key)} answer={answer} onAnswer={onAnswer} reveal={reveal} />}
      {q.type === 'order' && <Order q={q} start={permutation(q.items.length, key, true)} answer={answer} onAnswer={onAnswer} reveal={reveal} />}
      {q.type === 'hotspot' && <Hotspot q={q} answer={answer} onAnswer={onAnswer} reveal={reveal} />}
      {q.type === 'match' && <Match q={q} order={permutation(q.pairs.length, key)} answer={answer} onAnswer={onAnswer} reveal={reveal} />}
    </fieldset>
  );
}

/** ✓/✗ with words, so feedback survives colour blindness and screen readers. */
function Mark({ ok, children }: { ok: boolean; children: string }) {
  const Icon = ok ? Check : X;
  return (
    <span className={cn('mt-1 flex items-center gap-1 text-sm font-semibold', ok ? 'text-(--color-success)' : 'text-(--color-danger)')}>
      <Icon aria-hidden="true" className="size-4" /> {children}
    </span>
  );
}

interface Common<T extends Question> {
  q: T;
  answer: Answer | undefined;
  onAnswer: (a: Answer) => void;
  reveal: boolean;
}

function Mcq({ q, order, answer, onAnswer, reveal }: Common<McqQuestion> & { order: number[] }) {
  return (
    <div className="flex flex-col gap-3">
      {order.map((i) => (
        <label key={i} className={cn(row, reveal && i === q.answer && 'border-(--color-success)')}>
          <input
            type="radio" name={q.id} className="mt-1 size-5 shrink-0 accent-(--color-accent)"
            checked={answer === i} disabled={reveal} onChange={() => onAnswer(i)}
          />
          <span className="flex-1">
            {q.choices[i]}
            {reveal && i === q.answer ? <Mark ok>Correct answer</Mark> : null}
            {reveal && answer === i && i !== q.answer ? <Mark ok={false}>Your answer</Mark> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

function Multi({ q, order, answer, onAnswer, reveal }: Common<MultiQuestion> & { order: number[] }) {
  const picked = Array.isArray(answer) ? answer : [];
  const toggle = (i: number) => onAnswer(picked.includes(i) ? picked.filter((v) => v !== i) : [...picked, i]);
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Choose {NUMBER_WORDS[q.answers.length] ?? q.answers.length}. Every right answer, and no wrong one.</p>
      <div className="flex flex-col gap-3">
        {order.map((i) => {
          const right = q.answers.includes(i);
          return (
            <label key={i} className={cn(row, reveal && right && 'border-(--color-success)')}>
              <input
                type="checkbox" className="mt-1 size-5 shrink-0 accent-(--color-accent)"
                checked={picked.includes(i)} disabled={reveal} onChange={() => toggle(i)}
              />
              <span className="flex-1">
                {q.choices[i]}
                {reveal && right ? <Mark ok>{picked.includes(i) ? 'Correct, you chose it' : 'Correct answer, you missed it'}</Mark> : null}
                {reveal && !right && picked.includes(i) ? <Mark ok={false}>Not one of the answers</Mark> : null}
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}

function Order({ q, start, answer, onAnswer, reveal }: Common<OrderQuestion> & { start: number[] }) {
  const current = Array.isArray(answer) && answer.length === q.items.length ? answer : start;
  const move = (pos: number, by: -1 | 1) => {
    const next = [...current];
    [next[pos], next[pos + by]] = [next[pos + by], next[pos]];
    onAnswer(next);
  };
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {reveal ? 'Your order, with the correct step number beside each.' : 'Use the arrow buttons to put the steps in order, first at the top.'}
      </p>
      <ol className="flex flex-col gap-3">
        {current.map((item, pos) => (
          <li key={item} className={cn(row, 'items-center')}>
            <span className="w-6 shrink-0 font-pixel text-xs">{pos + 1}</span>
            <span className="flex-1">
              {q.items[item]}
              {reveal ? <Mark ok={item === pos}>{item === pos ? 'In the right place' : `Belongs at step ${item + 1}`}</Mark> : null}
            </span>
            {reveal ? null : (
              <span className="flex gap-2">
                <Button type="button" variant="secondary" size="icon" className="size-11" disabled={pos === 0}
                  aria-label={`Move “${q.items[item]}” up`} onClick={() => move(pos, -1)}><ArrowUp aria-hidden="true" /></Button>
                <Button type="button" variant="secondary" size="icon" className="size-11" disabled={pos === current.length - 1}
                  aria-label={`Move “${q.items[item]}” down`} onClick={() => move(pos, 1)}><ArrowDown aria-hidden="true" /></Button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function Match({ q, order, answer, onAnswer, reveal }: Common<MatchQuestion> & { order: number[] }) {
  const chosen = Array.isArray(answer) && answer.length === q.pairs.length ? answer : q.pairs.map(() => -1);
  const set = (term: number, def: number) => onAnswer(chosen.map((v, i) => (i === term ? def : v)));
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">Pick the matching description for each term.</p>
      <ul className="flex flex-col gap-3">
        {q.pairs.map((pair, term) => {
          const ok = chosen[term] === term;
          const selectId = `${q.id}-m${term}`;
          return (
            <li key={pair.term} className={cn(row, 'flex-col gap-2')}>
              <label htmlFor={selectId} className="font-semibold">{pair.term}</label>
              <select
                id={selectId} value={chosen[term]} disabled={reveal}
                onChange={(e) => set(term, Number(e.target.value))}
                className="h-12 w-full border-2 border-foreground bg-background px-2 text-foreground"
              >
                <option value={-1}>Choose…</option>
                {order.map((d) => <option key={d} value={d}>{q.pairs[d].definition}</option>)}
              </select>
              {reveal ? (ok
                ? <Mark ok>Correct</Mark>
                : <Mark ok={false}>{`Should be: ${pair.definition}`}</Mark>) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Pick a part of a diagram: tap it in the picture, or choose it by name below.
 * Both routes set the same answer, so it works without sight. The picture shows
 * no names (the prompt asks by function), and its art is a lazy chunk; if it
 * cannot load, the list still works.
 */
function Hotspot({ q, answer, onAnswer, reveal }: Common<HotspotQuestion>) {
  const diagram = diagramById(q.diagramId);
  const [art, setArt] = useState<DiagramArt | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = DIAGRAM_ART[q.diagramId as DiagramId];
    if (!load) { setFailed(true); return; }
    load().then((m) => { if (live) setArt(m.default); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [q.diagramId]);

  if (!diagram) return <p role="alert">This picture is missing.</p>;
  const chosen = typeof answer === 'number' ? answer : -1;
  const selectId = `${q.id}-part`;

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {art ? 'Tap the part in the picture, or choose it by name below.' : 'Choose the part by name.'}
      </p>
      {art ? (
        <svg
          viewBox={art.viewBox} role="group" aria-label={`${diagram.title}: ${diagram.parts.length} parts`}
          className="mx-auto mb-4 block aspect-square h-auto w-full max-w-sm"
        >
          {art.decor.map((shape, i) => (
            <path key={i} d={shape.d} fill={shape.fill ? 'var(--color-surface-muted)' : 'none'} stroke="var(--color-border)" strokeWidth={0.6} aria-hidden="true" />
          ))}
          {diagram.parts.map((part, i) => {
            const r = art.shapes[part.id];
            const picked = chosen === i;
            const right = reveal && i === q.answer;
            const wrong = reveal && picked && i !== q.answer;
            return (
              <g
                key={part.id} role="button" tabIndex={reveal ? -1 : 0} aria-label={part.label} aria-pressed={picked}
                aria-disabled={reveal} className={cn('outline-none', !reveal && 'cursor-pointer')}
                onClick={() => { if (!reveal) onAnswer(i); }}
                onKeyDown={(e) => { if (!reveal && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAnswer(i); } }}
              >
                <rect
                  x={r.x} y={r.y} width={r.w} height={r.h} rx={r.round ? r.w / 2 : 0.6}
                  fill={picked || right ? 'color-mix(in srgb, var(--color-accent) 30%, var(--color-surface))' : 'var(--color-surface)'}
                  stroke={wrong ? 'var(--color-danger)' : right || picked ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                  strokeWidth={right || wrong ? 1.6 : 0.8}
                />
                {right ? <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={4} fill="var(--color-text)" aria-hidden="true">✓</text> : null}
                {wrong ? <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={4} fill="var(--color-text)" aria-hidden="true">✗</text> : null}
              </g>
            );
          })}
          <path d={art.detail.join(' ')} fill="none" stroke="var(--color-text-muted)" strokeWidth={0.35} pointerEvents="none" aria-hidden="true" />
        </svg>
      ) : failed ? <p role="alert" className="mb-3 text-(--color-danger)">The picture could not load.</p> : null}

      <label htmlFor={selectId} className="mb-2 block font-semibold">{art ? 'Or choose by name' : 'Part'}</label>
      <select
        id={selectId} value={chosen} disabled={reveal} onChange={(e) => onAnswer(Number(e.target.value))}
        className="h-12 w-full border-2 border-foreground bg-background px-2 text-foreground"
      >
        <option value={-1}>Choose…</option>
        {diagram.parts.map((part, i) => <option key={part.id} value={i}>{part.label}</option>)}
      </select>
      {reveal ? (
        chosen === q.answer
          ? <Mark ok>{`Correct: ${diagram.parts[q.answer].label}`}</Mark>
          : <Mark ok={false}>{`It is the ${diagram.parts[q.answer].label}`}</Mark>
      ) : null}
    </>
  );
}
