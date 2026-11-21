// The legend's "Send to Claude" box, and what a person has not sent yet (ADR-007, SPEC-009).
//
// A person marks up undisturbed and ticks the Send box when the round is done. Until then the
// agent's readings hold back whatever that person did after the last send, and say only how many
// edits are waiting. The agent's own edits are never held. A canvas with no Send box holds
// nothing, so every scene drawn before ADR-007 reads as it did.
//
// The rule runs on what the server already keeps: each element's last `rev` and `origin`, and the
// change log. This module is pure; src/core/send-round.ts fetches and acts.

import { ChangeRecord, ServerElement } from '../types.js';
import { approvalBoxHolding, isFilled } from './approval.js';
import { SEND_BOX_ID } from './send-tick.js';

export { SEND_BOX_ID };

export function isSendBoxId(id: unknown): boolean {
  return id === SEND_BOX_ID;
}

export interface SendState {
  box: ServerElement;
  // The agent's latest write to the box: where the current round began.
  roundStart: number;
  // The person's marks inside the box made since the round began (the box itself when they
  // filled it). Empty while the round is not sent.
  tickIds: Set<string>;
  // The latest tick's rev; undefined until the round is sent.
  sentAt?: number;
  // A person's edit after this rev is held: the send once there is one, the round start before.
  boundary: number;
}

// Where the round began: the box's own rev while the agent was the last to write it, else the
// log's latest agent record for it (a person's fill made them the box's last writer), else 0.
function roundStartOf(box: ServerElement, records: readonly ChangeRecord[]): number {
  if (box.origin !== 'human' && typeof box.rev === 'number') return box.rev;
  let latest = 0;
  for (const record of records) {
    if (record.id === box.id && record.origin === 'agent' && record.rev > latest) latest = record.rev;
  }
  return latest;
}

// The send state of a scene, or undefined when it has no Send box. `records` is the change log,
// needed only to find the round start once a person has filled the box.
export function sendState(
  elements: readonly ServerElement[],
  records: readonly ChangeRecord[] = []
): SendState | undefined {
  const box = elements.find(el => isSendBoxId(el.id));
  if (!box) return undefined;
  const roundStart = roundStartOf(box, records);

  const tickIds = new Set<string>();
  let sentAt: number | undefined;
  const note = (id: string, rev: number | undefined): void => {
    if (typeof rev !== 'number' || rev <= roundStart) return;
    tickIds.add(id);
    sentAt = Math.max(sentAt ?? 0, rev);
  };
  if (box.origin === 'human' && isFilled(box)) note(box.id, box.rev);
  for (const el of elements) {
    if (el.origin !== 'human' || el.id === box.id) continue;
    if (el.type === 'text' && typeof el.containerId === 'string') continue;
    if (approvalBoxHolding(el, [box])) note(el.id, el.rev);
  }
  return { box, roundStart, tickIds, sentAt, boundary: sentAt ?? roundStart };
}

export function isSent(state: SendState): boolean {
  return state.sentAt !== undefined;
}

// A person's edit made after the boundary, other than a tick.
export function isHeldRecord(record: ChangeRecord, state: SendState): boolean {
  return record.origin === 'human' && record.rev > state.boundary && !state.tickIds.has(record.id);
}

export function holdRecords(
  records: readonly ChangeRecord[],
  state: SendState
): { released: ChangeRecord[]; held: number } {
  const released: ChangeRecord[] = [];
  let held = 0;
  for (const record of records) {
    if (isHeldRecord(record, state)) held++;
    else released.push(record);
  }
  return { released, held };
}

// The scene as the agent may read it: without the elements a person created after the boundary
// (and their bound text). A person's edit to an element that already existed stays as it is now
// and is only counted: the log's deltas are canonical, so undoing them would rebuild a scene that
// never existed (SPEC-009 row 6). `records` must reach back to the boundary; pass undefined when
// the log was truncated, and every element a person last touched after the boundary is left out.
export function holdScene(
  elements: readonly ServerElement[],
  records: readonly ChangeRecord[] | undefined,
  state: SendState
): { elements: ServerElement[]; held: number } {
  const dropped = new Set<string>();
  let held = 0;
  if (records) {
    for (const record of records) {
      if (!isHeldRecord(record, state)) continue;
      held++;
      if (record.kind === 'add') dropped.add(record.id);
    }
  } else {
    for (const el of elements) {
      if (el.origin !== 'human' || state.tickIds.has(el.id) || isSendBoxId(el.id)) continue;
      if (typeof el.rev === 'number' && el.rev > state.boundary) dropped.add(el.id);
    }
    held = dropped.size;
  }
  const kept = elements.filter(el =>
    !dropped.has(el.id) && !(typeof el.containerId === 'string' && dropped.has(el.containerId)));
  return { elements: kept, held };
}

// The line a reading prints in place of what it holds.
export function heldLine(held: number): string {
  return `⏸ ${held} ${held === 1 ? 'edit' : 'edits'} by a person, not sent yet.`;
}
