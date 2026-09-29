import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  exportProgress, flushOutbox, importProgress, linkHeartBeat, parseBackup, saveSettings,
  unlinkHeartBeat, type ImportProblem,
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

  return (
    <>
      <header className="page-head">
        <h1>Me</h1>
      </header>

      <section className="card" aria-labelledby="h-link">
        <h2 id="h-link">HeartBeat link</h2>
        <p className="quiet">
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
            <label className="field-label" htmlFor="token">Study token</label>
            <input
              id="token"
              className="field"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Copied from HeartBeat → Settings → study app"
            />
            <label className="field-label" htmlFor="origin">HeartBeat address (optional)</label>
            <input
              id="origin"
              className="field"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={settings.heartbeatOrigin}
            />
            <button type="submit" className="primary" disabled={!token.trim()}>
              {settings.linkState === 'needs-reconnect' ? 'Reconnect' : 'Link'}
            </button>
          </form>
        )}

        {linked && (
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              await unlinkHeartBeat();
              setNote('Unlinked on this device. Revoke the token in HeartBeat Settings too.');
            }}
          >
            Unlink this device
          </button>
        )}
      </section>

      <section className="card" aria-labelledby="h-study">
        <h2 id="h-study">Studying</h2>
        <label className="field-label" htmlFor="new-per-day">New cards a day</label>
        <input
          id="new-per-day"
          className="field"
          type="number"
          min={0}
          max={50}
          value={settings.newPerDay}
          onChange={(e) => {
            const value = Math.max(0, Math.min(50, Math.floor(Number(e.target.value) || 0)));
            void saveSettings({ newPerDay: value });
          }}
        />
        <p className="quiet">Day boundaries follow your timezone: {settings.timeZone}.</p>
      </section>

      <section className="card" aria-labelledby="h-backup">
        <h2 id="h-backup">Backup</h2>
        <p className="quiet">
          Progress lives on this device only. Download a backup now and then; restoring merges,
          it never deletes.
        </p>
        <button type="button" className="secondary" onClick={() => void download()}>Download backup</button>
        <label className="field-label" htmlFor="restore">Restore from a backup</label>
        <input
          id="restore"
          ref={fileInput}
          className="field"
          type="file"
          accept="application/json,.json"
          onChange={(e) => void restore(e.target.files?.[0])}
        />
      </section>

      {note ? <p className="toast" role="status">{note}</p> : null}
    </>
  );
}
