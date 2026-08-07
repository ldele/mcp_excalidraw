import fs from 'fs';
import { CliUsageError, readStdin } from './args.js';
import { getHealth } from '../core/canvas-client.js';
import { EXPRESS_SERVER_URL } from '../core/config.js';

// Results go to stdout as JSON; diagnostics belong on stderr.
export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

export function note(message: string): void {
  process.stderr.write(message + '\n');
}

// Screenshot / mermaid / viewport need a browser tab rendering the canvas.
export async function requireBrowserClient(what: string): Promise<void> {
  const health = await getHealth();
  if (health.websocket_clients === 0) {
    const error = new Error(
      `${what} requires the canvas to be open in a browser. Open ${EXPRESS_SERVER_URL} and retry.`
    );
    (error as any).code = 'BROWSER_REQUIRED';
    throw error;
  }
}

// Two browser tabs on one canvas destroy each other's work. Every tab POSTs its
// whole scene to /api/elements/sync, and the handler reads "absent from this
// payload" as "the human deleted it" — so each tab's sync deletes whatever the
// other just added, and the two thrash indefinitely. On 2026-08-07 that silently
// wiped a whole round of human markup: 386 adds against 385 deletes, six
// annotations gone, and nothing in the report said why (KI-7).
//
// Pure so it can be tested without a live server; callers pass
// `(await getHealth()).websocket_clients`.
export function multiClientWarning(clients: number): string | null {
  if (clients <= 1) return null;
  return (
    `${clients} browser tabs are connected to ${EXPRESS_SERVER_URL}. They will delete ` +
    `each other's elements, and anything drawn now can be lost silently. ` +
    `Close all but one tab before drawing or reading markup.`
  );
}

// Read JSON input from a positional file argument or stdin ("-" = stdin).
export async function readJsonInput(file: string | undefined, what: string): Promise<any> {
  const raw = file !== undefined && file !== '-' ? fs.readFileSync(file, 'utf-8') : await readStdin();
  if (!raw.trim()) {
    throw new CliUsageError(`No ${what} provided (pass a file argument or pipe JSON to stdin)`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new CliUsageError(`Invalid JSON ${what}: ${(error as Error).message}`);
  }
}
