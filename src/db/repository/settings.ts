import { db, type SettingsRow } from '../database';
import { deviceTimeZone } from '../../domain/day';

/** Where HeartBeat lives unless somebody says otherwise. */
export const DEFAULT_HEARTBEAT_ORIGIN = 'https://heartbeat-eop.pages.dev';
export const SCHEMA_VERSION = 1;

export function defaultSettings(): SettingsRow {
  return {
    id: 'me',
    timeZone: deviceTimeZone(),
    heartbeatOrigin: DEFAULT_HEARTBEAT_ORIGIN,
    linkState: 'unlinked',
    newPerDay: 12,
    characterName: '',
    tracks: ['cs50', 'a1'],
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Reads the settings row, creating it on first use. */
export async function getSettings(): Promise<SettingsRow> {
  const stored = await db.settings.get('me');
  if (stored) return { ...defaultSettings(), ...stored };
  const fresh = defaultSettings();
  await db.settings.put(fresh);
  return fresh;
}

export async function saveSettings(patch: Partial<Omit<SettingsRow, 'id'>>): Promise<SettingsRow> {
  const next = { ...(await getSettings()), ...patch, id: 'me' as const };
  await db.settings.put(next);
  return next;
}

/**
 * Stores a study token pasted from HeartBeat and marks the link live.
 * Whitespace is trimmed: a token copied from a chat arrives with a newline.
 */
export async function linkHeartBeat(token: string, origin?: string): Promise<SettingsRow> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('Paste the study token from HeartBeat first.');
  const cleanOrigin = origin?.trim().replace(/\/$/, '');
  return saveSettings({
    studyToken: trimmed,
    linkState: 'linked',
    ...(cleanOrigin ? { heartbeatOrigin: cleanOrigin } : {}),
  });
}

/** Forgets the token on this device. HeartBeat's own Settings is where it is revoked. */
export async function unlinkHeartBeat(): Promise<SettingsRow> {
  const current = await getSettings();
  const { studyToken: _dropped, ...rest } = current;
  await db.settings.put({ ...rest, linkState: 'unlinked' });
  return getSettings();
}

/** The longest name the character can have; it has to fit on a phone header. */
export const MAX_CHARACTER_NAME = 24;

/** Trims and bounds a typed name. An empty result means "ask again". */
export function cleanCharacterName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARACTER_NAME);
}
