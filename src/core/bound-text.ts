// The labels bound to an element, for a delete that must take them with it (T-025).
//
// A bound label is a text element whose `containerId` names its shape. The server stores it as an
// element of its own once a tab has synced or a scene was imported, so deleting the shape alone
// left the label drawn where the shape was, and the reading, which leaves bound text out, never
// saw it. Ours, kept out of upstream's `src/server.ts`, which only calls it.

import type { ServerElement } from '../types.js';

// Ids of the text elements bound to `containerId`, in store order. `containerId` is the binding:
// a shape's `boundElements` can still list a text that has since been bound elsewhere.
export function boundTextIds(store: Map<string, ServerElement>, containerId: string): string[] {
  const ids: string[] = [];
  for (const el of store.values()) {
    if (el.type === 'text' && el.containerId === containerId) ids.push(el.id);
  }
  return ids;
}
