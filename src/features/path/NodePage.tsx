import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { PageHead } from '@/components/Shell';
import { href } from '@/app/route';
import { TRACKS } from '@/content';
import { PATHWAY } from '@/content/pathway';
import { TRACKS_WITH_QUESTIONS } from '@/content/questions';
import { setMark } from '@/db/repository';
import { bookingAdvice } from '@/domain/mastery/booking';
import { statuses, type Mark, type PathNode } from '@/domain/pathway/pathway';
import { usePathMarks } from '../usePath';
import { useReadiness } from '../useReadiness';
import { StatusBadge, TYPE_LABEL, TypeIcon } from './parts';

const byId = new Map(PATHWAY.map((node) => [node.id, node]));
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const signed = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}${Math.abs(n)}%`;

export function NodePage({ id }: { id: string }) {
  const marks = usePathMarks();
  const node = byId.get(id);
  if (!node) {
    return <Panel title="No such step"><a className="text-(--color-accent) underline" href={href({ name: 'path' })}>Back to the path</a></Panel>;
  }
  if (!marks) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  const status = statuses(PATHWAY, marks);
  const state = status.get(node.id) ?? 'locked';
  const needs = node.requires.map((r) => byId.get(r)).filter((n): n is PathNode => n !== undefined);
  const unlocks = PATHWAY.filter((n) => n.requires.includes(node.id));
  const act = (mark: Mark | null) => void setMark(node.id, mark, Date.now());

  return (
    <>
      <PageHead title={node.title} sub={`${TYPE_LABEL[node.type]} · ${node.stage} · about ${node.hours} hours`} />

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <TypeIcon type={node.type} className="text-muted-foreground" />
          <StatusBadge status={state} />
        </div>
        <p>{node.summary}</p>
        <div className="flex flex-wrap gap-3">
          {state === 'available' ? <Button className="h-12" onClick={() => act('started')}>Start</Button> : null}
          {state !== 'done' ? (
            <Button variant={state === 'in-progress' ? 'default' : 'secondary'} className="h-12" onClick={() => act('done')}>
              {state === 'locked' ? 'Mark done anyway' : 'Mark done'}
            </Button>
          ) : null}
          {state === 'in-progress' ? <Button variant="secondary" className="h-12" onClick={() => act(null)}>Stop</Button> : null}
          {state === 'done' ? <Button variant="secondary" className="h-12" onClick={() => act(null)}>Reopen</Button> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          The app records what you tell it. Marking a step done can open the ones after it.
        </p>
      </Panel>

      {needs.length ? (
        <Panel title="Needs first" id="needs">
          <ul className="divide-y-2 divide-dashed divide-border">
            {needs.map((n) => (
              <li key={n.id}>
                <a href={href({ name: 'node', id: n.id })} className="flex min-h-12 items-center justify-between gap-3 py-3 text-(--color-accent) underline-offset-4 hover:underline">
                  <span>{n.title}</span>
                  <StatusBadge status={status.get(n.id) ?? 'locked'} />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {node.trackId ? <StudyPanel node={node} /> : null}

      {node.pay ? <PayPanel pay={node.pay} title={node.title} /> : null}

      {unlocks.length ? (
        <Panel title="Opens up" id="unlocks">
          <ul className="divide-y-2 divide-dashed divide-border">
            {unlocks.map((n) => (
              <li key={n.id}>
                <a href={href({ name: 'node', id: n.id })} className="flex min-h-12 items-center py-3 text-(--color-accent) underline-offset-4 hover:underline">{n.title}</a>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <a href={href({ name: 'path' })} className="mb-8 inline-flex min-h-12 items-center text-(--color-accent) underline-offset-4 hover:underline">Back to the path</a>
    </>
  );
}

/** The study links for a node that a track prepares for, and the booking rule for a cert. */
function StudyPanel({ node }: { node: PathNode }) {
  const track = TRACKS.find((t) => t.id === node.trackId);
  const progress = useReadiness(node.trackId!);
  if (!track) return null;
  const advice = progress && track.exam ? bookingAdvice(progress.readiness, progress.exams) : undefined;

  return (
    <>
      <Panel title="Study this" id="study">
        {progress ? <Meter label="Readiness" value={progress.readiness * 100} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="h-12"><a href={href({ name: 'review', track: track.id })}>Review cards</a></Button>
          <Button asChild variant="secondary" className="h-12"><a href={href({ name: 'learn' })}>{track.title} in Learn</a></Button>
          {TRACKS_WITH_QUESTIONS.includes(track.id) ? <Button asChild variant="secondary" className="h-12"><a href={href({ name: 'quiz', scope: track.id })}>Quick quiz</a></Button> : null}
          {track.exam && TRACKS_WITH_QUESTIONS.includes(track.id) ? <Button asChild variant="secondary" className="h-12"><a href={href({ name: 'exam', track: track.id })}>Practice exam</a></Button> : null}
        </div>
        {advice ? <p className="text-sm">{advice.message}</p> : null}
      </Panel>

      {node.officialUrl ? (
        <Panel title={advice?.ready ? 'Book the exam' : 'Official page'} id="book">
          <p className="text-muted-foreground">
            {advice?.ready
              ? 'You meet your own bar. Booking happens on the certifier’s site: this app only links to it, and never sells or schedules anything.'
              : 'The certifier’s own page for this exam. Confirm the current exam version and objectives there before you study or book.'}
          </p>
          <Button asChild variant={advice?.ready ? 'default' : 'secondary'} className="h-12">
            <a href={node.officialUrl} target="_blank" rel="noopener noreferrer">
              {advice?.ready ? 'Go to the booking page' : 'Open the official page'} <ExternalLink aria-hidden="true" className="ml-2 size-4" />
            </a>
          </Button>
        </Panel>
      ) : null}
    </>
  );
}

/** Pay is shown only with its source and date, and only for the occupation the source covers. */
function PayPanel({ pay, title }: { pay: NonNullable<PathNode['pay']>; title: string }) {
  return (
    <Panel title="What the data says" id="pay">
      <p className="font-pixel text-lg leading-snug">{USD.format(pay.median)} <span className="font-sans text-sm text-muted-foreground">median a year, {pay.dataYear}</span></p>
      {pay.outlook ? (
        <p>
          Projected change in employment, {pay.outlook.years}: <strong>{signed(pay.outlook.percent)}</strong>.
          {pay.openingsPerYear ? ` About ${pay.openingsPerYear.toLocaleString('en-US')} openings a year on average.` : ''}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        One national figure for the whole occupation, not for “{title}” in your town. Pay depends on where, who employs you and experience,
        and a projected decline is not the same as no jobs.
      </p>
      <p className="text-sm">
        Source: <a className="text-(--color-accent) underline" href={pay.source} target="_blank" rel="noopener noreferrer">{pay.sourceName}</a>,
        retrieved {pay.retrievedOn}.
      </p>
    </Panel>
  );
}
