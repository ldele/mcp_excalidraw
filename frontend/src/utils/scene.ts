import { convertToExcalidrawElements, restoreElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { fillElbowFixedPoints } from '../../../src/core/elbow-binding'

export interface ServerElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string | number;
  label?: {
    text: string;
  };
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  syncedAt?: string;
  source?: string;
  syncTimestamp?: string;
  // Change-tracking metadata from the server (the fork's review loop); stripped before rendering
  rev?: number;
  origin?: 'agent' | 'human';
  boundElements?: readonly any[] | null;
  containerId?: string | null;
  locked?: boolean;
  // Arrow element binding
  start?: { id: string };
  end?: { id: string };
  strokeStyle?: string;
  endArrowhead?: string;
  startArrowhead?: string;
  // Image element fields
  fileId?: string;
  status?: string;
  scale?: [number, number];
  angle?: number;
  link?: string | null;
  frameId?: string | null;
  name?: string | null;
}

// Helper function to clean elements for Excalidraw
export const cleanElementForExcalidraw = (element: ServerElement): Partial<ExcalidrawElement> => {
  const {
    createdAt,
    updatedAt,
    syncedAt,
    source,
    syncTimestamp,
    rev,
    origin,
    ...cleanElement
  } = element;
  return cleanElement as Partial<ExcalidrawElement>;
}

// Helper function to validate and fix element binding data
const validateAndFixBindings = (elements: Partial<ExcalidrawElement>[]): Partial<ExcalidrawElement>[] => {
  const elementMap = new Map(elements.map(el => [el.id!, el]));

  return elements.map(element => {
    const fixedElement = { ...element };

    // Validate and fix boundElements
    if (fixedElement.boundElements) {
      if (Array.isArray(fixedElement.boundElements)) {
        fixedElement.boundElements = fixedElement.boundElements.filter((binding: any) => {
          // Ensure binding has required properties
          if (!binding || typeof binding !== 'object') return false;
          if (!binding.id || !binding.type) return false;

          // Ensure the referenced element exists
          const referencedElement = elementMap.get(binding.id);
          if (!referencedElement) return false;

          // Validate binding type
          if (!['text', 'arrow'].includes(binding.type)) return false;

          return true;
        });

        // Remove boundElements if empty
        if (fixedElement.boundElements.length === 0) {
          fixedElement.boundElements = null;
        }
      } else {
        // Invalid boundElements format, set to null
        fixedElement.boundElements = null;
      }
    }

    // Validate and fix containerId
    if (fixedElement.type === 'text' && fixedElement.containerId) {
      const containerElement = elementMap.get(fixedElement.containerId);
      if (!containerElement) {
        // Container doesn't exist, remove containerId
        fixedElement.containerId = null;
      }
    }

    return fixedElement;
  });
}

const isImageElement = (element: Partial<ExcalidrawElement>): boolean => {
  return element.type === 'image'
}

const isFreedrawElement = (element: Partial<ExcalidrawElement>): boolean => {
  return element.type === 'freedraw'
}

const isShapeContainerType = (type: string | undefined): boolean => {
  return type === 'rectangle' || type === 'ellipse' || type === 'diamond'
}

const recenterBoundShapeTextElements = (
  elements: Partial<ExcalidrawElement>[]
): Partial<ExcalidrawElement>[] => {
  const elementMap = new Map(elements.map((el) => [el.id, el]))

  return elements.map((element) => {
    if (element.type !== 'text' || !element.containerId) {
      return element
    }

    const textElement = element as ExcalidrawElement & { type: 'text'; containerId: string; autoResize?: boolean }
    const container = elementMap.get(textElement.containerId) as (ExcalidrawElement & { x: number; y: number; width: number; height: number }) | undefined
    if (!container || !isShapeContainerType(container.type)) {
      return element
    }

    if (textElement.autoResize === false) {
      return element
    }

    if (
      typeof container.x !== 'number' ||
      typeof container.y !== 'number' ||
      typeof container.width !== 'number' ||
      typeof container.height !== 'number' ||
      typeof textElement.width !== 'number' ||
      typeof textElement.height !== 'number'
    ) {
      return element
    }

    // Fork (T-004): place the label by its own alignment, as Excalidraw does, rather than always
    // in the middle: a `textAlign: "left"` label was stored and read back but drawn centred.
    // BOUND_TEXT_PADDING is Excalidraw's gap between a shape's edge and its label.
    const BOUND_TEXT_PADDING = 5
    const align = (textElement as { textAlign?: string }).textAlign
    const vertical = (textElement as { verticalAlign?: string }).verticalAlign
    const x = align === 'left' ? container.x + BOUND_TEXT_PADDING
      : align === 'right' ? container.x + container.width - textElement.width - BOUND_TEXT_PADDING
      : container.x + (container.width - textElement.width) / 2
    const y = vertical === 'top' ? container.y + BOUND_TEXT_PADDING
      : vertical === 'bottom' ? container.y + container.height - textElement.height - BOUND_TEXT_PADDING
      : container.y + (container.height - textElement.height) / 2
    return { ...element, x, y }
  })
}

