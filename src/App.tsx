import { Suspense, lazy } from 'react';
import { go, useRoute } from './app/useRoute';
import { Shell } from './components/Shell';
import { FlashcardsPage } from './features/flashcards/FlashcardsPage';
import { LearnPage } from './features/learn/LearnPage';
import { MePage } from './features/me/MePage';
import { ReviewSession } from './features/review/ReviewSession';
import { TodayPage } from './features/today/TodayPage';
import { useSettingsRow } from './features/useApp';
import { WelcomePage } from './features/welcome/WelcomePage';

// The diagram viewer is its own chunk: nobody pays for it until they open one.
const DiagramPage = lazy(() => import('./features/diagram/DiagramPage'));

const Loading = () => <p className="p-6 font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

export function App() {
  const route = useRoute();
  const settings = useSettingsRow();

  if (settings === undefined) return <Loading />;
  // First run: the welcome flow renders in place until it is finished.
  if (!settings?.onboardedAt || route.name === 'welcome') return <WelcomePage />;

  // A review is one thing, not a page: no tab bar.
  if (route.name === 'review') {
    return (
      <main className="mx-auto w-full max-w-(--shell-max) px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-6">
        <ReviewSession trackId={route.track} onExit={() => go({ name: 'today' })} />
      </main>
    );
  }

  return (
    <Shell route={route}>
      {route.name === 'today' && <TodayPage />}
      {route.name === 'learn' && <LearnPage />}
      {route.name === 'me' && <MePage />}
      {route.name === 'flashcards' && <FlashcardsPage key={route.deck} deckId={route.deck} />}
      {route.name === 'diagram' && (
        <Suspense fallback={<Loading />}>
          <DiagramPage id={route.id} />
        </Suspense>
      )}
    </Shell>
  );
}
