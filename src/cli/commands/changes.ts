import { parseArgs, CliUsageError } from '../args.js';
import { printJson, note, multiClientWarning } from '../util.js';
import { ensureCanvasRunning } from '../../core/spawn.js';
import {
  getElements,
  getChanges,
  waitForChanges,
  getHealth,
  MAX_WAIT_SECONDS,
  ChangePayload
} from '../../core/canvas-client.js';
import { formatChangeReport } from '../../core/changes.js';
import { EXPRESS_SERVER_URL } from '../../core/config.js';

function parseNumberFlag(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CliUsageError(`--${name} must be a non-negative number`);
  }
  return parsed;
}

async function report(
  payload: ChangePayload,
  asJson: boolean,
  warning?: string | null
): Promise<void> {
  if (asJson) {
    printJson(warning ? { ...payload, warnings: [warning] } : payload);
    return;
  }
  const elements = await getElements();
  // In-band as well as on stderr: the MCP tools take no arguments and an agent
  // reading a report has no other way to be told the canvas is eating markup.
  const banner = warning ? `⚠️  ${warning}\n\n` : '';
  // Plain text by design: this is the agent/human-readable review report
  process.stdout.write(banner + formatChangeReport(payload, elements) + '\n');
}

// Never fail a report because the health probe did; the warning is a courtesy.
async function clientWarning(): Promise<string | null> {
  try {
    return multiClientWarning((await getHealth()).websocket_clients);
  } catch {
    return null;
  }
}

export async function changes(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv, {
    since: { takesValue: true },
    json: { takesValue: false }
  });

  await ensureCanvasRunning();
  const since = parseNumberFlag(flags.since, 'since') ?? 0;
  const warning = await clientWarning();
  if (warning) note(`WARNING: ${warning}`);
  await report(await getChanges(since), !!flags.json, warning);
}

export async function watch(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv, {
    since: { takesValue: true },
    timeout: { takesValue: true },
    settle: { takesValue: true },
    json: { takesValue: false }
  });

  await ensureCanvasRunning();

  // Default to "wait for what happens next" rather than replaying the session.
  let since = parseNumberFlag(flags.since, 'since');
  if (since === undefined) {
    const health = await getHealth();
    since = health.rev ?? 0;
  }

  const timeout = parseNumberFlag(flags.timeout, 'timeout') ?? 60;
  if (timeout > MAX_WAIT_SECONDS) {
    throw new CliUsageError(`--timeout cannot exceed ${MAX_WAIT_SECONDS} seconds`);
  }
  const settle = parseNumberFlag(flags.settle, 'settle') ?? 1.5;

  // Before the wait, not after: the whole cost of this bug is a person spending
  // ten minutes drawing into a canvas that is deleting their work.
  const warning = await clientWarning();
  if (warning) note(`WARNING: ${warning}`);

  note(`Waiting up to ${timeout}s for canvas edits (open ${EXPRESS_SERVER_URL} to draw)...`);
  const payload = await waitForChanges(since, timeout, settle);

  if (payload.timedOut && !flags.json) {
    note(`No edits within ${timeout}s.`);
  }
  await report(payload, !!flags.json, warning);
}