const normalizeImageElement = (element: Partial<ExcalidrawElement>): Partial<ExcalidrawElement> => {
  const img = element as any
  return {
    ...img,
    angle: img.angle || 0,
    strokeColor: img.strokeColor || 'transparent',
    backgroundColor: img.backgroundColor || 'transparent',
    fillStyle: img.fillStyle || 'solid',
    strokeWidth: img.strokeWidth || 1,
    strokeStyle: img.strokeStyle || 'solid',
    roughness: img.roughness ?? 0,
    opacity: img.opacity ?? 100,
    groupIds: img.groupIds || [],
    roundness: null,
    seed: img.seed || Math.floor(Math.random() * 1000000),
    version: img.version || 1,
    versionNonce: img.versionNonce || Math.floor(Math.random() * 1000000),
    isDeleted: img.isDeleted ?? false,
    boundElements: img.boundElements || null,
    link: img.link || null,
    locked: img.locked || false,
    status: img.status || 'saved',
    fileId: img.fileId,
    scale: img.scale || [1, 1],
  }
}

const normalizeFreedrawElement = (element: Partial<ExcalidrawElement>): Partial<ExcalidrawElement> => {
  const freedraw = element as any
  return {
    ...freedraw,
    angle: freedraw.angle || 0,
    backgroundColor: freedraw.backgroundColor || 'transparent',
    fillStyle: freedraw.fillStyle || 'solid',
    strokeWidth: freedraw.strokeWidth || 1,
    strokeStyle: freedraw.strokeStyle || 'solid',
    roughness: freedraw.roughness ?? 1,
    opacity: freedraw.opacity ?? 100,
    groupIds: freedraw.groupIds || [],
    roundness: null,
    seed: freedraw.seed || Math.floor(Math.random() * 1000000),
    version: freedraw.version || 1,
    versionNonce: freedraw.versionNonce || Math.floor(Math.random() * 1000000),
    isDeleted: freedraw.isDeleted ?? false,
    boundElements: freedraw.boundElements || null,
    link: freedraw.link || null,
    locked: freedraw.locked || false,
    points: freedraw.points || [],
    pressures: freedraw.pressures || [],
    simulatePressure: freedraw.simulatePressure ?? true,
    lastCommittedPoint: freedraw.lastCommittedPoint || null,
  }
}

// Helper: restore startBinding/endBinding/boundElements after convertToExcalidrawElements strips them
const restoreBindings = (
  convertedElements: readonly any[],
  originalElements: Partial<ExcalidrawElement>[]
): any[] => {
  const originalMap = new Map<string, any>();
  for (const el of originalElements) {
    if (el.id) originalMap.set(el.id, el);
  }

  return convertedElements.map((el: any) => {
    const orig = originalMap.get(el.id);
    if (!orig) return el;

    const patched = { ...el };

    if (orig.startBinding && !el.startBinding) {
      patched.startBinding = orig.startBinding;
    }
    if (orig.endBinding && !el.endBinding) {
      patched.endBinding = orig.endBinding;
    }
    if (orig.boundElements && (!el.boundElements || el.boundElements.length === 0)) {
      patched.boundElements = orig.boundElements;
    }
    if (orig.elbowed !== undefined && el.elbowed === undefined) {
      patched.elbowed = orig.elbowed;
    }

    return patched;
  });
};

const isPointList = (points: unknown): points is [number, number][] =>
  Array.isArray(points) && points.length >= 2 && points.every(p =>
    Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))

