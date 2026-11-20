// A round of markup as the agent may read it: held back until the person sends it (ADR-007,
// SPEC-009). The CLI (`changes`, `watch --until-sent`, `wireframe`) and the MCP tools
// (`get_canvas_changes`, `wait_for_changes`, `describe_wireframe`) all read through here, so the
// hold is the same whichever way the agent asks. The rule itself is src/core/send-box.ts.
//
// The wait runs on the client, over the server's ordinary long-poll: the server is upstream's
// file and knows nothing of the Send box.

import { ChangeRecord, ServerElement } from '../types.js';
import {
  ChangePayload,
  createElementStrict,
  deleteElementStrict,
  getChanges,
  getElements,
  getHealth,
  waitForChanges
} from './canvas-client.js';
import { ChangeSet, formatChangeReport, writtenText } from './changes.js';
import {
  SendState,
  heldLine,
  holdRecords,
  holdScene,
  isSendBoxId,
  isSent,
  sendState
} from './send-box.js';

export class NoSendBoxError extends Error {
  constructor() {
    super('No Send box on the canvas (an element with id legend-send). Apply the legend first: ' +
      'excalidraw-canvas apply skills/excalidraw-skill/references/markup-legend.json');
    this.name = 'NoSendBoxError';
  }
}

interface Round {
  state: SendState;
  log: ChangePayload;
}

// The send state and the whole retained log, or undefined (and no request) with no Send box.
async function roundOf(elements: ServerElement[]): Promise<Round | undefined> {
  if (!elements.some(el => isSendBoxId(el.id))) return undefined;
  const log = await getChanges(0);
  return { state: sendState(elements, log.records)!, log };
}

// The log's records when they reach back to `rev`, else undefined (the ring dropped some).
function recordsSince(log: ChangePayload, rev: number): ChangeRecord[] | undefined {
  if (!log.truncated) return log.records;
  const oldest = log.records[0]?.rev ?? Number.POSITIVE_INFINITY;
  return oldest <= rev + 1 ? log.records : undefined;
}

// The scene the agent may read, and the line that says what it holds back.
export async function sentScene(
  elements: ServerElement[]
): Promise<{ elements: ServerElement[]; heldNote?: string }> {
  const round = await roundOf(elements);
  if (!round) return { elements };
  const { elements: kept, held } =
    holdScene(elements, recordsSince(round.log, round.state.boundary), round.state);
  return { elements: kept, heldNote: held > 0 ? heldLine(held) : undefined };
}

// The change set with a person's unsent edits left out, and how many there were.
export async function heldChangeSet<T extends ChangeSet>(
  changeSet: T,
  elements: ServerElement[]
): Promise<T & { held: number }> {
  const round = await roundOf(elements);
  if (!round) return { ...changeSet, held: 0 };
  const { released, held } = holdRecords(changeSet.records, round.state);
  return { ...changeSet, records: released, held };
}

// A change report with a person's unsent edits left out, and counted in one line.
export async function heldChangeReport(changeSet: ChangeSet, elements: ServerElement[]): Promise<string> {
  const round = await roundOf(elements);
  if (!round) return formatChangeReport(changeSet, elements);
  const { released, held } = holdRecords(changeSet.records, round.state);
  const scene = holdScene(elements, recordsSince(round.log, round.state.boundary), round.state).elements;
  const report = formatChangeReport({ ...changeSet, records: released }, scene);
  return held > 0 ? `${report}\n${heldLine(held)}` : report;
}

// The box drawn again, same place, size, style, label and frame, without the person's ticks.
// A fresh create is a write the server always records, so it starts the next round.
export async function clearSendBox(state: SendState, elements: ServerElement[]): Promise<void> {
  for (const id of state.tickIds) {
    if (!isSendBoxId(id)) await deleteElementStrict(id);
  }
  const box = state.box;
  const boundText = elements.find(el => el.type === 'text' && el.containerId === box.id);
  const text = boundText ? writtenText(boundText) : box.label?.text;
  const redrawn: Record<string, unknown> = { id: box.id, type: box.type, x: box.x, y: box.y };
  for (const key of ['width', 'height', 'strokeColor', 'strokeWidth', 'strokeStyle', 'roughness',
    'opacity', 'roundness', 'frameId'] as const) {
    if (box[key] !== undefined) redrawn[key] = box[key];
  }
  redrawn.backgroundColor = 'transparent';
  if (text) {
    redrawn.label = {
      text,
      ...(boundText?.fontSize !== undefined ? { fontSize: boundText.fontSize } : {}),
      ...(boundText?.strokeColor !== undefined ? { strokeColor: boundText.strokeColor } : {})
    };
  }
  await deleteElementStrict(box.id);
  await createElementStrict(redrawn as unknown as ServerElement);
}

export interface SentRound {
  sent: boolean;
  report: string;
  // The canvas revision the round was read up to (after the box was cleared, once sent).
  rev: number;
}

// Wait until the person ticks the Send box, then report the whole round once and clear the box.
// On timeout, say how many edits are waiting; the caller waits again. Throws NoSendBoxError when
// the canvas has no Send box.
export async function waitUntilSent(timeoutSeconds: number, settleSeconds: number): Promise<SentRound> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let elements = await getElements();
  let round = await roundOf(elements);
  if (!round) throw new NoSendBoxError();
  let cursor = (await getHealth()).rev ?? round.log.rev;

  while (!isSent(round.state)) {
    const remaining = (deadline - Date.now()) / 1000;
    if (remaining < 1) {
      const waiting = holdRecords(round.log.records, round.state).held;
      return {
        sent: false,
        report: `Not sent yet: ${waiting} ${waiting === 1 ? 'edit' : 'edits'} by a person waiting.`,
        rev: cursor
      };
    }
    const payload = await waitForChanges(cursor, remaining, settleSeconds);
    cursor = payload.rev;
    elements = await getElements();
    round = await roundOf(elements);
    if (!round) throw new NoSendBoxError();
  }

  const { state, log } = round;
  const sentAt = state.sentAt!;
  const records = log.records.filter(r =>
    r.rev > state.roundStart && r.rev <= sentAt && !state.tickIds.has(r.id));
  const scene = holdScene(elements, recordsSince(log, state.boundary), state);
  const report = [
    `Round sent at rev ${sentAt}.`,
    formatChangeReport({
      since: state.roundStart,
      rev: sentAt,
      truncated: recordsSince(log, state.roundStart) === undefined,
      reset: false,
      records
    }, scene.elements),
    ...(scene.held > 0 ? [heldLine(scene.held)] : [])
  ];
  await clearSendBox(state, elements);
  report.push('The Send box is clear for the next round.');
  return { sent: true, report: report.join('\n'), rev: (await getHealth()).rev ?? sentAt };
}
