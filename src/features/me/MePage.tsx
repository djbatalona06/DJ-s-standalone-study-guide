import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import { Switch } from '@/components/ui/8bit/switch';
import { PageHead } from '@/components/Shell';
import { Panel } from '@/components/Panel';
import { TRACKS } from '@/content';
import { db } from '../../db/database';
import {
  MAX_CHARACTER_NAME, cleanCharacterName, exportProgress, flushOutbox, importProgress, linkHeartBeat,
  parseBackup, saveSettings, unlinkHeartBeat, type ImportProblem,
} from '../../db/repository';
import { useSettings } from '../useApp';

const PROBLEM_TEXT: Record<ImportProblem, string> = {
  'not-json': 'That file is not readable. Pick a Lantern backup (.json).',
  'not-lantern': 'That is not a Lantern backup.',
  'newer-version': 'That backup is from a newer version of Lantern. Update the app first.',
};

export function MePage() {
  const settings = useSettings();
  const pending = useLiveQuery(async () => {
    const rows = await db.outbox.toArray();
    return rows.filter((row) => row.sentAt === undefined && row.rejectedAt === undefined).length;
  }, []);
  const [token, setToken] = useState('');
  const [origin, setOrigin] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function link() {
    try {
      await linkHeartBeat(token, origin || undefined);
      setToken('');
      const summary = await flushOutbox(Date.now());
      setNote(summary.sent > 0 ? `Linked. Sent ${summary.sent} waiting session(s).` : 'Linked.');
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Could not link.');
    }
  }

  async function download() {
    const file = await exportProgress(Date.now());
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lantern-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNote('Backup downloaded. It holds your progress, not your HeartBeat link.');
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setNote(PROBLEM_TEXT[parsed.problem]);
      return;
    }
    const s = await importProgress(parsed.file);
    setNote(`Imported: ${s.cardsAdded} new cards, ${s.cardsUpdated} updated, ${s.reviewsAdded} reviews, ${s.sessionsAdded} sessions.`);
    if (fileInput.current) fileInput.current.value = '';
  }

  const linked = settings.linkState !== 'unlinked';
  const label = 'mb-3 mt-4 block text-sm font-semibold';

  return (
    <>
      <PageHead title="Me" />

      <Panel title="Character" id="character">
        <label className={label} htmlFor="me-name">Name</label>
        <Input
          id="me-name"
          font="normal"
          className="h-12 text-base"
          maxLength={MAX_CHARACTER_NAME}
          defaultValue={settings.characterName}
          key={settings.characterName}
          autoComplete="off"
          spellCheck={false}
          onBlur={(e) => {
            const name = cleanCharacterName(e.target.value);
            if (name && name !== settings.characterName) void saveSettings({ characterName: name });
          }}
        />
        <p className="mt-3 text-sm text-muted-foreground">Saved when you leave the field. It cannot be blank.</p>
      </Panel>

      <Panel title="HeartBeat link" id="link">
        <p className="text-muted-foreground">
          {settings.linkState === 'unlinked' && 'Not linked. Studying works without it.'}
          {settings.linkState === 'linked' && 'Linked. Finished sessions earn XP for your pet.'}
          {settings.linkState === 'needs-reconnect' && 'The link was revoked. Paste a new token to reconnect.'}
          {(pending ?? 0) > 0 ? ` ${pending} session(s) waiting to send.` : ''}
        </p>

        {settings.linkState !== 'linked' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void link();
            }}
          >
            <label className={label} htmlFor="token">Study token</label>
            <Input
              id="token"
              font="normal"
              className="h-12 text-base"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="HeartBeat → Settings → study app"
            />
            <label className={label} htmlFor="origin">HeartBeat address (optional)</label>
            <Input
              id="origin"
              font="normal"
              className="h-12 text-base"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={settings.heartbeatOrigin}
            />
            <Button type="submit" className="mt-6 h-12 w-full" disabled={!token.trim()}>
              {settings.linkState === 'needs-reconnect' ? 'Reconnect' : 'Link'}
            </Button>
          </form>
        )}

        {linked && (
          <Button
            type="button"
            variant="secondary"
            className="mt-3 h-12 w-full"
            onClick={async () => {
              await unlinkHeartBeat();
              setNote('Unlinked on this device. Revoke the token in HeartBeat Settings too.');
            }}
          >
            Unlink this device
          </Button>
        )}
      </Panel>

      <Panel title="Studying" id="study">
        <ul className="divide-y-2 divide-dashed divide-border">
          {TRACKS.map((track) => (
            <li key={track.id} className="flex min-h-12 items-center justify-between gap-4 py-3">
              <label htmlFor={`me-track-${track.id}`}>Show {track.title} on Today</label>
              <Switch
                id={`me-track-${track.id}`}
                checked={settings.tracks.includes(track.id)}
                onCheckedChange={(on) => void saveSettings({
                  tracks: on ? [...settings.tracks, track.id] : settings.tracks.filter((t) => t !== track.id),
                })}
              />
            </li>
          ))}
        </ul>
        <label className={label} htmlFor="new-per-day">New cards a day</label>
        <Input
          id="new-per-day"
          font="normal"
          className="h-12 text-base"
          type="number"
          min={0}
          max={50}
          value={settings.newPerDay}
          onChange={(e) => {
            const value = Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0)));
            void saveSettings({ newPerDay: value });
          }}
        />
        <p className="mt-3 text-sm text-muted-foreground">Days follow your timezone: {settings.timeZone}.</p>
      </Panel>

      <Panel title="Backup" id="backup">
        <p className="text-muted-foreground">
          Progress lives on this device only. Download a backup now and then; restoring merges, it
          never deletes.
        </p>
        <Button type="button" variant="secondary" className="mt-3 h-12 w-full" onClick={() => void download()}>
          Download backup
        </Button>
        <label className={label} htmlFor="restore">Restore from a backup</label>
        <input
          id="restore"
          ref={fileInput}
          className="block w-full text-sm file:mr-4 file:min-h-12 file:border-0 file:bg-secondary file:px-4 file:font-pixel file:text-[0.625rem] file:text-foreground"
          type="file"
          accept="application/json,.json"
          onChange={(e) => void restore(e.target.files?.[0])}
        />
      </Panel>

      {note ? (
        <p role="status" className="border-4 border-foreground bg-card p-4 dark:border-ring">{note}</p>
      ) : null}
    </>
  );
}