// The skeleton converter is not idempotent, and every server scene passes
// through it on every update. Text x/y is read as an alignment anchor
// (centre text moves left by width/2, middle text up by height/2), and every
// arrow loses 0.5px at each end. Re-run on a synced scene, both compound into
// drift (#116). Positions and points the caller supplied are kept; the
// converter still measures text and expands labels and bindings.
const preserveCallerGeometry = (
  convertedElements: readonly any[],
  originalElements: Partial<ExcalidrawElement>[]
): any[] => {
  const originalMap = new Map<string, any>()
  for (const el of originalElements) {
    if (el.id) originalMap.set(el.id, el)
  }

  return convertedElements.map((el: any) => {
    const orig = originalMap.get(el.id)
    if (!orig) return el

    // Shape labels are recentred afterwards; arrow labels keep their place.
    if (el.type === 'text') {
      return { ...el, x: orig.x, y: orig.y }
    }
    if ((el.type === 'arrow' || el.type === 'line') && isPointList(orig.points)) {
      const xs = orig.points.map((p: [number, number]) => p[0])
      const ys = orig.points.map((p: [number, number]) => p[1])
      const preserved = {
        ...el,
        x: orig.x,
        y: orig.y,
        points: orig.points.map((p: [number, number]) => [p[0], p[1]]),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }
      // Fixed-segment indexes and hidden endpoint segments belong to these points.
      if (el.type === 'arrow' && orig.elbowed === true) {
        for (const key of ['fixedSegments', 'startIsSpecial', 'endIsSpecial'] as const) {
          if (orig[key] !== undefined) preserved[key] = orig[key]
        }
      }
      return preserved
    }
    return el
  })
}

// The converter gives a shorthand label a random id unless the label carries
// one. A server update merged onto a tab's element carries both the shorthand
// and the bound text from the last conversion, so each pass added another bound
// text to the same container. The label reuses the existing bound text's id,
// or a stable `<container-id>-label` (the id exports use), so conversion
// replaces the label instead. The converter re-adds the text binding itself.
const withStableLabelIds = (
  elements: Partial<ExcalidrawElement>[]
): Partial<ExcalidrawElement>[] =>
  elements.map((element: any) => {
    if (!element.id || element.type === 'text' || !element.label?.text) return element
    const bindings = Array.isArray(element.boundElements) ? element.boundElements : []
    const boundText = bindings.find((b: any) => b?.type === 'text')
    return {
      ...element,
      label: { ...element.label, id: element.label.id ?? boundText?.id ?? `${element.id}-label` },
      boundElements: bindings.filter((b: any) => b?.type !== 'text'),
    }
  })

const isFrame = (element: Partial<ExcalidrawElement>): element is Partial<Extract<ExcalidrawElement, { type: 'frame' | 'magicframe' }>> =>
  element.type === 'frame' || element.type === 'magicframe'

// A successful restore may still silently discard an unsupported or tiny
// element. Never allow that partial scene to become a full-sync baseline.
export const assertScenePreserved = (
  expected: readonly Partial<ExcalidrawElement>[],
  actual: readonly Partial<ExcalidrawElement>[]
): void => {
  const active = actual.filter(el => !el.isDeleted)
  const actualById = new Map(active.map(el => [el.id, el]))
  if (actualById.size !== active.length) throw new Error('Scene restore produced duplicate element IDs')
  for (const element of expected) {
    if (element.isDeleted) continue
    const restored = actualById.get(element.id)
    if (!restored || restored.type !== element.type) {
      throw new Error(`Scene restore lost element ${element.id} (${element.type})`)
    }
    if ((element.frameId ?? null) !== (restored.frameId ?? null)) {
      throw new Error(`Scene restore changed frame membership for ${element.id}`)
    }
    if (element.frameId && !isFrame(actualById.get(element.frameId) || {})) {
      throw new Error(`Missing frame ${element.frameId} for ${element.id}`)
    }
    if (isFrame(element) && isFrame(restored)) {
      for (const key of ['x', 'y', 'width', 'height', 'name'] as const) {
        if (element[key] !== undefined && element[key] !== restored[key]) {
          throw new Error(`Scene restore changed frame ${element.id}.${key}`)
        }
      }
    }
  }
}

