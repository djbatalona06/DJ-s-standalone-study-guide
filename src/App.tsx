import { Suspense, lazy, useEffect } from 'react';
import { textScale } from './domain/display';
import { go, useRoute } from './app/useRoute';
import { Shell } from './components/Shell';
import { TodayPage } from './features/today/TodayPage';
import { useSettingsRow } from './features/useApp';
import { WelcomePage } from './features/welcome/WelcomePage';

// Screens a first visit does not need are their own chunks, so the first paint
// downloads only the shell, Today and the welcome flow. The diagram viewer,
// quizzes and exams are chunks for the same reason.
const LearnPage = lazy(() => import('./features/learn/LearnPage').then((m) => ({ default: m.LearnPage })));
const MePage = lazy(() => import('./features/me/MePage').then((m) => ({ default: m.MePage })));
const PathPage = lazy(() => import('./features/path/PathPage').then((m) => ({ default: m.PathPage })));
const NodePage = lazy(() => import('./features/path/NodePage').then((m) => ({ default: m.NodePage })));
const FlashcardsPage = lazy(() => import('./features/flashcards/FlashcardsPage').then((m) => ({ default: m.FlashcardsPage })));
const ReviewSession = lazy(() => import('./features/review/ReviewSession').then((m) => ({ default: m.ReviewSession })));
// The diagram viewer is its own chunk: nobody pays for it until they open one.
const DiagramPage = lazy(() => import('./features/diagram/DiagramPage'));
// Quizzes and exams too: they carry the question renderer and the exam clock.
const QuizPage = lazy(() => import('./features/quiz/QuizSession').then((m) => ({ default: m.QuizPage })));
const ExamPage = lazy(() => import('./features/quiz/ExamSession').then((m) => ({ default: m.ExamPage })));

const Loading = () => <p className="p-6 font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

export function App() {
  const route = useRoute();
  const settings = useSettingsRow();

  // Display preferences live on the root element so every screen, and the CSS, sees them.
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-calm', !!settings?.calm);
    root.style.fontSize = `${textScale(settings?.textSize)}%`;
  }, [settings?.calm, settings?.textSize]);

  if (settings === undefined) return <Loading />;
  // First run: the welcome flow renders in place until it is finished.
  if (!settings?.onboardedAt || route.name === 'welcome') return <WelcomePage />;

  // A review (or a study round) is one thing, not a page: no tab bar.
  if (route.name === 'review' || route.name === 'study') {
    return (
      <main className="mx-auto w-full max-w-(--shell-max) px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-6">
        <Suspense fallback={<Loading />}>
          <ReviewSession key={route.name} trackId={route.track} study={route.name === 'study'} onExit={() => go({ name: route.name === 'study' ? 'learn' : 'today' })} />
        </Suspense>
      </main>
    );
  }

  // A quiz or an exam is one thing too: no tab bar, and it hands back to Learn.
  if (route.name === 'quiz' || route.name === 'exam') {
    const back = () => go({ name: 'learn' });
    return (
      <main className="mx-auto w-full max-w-(--shell-max) px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-6">
        <Suspense fallback={<Loading />}>
          {route.name === 'quiz'
            ? <QuizPage key={route.scope} scope={route.scope} onExit={back} />
            : <ExamPage key={route.track} trackId={route.track} onExit={back} />}
        </Suspense>
      </main>
    );
  }

  return (
    <Shell route={route}>
      <Suspense fallback={<Loading />}>
        {route.name === 'today' && <TodayPage />}
        {route.name === 'learn' && <LearnPage />}
        {route.name === 'me' && <MePage />}
        {route.name === 'path' && <PathPage />}
        {route.name === 'node' && <NodePage key={route.id} id={route.id} />}
        {route.name === 'flashcards' && <FlashcardsPage key={route.deck} deckId={route.deck} />}
        {route.name === 'diagram' && <DiagramPage id={route.id} />}
      </Suspense>
    </Shell>
  );
}
