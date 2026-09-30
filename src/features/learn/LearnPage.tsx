import { ClipboardCheck, Cpu, Layers } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Progress } from '@/components/ui/8bit/progress';
import { PageHead } from '@/components/Shell';
import { Panel } from '@/components/Panel';
import { href } from '@/app/route';
import { go } from '@/app/useRoute';
import { diagramsOf } from '@/content/diagrams';
import { TRACKS, domainsOf, type TrackId } from '@/content';
import { TRACKS_WITH_QUESTIONS } from '@/content/questions';
import { bookingAdvice } from '@/domain/mastery/booking';
import { domainMastery } from '@/domain/mastery/readiness';
import { useQuizAccuracy, useStates } from '../useApp';
import { useLibrary } from '../useLibrary';
import { useReadiness } from '../useReadiness';

/** Every track's hooks in one component, so the page can map over tracks without hooks in a loop. */
function Booking({ trackId }: { trackId: TrackId }) {
  const progress = useReadiness(trackId);
  return progress ? <p className="text-sm">{bookingAdvice(progress.readiness, progress.exams).message}</p> : null;
}

export function LearnPage() {
  const states = useStates();
  const quiz = useQuizAccuracy();
  const library = useLibrary();
  if (!states || !quiz || !library) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  return (
    <>
      <PageHead title="Learn" sub="Three tracks. Domains follow the exam's own outline, weighted as the exam weights them." />

      {TRACKS.map((track) => {
        const hasCards = library.cardsOfTrack(track.id).length > 0;
        return (
          <Panel key={track.id} id={`t-${track.id}`} title={track.title}>
            <p className="text-sm text-muted-foreground">
              {track.exam
                ? `${track.exam.code} · ${track.exam.questions} questions · ${track.exam.minutes} min · pass ${track.exam.passMark}/${track.exam.scale}`
                : track.objectiveVersion}
            </p>
            <ul className="divide-y-2 divide-dashed divide-border">
              {domainsOf(track.id).map((domain) => {
                const cards = library.cardsOfDomain(domain.id);
                const mastery = domainMastery(
                  { id: domain.id, weight: domain.weight, cardIds: cards.map((c) => c.id) },
                  states,
                  quiz.get(domain.id),
                );
                const pct = Math.round(mastery.mastery * 100);
                return (
                  <li key={domain.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-semibold">{domain.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {' '}· {track.exam ? `${Math.round(domain.weight * 100)}% of exam` : domain.code}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {cards.length === 0 ? 'no cards yet' : <><span className="font-pixel text-xs text-foreground">{pct}%</span> · {cards.length}</>}
                      </span>
                    </div>
                    {cards.length > 0 ? (
                      <Progress variant="retro" value={pct} className="mt-3 h-2" aria-label={`${domain.title} mastery ${pct}%`} />
                    ) : null}
                    {cards.length > 0 ? (
                      <a
                        href={href({ name: 'flashcards', deck: domain.id })}
                        className="mt-3 mr-6 inline-flex min-h-12 items-center gap-2 text-(--color-accent) underline-offset-4 hover:underline"
                      >
                        <Layers aria-hidden="true" className="size-4" /> Flashcards ({cards.length})
                      </a>
                    ) : null}
                    {TRACKS_WITH_QUESTIONS.includes(track.id) ? (
                      <a
                        href={href({ name: 'quiz', scope: domain.id })}
                        className="mt-3 mr-6 inline-flex min-h-12 items-center gap-2 text-(--color-accent) underline-offset-4 hover:underline"
                      >
                        <ClipboardCheck aria-hidden="true" className="size-4" /> Quiz
                      </a>
                    ) : null}
                    {diagramsOf(domain.id).map((diagram) => (
                      <a
                        key={diagram.id}
                        href={href({ name: 'diagram', id: diagram.id })}
                        className="mt-3 inline-flex min-h-12 items-center gap-2 text-(--color-accent) underline-offset-4 hover:underline"
                      >
                        <Cpu aria-hidden="true" className="size-4" /> Diagram: {diagram.title}
                      </a>
                    ))}
                  </li>
                );
              })}
            </ul>
            {track.exam && TRACKS_WITH_QUESTIONS.includes(track.id) ? <Booking trackId={track.id} /> : null}
            {TRACKS_WITH_QUESTIONS.includes(track.id) ? (
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <Button asChild variant="secondary" className="h-12"><a href={href({ name: 'quiz', scope: track.id })}>Quick quiz</a></Button>
                {track.exam ? <Button asChild className="h-12"><a href={href({ name: 'exam', track: track.id })}>Practice exam</a></Button> : null}
              </div>
            ) : null}
            {hasCards ? (
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <Button className="h-12" onClick={() => go({ name: 'study', track: track.id })}>
                  Study {track.title}
                </Button>
                <Button variant="secondary" className="h-12" onClick={() => go({ name: 'review', track: track.id })}>
                  Review {track.title}
                </Button>
                <Button asChild variant="secondary" className="h-12">
                  <a href={href({ name: 'flashcards', deck: track.id })}>Flashcards</a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cards are on their way. Verify the weights against CompTIA's official objectives before
                you rely on the percentages.
              </p>
            )}
          </Panel>
        );
      })}
    </>
  );
}