// Fork (ADR-003): frames stay out of the skeleton converter, so it cannot bind an arrow whose
// `start` or `end` names one. The arrow came back unbound, the tab's first sync reported that as
// a person's edit, and the reading then took the agent's navigation arrow for markup. Bind it
// here as the export binds it (src/core/expand-elements.ts), on the frame's side too. A binding
// the arrow already has is kept as it is.
const bindArrowsToFrames = (
  elements: readonly any[],
  sources: readonly Partial<ExcalidrawElement>[]
): any[] => {
  const frameIds = new Set(elements.filter(isFrame).map(el => el.id))
  const refs = new Map<string, { startBinding?: string; endBinding?: string }>()
  for (const source of sources as any[]) {
    if (source.type !== 'arrow') continue
    const start = source.start?.id
    const end = source.end?.id
    if (frameIds.has(start) || frameIds.has(end)) {
      refs.set(source.id, {
        ...(frameIds.has(start) ? { startBinding: start } : {}),
        ...(frameIds.has(end) ? { endBinding: end } : {})
      })
    }
  }
  if (refs.size === 0) return [...elements]

  const arrowsByFrame = new Map<string, string[]>()
  const bound = elements.map(element => {
    const ref = refs.get(element.id)
    if (!ref || element.type !== 'arrow') return element
    const next = { ...element }
    for (const key of ['startBinding', 'endBinding'] as const) {
      const frameId = ref[key]
      if (!frameId || next[key]) continue
      next[key] = { elementId: frameId, focus: 0, gap: 4, fixedPoint: null }
      arrowsByFrame.set(frameId, [...(arrowsByFrame.get(frameId) || []), element.id])
    }
    return next
  })
  return bound.map(element => {
    const arrows = arrowsByFrame.get(element.id)
    if (!arrows) return element
    const listed = Array.isArray(element.boundElements) ? element.boundElements : []
    const missing = arrows.filter(id => !listed.some((b: any) => b?.id === id))
    return missing.length === 0 ? element
      : { ...element, boundElements: [...listed, ...missing.map(id => ({ id, type: 'arrow' }))] }
  })
}

export const prepareServerScene = (
  elements: readonly Partial<ExcalidrawElement>[],
  opts: {
    /**
     * Re-wrap and re-measure bound text from `originalText`.
     *
     * Off by default: on a full scene load the fonts may not be ready yet, and
     * measuring with a fallback font would overwrite a correctly measured file
     * with wrong numbers. Callers applying an incremental update — where a
     * container may have been resized through the API and its label would
     * otherwise keep the old line breaks — pass `true`.
     */
    refreshDimensions?: boolean
  } = {}
): ExcalidrawElement[] => {
  if (!Array.isArray(elements)) throw new Error('Expected a scene element array')
  const ids = new Set<string>()
  for (const element of elements) {
    if (!element || typeof element.id !== 'string' || !element.id ||
        typeof element.type !== 'string' || ids.has(element.id)) {
      throw new Error('Scene contains an invalid or duplicate element ID')
    }
    ids.add(element.id)
    if (!Number.isFinite(element.x) || !Number.isFinite(element.y) ||
        (element.width !== undefined && !Number.isFinite(element.width)) ||
        (element.height !== undefined && !Number.isFinite(element.height))) {
      throw new Error(`Scene contains invalid coordinates for ${element.id}`)
    }
  }

  const validated = validateAndFixBindings([...elements])
  // Native frames express membership through the children's frameId. The
  // skeleton converter instead requires frame.children and recalculates bounds.
  const skeletons = withStableLabelIds(
    validated.filter(el => !isFrame(el) && !isImageElement(el) && !isFreedrawElement(el))
  )
  const converted = preserveCallerGeometry(
    restoreBindings(
      convertToExcalidrawElements(skeletons as any, { regenerateIds: false }),
      skeletons
    ),
    skeletons
  )
  const convertedById = new Map(converted.map(el => [el.id, el]))
  const generatedText = new Map<string, ExcalidrawElement[]>()
  for (const element of converted) {
    if (!ids.has(element.id) && element.type === 'text' && element.containerId) {
      const siblings = generatedText.get(element.containerId) || []
      siblings.push(element)
      generatedText.set(element.containerId, siblings)
    }
  }

  // Preserve the original stacking order, including interleaved frames, images
  // and freehand strokes. Newly expanded labels sit beside their container.
  const ordered = bindArrowsToFrames(validated.flatMap(element => {
    const next = isFrame(element) ? element
      : isImageElement(element) ? normalizeImageElement(element)
      : isFreedrawElement(element) ? normalizeFreedrawElement(element)
      : convertedById.get(element.id)
    if (!next) throw new Error(`Scene conversion lost element ${element.id}`)
    return [next, ...(generatedText.get(element.id!) || [])]
  }), validated)
  // Excalidraw's `refreshTextDimensions` re-wraps `element.text`, not
  // `originalText` — and `text` already carries the line breaks computed for the
  // previous container size, as real newlines. Wrapping an already-wrapped
  // string can never undo those breaks, so `refreshDimensions` on its own
  // cannot re-flow a label after its container is resized. Feeding the label
  // its unwrapped source first is what makes the re-flow actually happen.
  const reflowed = opts.refreshDimensions
    ? ordered.map(element => {
        const label = element as Partial<ExcalidrawElement> & {
          containerId?: string | null
          originalText?: string
        }
        return label?.containerId && typeof label.originalText === 'string'
          ? { ...element, text: label.originalText }
          : element
      })
    : ordered

  // Fork (T-024): restoreElements drops an elbowed arrow's binding that has no fixed point, which
  // is what an older export or an agent's arrow carries; give it the one its end implies first.
  const restored = restoreElements(
    fillElbowFixedPoints(recenterBoundShapeTextElements(reflowed)) as ExcalidrawElement[],
    null,
    { repairBindings: true, refreshDimensions: opts.refreshDimensions ?? false }
  )
  assertScenePreserved(elements, restored)
  return restored
}

