import { useState } from 'react';
import { Sprite } from '@/art/Sprite';
import { STAGE_FRAMES } from '@/art/sprites';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import { Switch } from '@/components/ui/8bit/switch';
import { Panel } from '@/components/Panel';
import { go } from '@/app/useRoute';
import { TRACKS, cardsOfTrack, type TrackId } from '@/content';
import { MAX_CHARACTER_NAME, cleanCharacterName, linkHeartBeat, saveSettings } from '@/db/repository';
import { useSettings } from '../useApp';

type Step = 'name' | 'tracks' | 'link';

/**
 * First run (App Flow §2): name the character, pick tracks, optionally link
 * HeartBeat. Nothing is required but the name, and even the link can wait.
 */
export function WelcomePage() {
  const settings = useSettings();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState(settings.characterName);
  const [tracks, setTracks] = useState<TrackId[]>(settings.tracks);
  const [token, setToken] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const clean = cleanCharacterName(name);
  const frames = STAGE_FRAMES.Foundations ?? [];

  async function finish(withToken: boolean) {
    try {
      if (withToken) await linkHeartBeat(token);
      await saveSettings({ characterName: clean, tracks, onboardedAt: Date.now() });
      go({ name: 'today' });
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Could not link.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-(--shell-max) px-4 pt-[calc(env(safe-area-inset-top)+32px)] pb-16">
      <h1 className="sr-only">Welcome to Lantern</h1>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Sprite frames={frames} size={128} label={clean ? `${clean}, your character, typing on a laptop` : 'Your character, typing on a laptop'} />
        <p className="font-pixel text-xs text-(--color-accent)">&gt; lantern<span className="cursor" /></p>
        <p className="font-pixel text-[0.625rem] text-muted-foreground" aria-live="polite">
          Step {step === 'name' ? 1 : step === 'tracks' ? 2 : 3} of 3
        </p>
      </div>

      {step === 'name' && (
        <Panel title="Who is learning?" id="w-name">
          <p>
            This is your character: a hacker starting at the bottom, working up from help desk to
            sysadmin to cloud. Everything you study stays on this device. What is his name?
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (clean) setStep('tracks');
            }}
          >
            <label htmlFor="character-name" className="mb-3 mt-2 block text-sm font-semibold">Character name</label>
            <Input
              id="character-name"
              font="normal"
              className="h-12 text-base"
              value={name}
              maxLength={MAX_CHARACTER_NAME}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" className="mt-6 h-12 w-full" disabled={!clean}>Next</Button>
          </form>
        </Panel>
      )}

      {step === 'tracks' && (
        <Panel title="What are you studying?" id="w-tracks">
          <p className="text-muted-foreground">Pick any. You can change this later in Me.</p>
          <ul className="my-2 divide-y divide-border">
            {TRACKS.map((track) => {
              const on = tracks.includes(track.id);
              const count = cardsOfTrack(track.id).length;
              return (
                <li key={track.id} className="flex min-h-12 items-center justify-between gap-4 py-3">
                  <label htmlFor={`track-${track.id}`} className="flex flex-col">
                    <span className="font-semibold">{track.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {count ? `${count} cards so far` : 'cards on the way'}
                    </span>
                  </label>
                  <Switch
                    id={`track-${track.id}`}
                    checked={on}
                    onCheckedChange={(checked) =>
                      setTracks((current) => (checked ? [...current, track.id] : current.filter((t) => t !== track.id)))}
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex gap-4">
            <Button type="button" variant="secondary" className="h-12 flex-1" onClick={() => setStep('name')}>Back</Button>
            <Button type="button" className="h-12 flex-1" disabled={tracks.length === 0} onClick={() => setStep('link')}>
              Next
            </Button>
          </div>
        </Panel>
      )}

      {step === 'link' && (
        <Panel title="Link HeartBeat (optional)" id="w-link">
          <p>
            In HeartBeat, open Settings and connect a study app. It shows a token once: paste it here
            and finished sessions earn XP for your pet. Studying works the same without it.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void finish(true);
            }}
          >
            <label htmlFor="w-token" className="mb-3 mt-2 block text-sm font-semibold">Study token</label>
            <Input
              id="w-token"
              font="normal"
              className="h-12 text-base"
              value={token}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setToken(e.target.value)}
            />
            {note ? <p role="alert" className="mt-3 text-(--color-danger)">{note}</p> : null}
            <Button type="submit" className="mt-6 h-12 w-full" disabled={!token.trim()}>Link and start</Button>
          </form>
          <Button type="button" variant="ghost" className="mt-2 h-12 w-full" onClick={() => void finish(false)}>
            Skip for now
          </Button>
        </Panel>
      )}
    </main>
  );
}
