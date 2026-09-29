import { useState } from 'react';
import type { TrackId } from './content/types';
import { TodayPage } from './features/today/TodayPage';
import { LearnPage } from './features/learn/LearnPage';
import { MePage } from './features/me/MePage';
import { ReviewSession } from './features/review/ReviewSession';

type Tab = 'today' | 'learn' | 'me';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'learn', label: 'Learn' },
  { id: 'me', label: 'Me' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [reviewing, setReviewing] = useState<TrackId | null>(null);

  // The tab bar is hidden while reviewing so a session is one thing, not a page.
  if (reviewing) {
    return (
      <main className="shell">
        <ReviewSession trackId={reviewing} onExit={() => setReviewing(null)} />
      </main>
    );
  }

  return (
    <>
      <main className="shell">
        {tab === 'today' && <TodayPage onReview={setReviewing} onGo={setTab} />}
        {tab === 'learn' && <LearnPage onReview={setReviewing} />}
        {tab === 'me' && <MePage />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="tab"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