/**
 * The tab's scene with server changes merged in: an element on both sides
 * takes the incoming fields over the tab's copy, a new one goes on top, and
 * a removed id is dropped. Unchanged elements are the tab's own objects.
 */
export const mergeSceneElements = (
  current: readonly Partial<ExcalidrawElement>[],
  changed: readonly Partial<ExcalidrawElement>[],
  removedIds: readonly string[] = []
): Partial<ExcalidrawElement>[] => {
  const removed = new Set(removedIds)
  const incomingById = new Map<string, Partial<ExcalidrawElement>>()
  for (const element of changed) {
    if (element.id) incomingById.set(element.id, element)
  }
  const merged: Partial<ExcalidrawElement>[] = []
  for (const element of current) {
    if (removed.has(element.id!)) continue
    const incoming = incomingById.get(element.id!)
    if (!incoming) {
      merged.push(element)
      continue
    }
    incomingById.delete(element.id!)
    merged.push({ ...element, ...incoming })
  }
  for (const element of incomingById.values()) {
    if (!removed.has(element.id!)) merged.push(element)
  }
  return merged
}

// Every id an element points at: its bound text and arrows, its container,
// its arrow ends, its frame.
const referencedIds = (element: any): string[] => {
  const ids: string[] = []
  if (Array.isArray(element.boundElements)) {
    for (const binding of element.boundElements) if (typeof binding?.id === 'string') ids.push(binding.id)
  }
  for (const id of [
    element.containerId, element.frameId, element.startBinding?.elementId, element.endBinding?.elementId,
    element.start?.id, element.end?.id, element.label?.id
  ]) {
    if (typeof id === 'string') ids.push(id)
  }
  return ids
}

/**
 * Fork (T-029, T-030): the scene after an incremental server change, preparing
 * only what the change touches. `prepareServerScene` over the whole drawing
 * re-measured every label for each agent edit (88 ms per edit, 5 s for a burst
 * of 60, on a 1713-element drawing), and its fresh copy of every element left
 * a stroke the person was drawing pointing at an object no longer in the scene.
 *
 * Prepared: each changed element and its neighbours (whatever it points at or
 * is pointed at by), so a resized shape's label re-flows and a removed
 * element's bindings are dropped. Their own neighbours go in as context, so a
 * binding is never stripped for lack of its target, and are then discarded.
 * Everything else is returned as the very object the tab holds.
 *
 * Throws when the result would lose or duplicate an element; the caller then
 * falls back to preparing the whole scene.
 */
