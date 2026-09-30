import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/8bit/button';

/**
 * A new build installs in the background and then waits, so a review is never
 * reloaded under you. This is the "prompt": it says so and lets you choose.
 * It lives in Shell only; review, quiz and exam render outside it.
 */
export function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // An installed app is resumed, not reloaded, so ask for a new build then.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined);
      });
    },
  });
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b-4 border-foreground bg-card px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)] dark:border-ring"
    >
      <p className="text-sm">A new version of Lantern is ready.</p>
      <Button className="h-10" onClick={() => void updateServiceWorker(true)}>Reload</Button>
    </div>
  );
}
