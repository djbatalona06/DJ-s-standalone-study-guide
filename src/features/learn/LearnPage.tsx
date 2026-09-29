import { TRACKS, cardsOfDomain, cardsOfTrack, domainsOf, type TrackId } from '../../content';
import { domainMastery } from '../../domain/mastery/readiness';
import { useStates } from '../useApp';

interface Props {
  onReview: (track: TrackId) => void;
}

export function LearnPage({ onReview }: Props) {
  const states = useStates();
  if (!states) return <p className="quiet">Loading…</p>;

  return (
    <>
      <header className="page-head">
        <h1>Learn</h1>
        <p className="quiet">Three tracks. Only CS50 has cards so far.</p>
      </header>

      {TRACKS.map((track) => {
        const domains = domainsOf(track.id);
        const hasCards = cardsOfTrack(track.id).length > 0;
        return (
          <section className="card" key={track.id} aria-labelledby={`t-${track.id}`}>
            <h2 id={`t-${track.id}`}>{track.title}</h2>
            <p className="quiet">
              {track.exam
                ? `${track.exam.code} · ${track.exam.questions} questions · ${track.exam.minutes} min · pass ${track.exam.passMark}/${track.exam.scale}`
                : track.objectiveVersion}
            </p>
            <ul className="rows">
              {domains.map((domain) => {
                const cards = cardsOfDomain(domain.id);
                const mastery = domainMastery(
                  { id: domain.id, weight: domain.weight, cardIds: cards.map((c) => c.id) },
                  states,
                );
                return (
                  <li key={domain.id} className="row">
                    <span>
                      <strong>{domain.title}</strong>
                      <span className="quiet">
                        {' '}· {track.exam ? `${Math.round(domain.weight * 100)}% of exam` : domain.code}
                      </span>
                    </span>
                    <span className="quiet">
                      {cards.length === 0 ? 'no cards yet' : `${Math.round(mastery.mastery * 100)}% · ${cards.length} cards`}
                    </span>
                  </li>
                );
              })}
            </ul>
            {hasCards ? (
              <button type="button" className="primary" onClick={() => onReview(track.id)}>
                Review {track.title}
              </button>
            ) : (
              <p className="quiet">
                Content is on its way. The domain list and weights are the exam’s own structure;
                verify them against the official objectives before you rely on the percentages.
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