export const prepareSceneUpdate = (
  current: readonly Partial<ExcalidrawElement>[],
  changed: readonly Partial<ExcalidrawElement>[],
  removedIds: readonly string[] = [],
  opts: { refreshDimensions?: boolean } = {}
): ExcalidrawElement[] => {
  const merged = mergeSceneElements(current, changed, removedIds)
  const byId = new Map(merged.map(el => [el.id!, el]))
  if (byId.size !== merged.length) throw new Error('Scene holds duplicate element IDs')

  const pointedAtBy = new Map<string, Set<string>>()
  for (const element of merged) {
    for (const id of referencedIds(element)) {
      let set = pointedAtBy.get(id)
      if (!set) pointedAtBy.set(id, set = new Set())
      set.add(element.id!)
    }
  }
  const neighbours = (ids: Iterable<string>): Set<string> => {
    const out = new Set<string>()
    for (const id of ids) {
      const element = byId.get(id)
      if (element) for (const ref of referencedIds(element)) if (byId.has(ref)) out.add(ref)
      for (const ref of pointedAtBy.get(id) || []) out.add(ref)
    }
    return out
  }

  // A removed id is not in the scene, but whatever pointed at it must be
  // prepared again so the dangling binding is dropped.
  const seeds = new Set<string>()
  for (const element of changed) if (element.id && byId.has(element.id)) seeds.add(element.id)
  for (const id of removedIds) for (const ref of pointedAtBy.get(id) || []) seeds.add(ref)

  const touched = new Set([...seeds, ...neighbours(seeds)])
  const withContext = new Set([...touched, ...neighbours(touched)])
  const subset = merged.filter(el => withContext.has(el.id!))
  const prepared = subset.length > 0 ? prepareServerScene(subset, opts) : []

  const subsetIds = new Set(subset.map(el => el.id!))
  const preparedById = new Map<string, ExcalidrawElement>()
  const generatedFor = new Map<string, ExcalidrawElement[]>()
  for (const element of prepared) {
    if (subsetIds.has(element.id)) {
      preparedById.set(element.id, element)
      continue
    }
    // A label the converter expanded from shorthand sits on top of its container.
    const containerId = (element as { containerId?: string | null }).containerId
    if (containerId && touched.has(containerId)) {
      generatedFor.set(containerId, [...(generatedFor.get(containerId) || []), element])
    }
  }

  const result: ExcalidrawElement[] = []
  for (const element of merged) {
    if (!touched.has(element.id!)) {
      result.push(element as ExcalidrawElement)
      continue
    }
    const next = preparedById.get(element.id!)
    if (!next) throw new Error(`Scene update lost element ${element.id}`)
    result.push(next, ...(generatedFor.get(element.id!) || []))
  }
  const resultIds = new Set(result.map(el => el.id))
  if (resultIds.size !== result.length) throw new Error('Scene update produced duplicate element IDs')
  return result
}

// Fork (T-023): which server process, drawing and revision a tab's scene came from.
export interface CanvasIdentity {
  instanceId: string
  sceneId: string
  rev: number
}

/**
 * The scene a tab sends back to a server that restarted under it: what the tab
 * holds, plus what only the server holds. On an id both hold the tab's copy wins,
 * unless the server changed it after the tab last heard from it — knowable only
 * when the server came back with the same drawing (`sameScene`), since revisions
 * count within one drawing. An element the tab deleted stays deleted on the same
 * terms. Deleted elements of `held` are tombstones, kept by Excalidraw.
 */
export const mergeAfterRestart = (
  held: readonly Partial<ExcalidrawElement>[],
  server: readonly ServerElement[],
  opts: { sameScene: boolean; seenRev: number }
): Partial<ExcalidrawElement>[] => {
  const serverById = new Map(server.map(el => [el.id, el]))
  const heldIds = new Set(held.map(el => el.id))
  const changedSince = (el: ServerElement | undefined): el is ServerElement =>
    !!el && opts.sameScene && typeof el.rev === 'number' && el.rev > opts.seenRev
  const merged: Partial<ExcalidrawElement>[] = []
  for (const element of held) {
    const theirs = serverById.get(element.id!)
    if (changedSince(theirs)) merged.push(cleanElementForExcalidraw(theirs))
    else if (!element.isDeleted) merged.push(element)
  }
  for (const element of server) {
    if (!heldIds.has(element.id)) merged.push(cleanElementForExcalidraw(element))
  }
  return merged
}
