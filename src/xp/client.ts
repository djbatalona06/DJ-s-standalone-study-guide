import { classify, type OutboxEntry, type SendResult } from '../domain/xp/outbox';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Reports one finished session to HeartBeat.
 *
 * The study token is sent only to the origin the person configured, and only in
 * the Authorization header. A network failure is a retry, never an error the
 * learner has to see: offline is the normal state of a study app.
 */
export async function sendSession(
  origin: string,
  token: string,
  entry: Pick<OutboxEntry, 'sessionId' | 'kind' | 'at'>,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<SendResult> {
  try {
    const response = await fetchImpl(`${origin.replace(/\/$/, '')}/api/study/session`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: entry.sessionId, kind: entry.kind, at: entry.at }),
    });
    const body = await response.json().catch(() => ({}));
    return classify(response.status, body);
  } catch {
    return { status: 'retry', reason: 'offline' };
  }
}
