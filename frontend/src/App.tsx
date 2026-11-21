import React, { useState, useEffect, useRef } from 'react'
import {
  Excalidraw,
  convertToExcalidrawElements,
  CaptureUpdateAction,
  exportToBlob,
  exportToSvg,
  elementsOverlappingBBox,
  hashElementsVersion,
  useHandleLibrary
} from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type {
  LibraryPersistedData,
  LibraryPersistenceAdapter
} from '@excalidraw/excalidraw/data/library'
import { convertMermaidToExcalidraw, DEFAULT_MERMAID_CONFIG } from './utils/mermaidConverter'
import {
  cleanElementForExcalidraw, prepareServerScene, prepareSceneUpdate, mergeSceneElements, assertScenePreserved,
  mergeAfterRestart
} from './utils/scene'
import { preloadCanvasFonts } from './utils/fonts'
// Fork (ADR-007 option 3): the header's Send button draws the tick a person would
import { SEND_BOX_ID, sendTick } from '../../src/core/send-tick'
import type { ServerElement, CanvasIdentity } from './utils/scene'
import type { MermaidConfig } from '@excalidraw/mermaid-to-excalidraw'

const LIBRARY_STORAGE_KEY = 'excalidraw-canvas-library'

/**
 * Persists the user's library in this browser.
 *
 * The scene belongs to the canvas server, but the library is not scene data — it is a
 * user asset: shapes they added themselves, or a pack they installed from
 * libraries.excalidraw.com. Without an adapter the library panel resets to empty
 * on every reload, which makes it useless, and `useHandleLibrary` below needs one
 * to accept installs in the first place.
 */
const libraryAdapter: LibraryPersistenceAdapter = {
  load: () => {
    try {
      const raw = window.localStorage?.getItem(LIBRARY_STORAGE_KEY)
      return raw ? { libraryItems: JSON.parse(raw) } : null
    } catch (error) {
      console.warn('Failed to read library from localStorage:', error)
      return null
    }
  },
  save: (data: LibraryPersistedData) => {
    try {
      window.localStorage?.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(data.libraryItems))
    } catch (error) {
      // Most likely the 5MB quota, which a large icon pack can exceed. The
      // library stays usable for this session; it just will not survive reload.
      console.warn('Failed to save library to localStorage:', error)
    }
  }
}

/**
 * Takes an element link (`?element=<id>`) out of the URL before Excalidraw mounts.
 *
 * Excalidraw resolves the link once, while it mounts. Here the scene comes from
 * the server after that, so the lookup always runs on an empty scene and shows
 * "Linked object wasn't found". The link is resolved after the first scene loads.
 */
const takeElementLink = (): string | null => {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('element')) return null
  const link = url.href
  url.searchParams.delete('element')
  window.history.replaceState(window.history.state, '', url)
  return link
}
let pendingElementLink = typeof window === 'undefined' ? null : takeElementLink()

// Type definitions
type ExcalidrawAPIRefValue = ExcalidrawImperativeAPI;

interface ExportImageOptions {
  background?: boolean;
  dark?: boolean;
  scale?: number;
  padding?: number;
  elementIds?: string[];
  frameId?: string;
  embedScene?: boolean;
}

interface WebSocketMessage {
  type: string;
  format?: 'png' | 'svg';
  background?: boolean;
  options?: ExportImageOptions;
  element?: ServerElement;
  elements?: ServerElement[];
  elementId?: string;
  count?: number;
  timestamp?: string;
  source?: string;
  mermaidDiagram?: string;
  config?: MermaidConfig;
  requestId?: string;
  scrollToContent?: boolean;
  scrollToElementId?: string;
  scrollToElementIds?: string[];
  viewportZoomFactor?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  // Fork (T-023): `rev` rides on every message; the identity on initial_elements
  rev?: number;
  instanceId?: string;
  sceneId?: string;
}

interface ApiResponse {
  success: boolean;
  elements?: ServerElement[];
  element?: ServerElement;
  files?: Record<string, unknown>;
  count?: number;
  error?: string;
  message?: string;
  // Fork (T-023): GET /api/elements says which server and drawing; a sync says the revision
  rev?: number;
  instanceId?: string;
  sceneId?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
type SceneLoadStatus = 'loading' | 'ready' | 'failed';
const AUTO_SYNC_DEBOUNCE_MS = 1200;
const SCENE_MUTATIONS = new Set([
  'element_created', 'element_updated', 'element_deleted', 'elements_batch_created'
]);
// Excalidraw hides its theme toggle once the theme prop is set.
const UI_OPTIONS = { canvasActions: { toggleTheme: true } };

function App(): JSX.Element {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPIRefValue | null>(null)
  // Ref so WS message handlers (captured in stale closures) always see the latest API instance
  const excalidrawAPIRef = useRef<ExcalidrawAPIRefValue | null>(null)
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI
  }, [excalidrawAPI])

  // Handles the `#addLibrary=...` callback that libraries.excalidraw.com sends
  // back after "Add to Excalidraw", and loads/saves the library through the
  // adapter above. Without this hook the Browse-libraries button opens the site
  // and correctly points it back here, but nothing receives what it returns —
  // the install silently does nothing.
  useHandleLibrary({ excalidrawAPI, adapter: libraryAdapter })
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const saved = window.localStorage?.getItem('excalidraw-canvas-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error)
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Sync state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  // Fork (ADR-007 option 3): the button shows only on a scene with the legend's Send box
  const [hasSendBox, setHasSendBox] = useState<boolean>(false)
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncInFlightRef = useRef<boolean>(false)
  const suppressAutoSyncCountRef = useRef<number>(0)
  const userInteractedRef = useRef<boolean>(false)
  // Version hash of the scene the server holds. Excalidraw calls onChange on
  // every re-render, including the one each sync causes, so autosync only
  // runs when the scene differs from this.
  const serverSceneHashRef = useRef<number | null>(null)
  // Image files the server already holds, so each sync uploads only new ones
  const serverFileIdsRef = useRef<Set<string>>(new Set())
  const lastReportedSelectionRef = useRef<string>('')
  const rememberServerFiles = (files: unknown): void => {
    const list = Array.isArray(files) ? files : Object.values((files as Record<string, unknown>) || {})
    for (const file of list as { id?: unknown }[]) {
      if (typeof file?.id === 'string') serverFileIdsRef.current.add(file.id)
    }
  }
  const [sceneLoadStatus, setSceneLoadStatus] = useState<SceneLoadStatus>('loading')
  const sceneLoadStatusRef = useRef<SceneLoadStatus>('loading')
  const sceneGenerationRef = useRef(0)

  const pauseSceneSync = (status: SceneLoadStatus = 'loading'): number => {
    sceneGenerationRef.current += 1
    sceneLoadStatusRef.current = status
    setSceneLoadStatus(status)
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }
    return sceneGenerationRef.current
  }

  const failSceneLoad = (error: unknown, generation = sceneGenerationRef.current): void => {
    if (generation !== sceneGenerationRef.current) return
    console.error('Scene load failed; backend sync is paused:', error)
    pauseSceneSync('failed')
  }

  const canSyncScene = (): boolean =>
    sceneLoadStatusRef.current === 'ready' && websocketRef.current?.readyState === WebSocket.OPEN

  const applySceneUpdateWithoutAutoSync = (
    api: ExcalidrawImperativeAPI,
    scene: Parameters<ExcalidrawImperativeAPI['updateScene']>[0]
  ): void => {
    suppressAutoSyncCountRef.current += 1
    try {
      api.updateScene(scene)
    } finally {
      setTimeout(() => {
        suppressAutoSyncCountRef.current = Math.max(0, suppressAutoSyncCountRef.current - 1)
      }, 0)
    }
  }

  const applyServerScene = (
    incoming: readonly Partial<ExcalidrawElement>[],
    generation: number,
    files?: Record<string, unknown>,
    opts: { refreshDimensions?: boolean } = {}
  ): void => {
    const api = excalidrawAPIRef.current
    if (!api || generation !== sceneGenerationRef.current) return
    // Prepare everything before replacing the visible scene. restoreElements()
    // can silently filter elements, so both conversion and API readback need checks.
    const prepared = prepareServerScene(incoming, opts)
    const previous = api.getSceneElementsIncludingDeleted()
    try {
      if (files) {
        api.addFiles(Object.values(files) as Parameters<typeof api.addFiles>[0])
        rememberServerFiles(files)
      }
      applySceneUpdateWithoutAutoSync(api, { elements: prepared, captureUpdate: CaptureUpdateAction.NEVER })
      assertScenePreserved(prepared, api.getSceneElements())
      serverSceneHashRef.current = hashElementsVersion(api.getSceneElements())
    } catch (error) {
      applySceneUpdateWithoutAutoSync(api, { elements: previous, captureUpdate: CaptureUpdateAction.NEVER })
      throw error
    }
    sceneLoadStatusRef.current = 'ready'
    setSceneLoadStatus('ready')
    if (pendingElementLink) {
      const link = pendingElementLink
      pendingElementLink = null
      // Put the link back so the address bar still shows it
      window.history.replaceState(window.history.state, '', link)
      api.scrollToContent(link, { animate: false })
    }
  }

  // Fork (T-029, T-030): an agent's create, update or delete, applied to what the
  // tab holds. Only the touched elements and their neighbours are prepared, so a
  // large drawing costs no more per edit than a small one. The scene stays
  // editable throughout: no pauseSceneSync, whose read-only flip cancelled a
  // stroke the person was drawing, and every untouched element keeps its
  // object, so the stroke in progress stays in the scene. The generation still
  // moves on, so a full load fetched before this edit cannot overwrite it.
  // `refreshDimensions` re-wraps a resized container's label from its
  // `originalText`; without it the shape grows and the text keeps its old breaks.
  const applyServerUpdate = (
    changed: Partial<ExcalidrawElement>[],
    removedIds: string[] = []
  ): void => {
    const api = excalidrawAPIRef.current
    if (!api || (changed.length === 0 && removedIds.length === 0)) return
    const current = api.getSceneElements()
    let next: ExcalidrawElement[]
    try {
      next = prepareSceneUpdate(current, changed, removedIds, { refreshDimensions: true })
    } catch (error) {
      console.warn('Incremental scene update failed; preparing the whole scene instead:', error)
      applyServerScene(mergeSceneElements(current, changed, removedIds), pauseSceneSync(), undefined,
        { refreshDimensions: true })
      return
    }
    sceneGenerationRef.current += 1
    const previous = api.getSceneElementsIncludingDeleted()
    try {
      applySceneUpdateWithoutAutoSync(api, { elements: next, captureUpdate: CaptureUpdateAction.NEVER })
      assertScenePreserved(next, api.getSceneElements())
      serverSceneHashRef.current = hashElementsVersion(api.getSceneElements())
    } catch (error) {
      // The tab no longer provably holds the server's scene: pause sync and
      // fetch the whole scene again rather than send back a partial one (T-014).
      applySceneUpdateWithoutAutoSync(api, { elements: previous, captureUpdate: CaptureUpdateAction.NEVER })
      console.error('Scene update did not apply; reloading the scene:', error)
      void loadExistingElements()
    }
  }

  // Fork (T-023): the server process, drawing and revision this tab's scene came
  // from, and whether they describe the server the socket reaches now (they do not
  // between a drop and the first scene of the next connection).
  const serverIdentityRef = useRef<CanvasIdentity | null>(null)
  const identityCurrentRef = useRef<boolean>(false)

  const noteServerRev = (rev: unknown): void => {
    if (identityCurrentRef.current && serverIdentityRef.current && typeof rev === 'number') {
      serverIdentityRef.current.rev = rev
    }
  }

  // Every full scene from the server comes through here. A tab that outlived its
  // server (a crash, a reboot, a stop and start) holds a drawing the new process may
  // have lost: all of it when it came back empty, the last moments when it came back
  // from disk. Loading the server's scene would wipe the tab's copy, then the only
  // one (T-023). So after a restart the tab keeps its scene, takes in what only the
  // server holds, and sends the union back. A sync deletes whatever it leaves out
  // (T-014, KI-7), which is why nothing the server holds is left out of the union.
  const adoptServerScene = async (
    incoming: readonly ServerElement[],
    identity: Partial<CanvasIdentity>,
    generation: number,
    files?: Record<string, unknown>
  ): Promise<void> => {
    const api = excalidrawAPIRef.current
    if (!api || generation !== sceneGenerationRef.current) return
    const known = serverIdentityRef.current
    const restarted = known !== null && typeof identity.instanceId === 'string' &&
      identity.instanceId !== known.instanceId
    // The files the old process held are not this one's: upload whatever it lacks
    if (restarted) serverFileIdsRef.current.clear()
    const held = api.getSceneElementsIncludingDeleted()
    const keepTab = restarted && held.some(el => !el.isDeleted)
    const scene = keepTab && known
      ? mergeAfterRestart(held, incoming, { sameScene: identity.sceneId === known.sceneId, seenRev: known.rev })
      : incoming.map(cleanElementForExcalidraw)
    applyServerScene(scene, generation, files)
    serverIdentityRef.current = typeof identity.instanceId === 'string' && typeof identity.sceneId === 'string'
      ? { instanceId: identity.instanceId, sceneId: identity.sceneId, rev: typeof identity.rev === 'number' ? identity.rev : 0 }
      : null
    identityCurrentRef.current = true
    if (keepTab) {
      console.warn(`The canvas server restarted under this tab; sending the tab's ${scene.length} elements back to it`)
      await syncToBackend()
    }
  }

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current)
      }
    }
  }, [])

  // The first scene waits for the Latin fonts (preloadCanvasFonts). Fonts
  // that arrive later, such as CJK subsets or a preload that timed out, find
  // text already measured with a fallback font, which leaves it clipped.
  // Excalidraw itself only redraws then, so re-measure once fonts load.
  useEffect(() => {
    const fontSet = document.fonts
    if (!fontSet?.addEventListener) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const remeasureText = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const api = excalidrawAPIRef.current
        if (!api || sceneLoadStatusRef.current !== 'ready') return
        const current = api.getSceneElements()
        if (!current.some(el => el.type === 'text')) return
        try {
          applyServerScene(current, sceneGenerationRef.current, undefined, { refreshDimensions: true })
        } catch (error) {
          console.warn('Could not re-measure text after fonts loaded:', error)
        }
      }, 50)
    }
    fontSet.addEventListener('loadingdone', remeasureText)
    return () => {
      fontSet.removeEventListener('loadingdone', remeasureText)
      clearTimeout(timer)
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    connectWebSocket()
    return () => {
      sceneGenerationRef.current += 1
      sceneLoadStatusRef.current = 'loading'
      const socket = websocketRef.current
      websocketRef.current = null
      socket?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [])

  // Load existing elements when Excalidraw API becomes available
  useEffect(() => {
    if (excalidrawAPI) {
      // initial_elements may arrive before the API exists. HTTP is the fallback;
      // later WebSocket scenes invalidate this request through its generation.
      if (sceneLoadStatusRef.current !== 'ready') void loadExistingElements()
    }
  }, [excalidrawAPI])

  const loadExistingElements = async (): Promise<void> => {
    if (!excalidrawAPIRef.current) return
    const generation = pauseSceneSync()
    try {
      const response = await fetch('/api/elements', { signal: AbortSignal.timeout(10000) })
      const result: ApiResponse = await response.json()
      if (generation !== sceneGenerationRef.current) return
      if (!response.ok || !result.success || !Array.isArray(result.elements)) {
        throw new Error(result.error || 'Invalid scene response')
      }
      const filesResponse = await fetch('/api/files', { signal: AbortSignal.timeout(10000) })
      const filesResult = await filesResponse.json() as ApiResponse
      if (generation !== sceneGenerationRef.current) return
      if (!filesResponse.ok || !filesResult.files) {
        throw new Error('Could not load scene files')
      }
      await preloadCanvasFonts()
      if (generation !== sceneGenerationRef.current) return
      await adoptServerScene(result.elements, result, generation, filesResult.files)
    } catch (error) {
      failSceneLoad(error, generation)
    }
  }

  const connectWebSocket = (): void => {
    // Guard CONNECTING too: the mount effect and the excalidrawAPI effect can
    // both run before the first socket opens, orphaning a live duplicate
    // connection whose handlers then process every broadcast twice.
    if (websocketRef.current &&
        (websocketRef.current.readyState === WebSocket.CONNECTING ||
         websocketRef.current.readyState === WebSocket.OPEN)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`

    const socket = new WebSocket(wsUrl)
    websocketRef.current = socket

    socket.onopen = () => {
      if (websocketRef.current !== socket) return
      setIsConnected(true)
      // A tab that already holds a server's scene takes the next one from this
      // connection's initial_elements alone: a full load racing it could see the
      // restart, merge and send twice (T-023).
      if (!serverIdentityRef.current) void loadExistingElements()
    }

    socket.onmessage = (event: MessageEvent) => {
      if (websocketRef.current !== socket) return
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        void handleWebSocketMessage(data)
      } catch (error) {
        failSceneLoad(error)
      }
    }

    socket.onclose = (event: CloseEvent) => {
      if (websocketRef.current !== socket) return
      setIsConnected(false)
      identityCurrentRef.current = false
      pauseSceneSync()

      // Reconnect after 3 seconds if not a clean close
      if (event.code !== 1000) {
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000)
      }
    }

    socket.onerror = (error: Event) => {
      if (websocketRef.current !== socket) return
      console.error('WebSocket error:', error)
      setIsConnected(false)
      pauseSceneSync()
    }
  }

  const handleWebSocketMessage = async (data: WebSocketMessage): Promise<void> => {
    const excalidrawAPI = excalidrawAPIRef.current
    if (!excalidrawAPI) {
      return
    }
    if (data.type !== 'initial_elements') noteServerRev(data.rev)

    if (SCENE_MUTATIONS.has(data.type) && sceneLoadStatusRef.current !== 'ready') {
      // An incremental event cannot prove that a failed or pending full load
      // was complete. Fetch the current full scene instead of reopening sync.
      void loadExistingElements()
      return
    }

    try {
      switch (data.type) {
        case 'initial_elements':
          {
            const generation = pauseSceneSync()
            if (!Array.isArray(data.elements)) throw new Error('Invalid initial scene')
            // Measure the first scene with the real fonts, not a fallback
            await preloadCanvasFonts()
            if (generation !== sceneGenerationRef.current) return
            await adoptServerScene(data.elements, data, generation, (data as any).files)
          }
          break

        case 'files_added':
          if (Array.isArray((data as any).files)) {
            excalidrawAPI.addFiles((data as any).files)
            rememberServerFiles((data as any).files)
          }
          break

        case 'file_deleted':
          // Upload it again if an image on the canvas still uses it
          if (typeof (data as any).fileId === 'string') {
            serverFileIdsRef.current.delete((data as any).fileId)
          }
          break

        case 'element_created':
          if (!data.element) throw new Error('Missing created element')
          if (data.element) {
            applyServerUpdate([cleanElementForExcalidraw(data.element)])
          }
          break

        case 'element_updated':
          if (!data.element) throw new Error('Missing updated element')
          if (data.element) {
            applyServerUpdate([cleanElementForExcalidraw(data.element)])
          }
          break

        case 'element_deleted':
          if (!data.elementId) throw new Error('Missing deleted element ID')
          if (data.elementId) {
            applyServerUpdate([], [data.elementId])
          }
          break

        case 'elements_batch_created':
          if (!Array.isArray(data.elements)) throw new Error('Invalid element batch')
          if (data.elements) {
            applyServerUpdate(data.elements.map(cleanElementForExcalidraw))
          }
          break

        case 'elements_synced':
          console.log(`Sync confirmed by server: ${data.count} elements`)
          // Sync confirmation already handled by HTTP response
          break

        case 'sync_status':
          console.log(`Server sync status: ${data.count} elements`)
          break

        case 'canvas_cleared':
          console.log('Canvas cleared by server')
          applyServerScene([], pauseSceneSync())
          break

        case 'export_image_request':
          if (data.requestId) {
            try {
              if (!canSyncScene()) throw new Error('Scene is not fully loaded; export is paused')
              // Same option surface as the headless renderer (renderer:'node'),
              // so `--renderer browser` accepts identical flags.
              const opts = data.options ?? {}
              const embedScene = opts.embedScene === true
              if (embedScene && data.format !== 'png') throw new Error('embedScene is only supported for PNG exports')
              const allElements = excalidrawAPI.getSceneElements()
              const wanted = opts.elementIds ? new Set(opts.elementIds) : null
              const elements = wanted
                ? allElements.filter(el => wanted.has(el.id) || (el.type === 'text' && (el as any).containerId && wanted.has((el as any).containerId)))
                : allElements
              const exportingFrame = opts.frameId
                ? (allElements.find(el => el.id === opts.frameId && (el.type === 'frame' || el.type === 'magicframe')) as any) ?? null
                : null
              if (opts.frameId && !exportingFrame) throw new Error(`Unknown frame id: ${opts.frameId}`)
              let exportElements = embedScene && exportingFrame
                ? elementsOverlappingBBox({ elements, bounds: exportingFrame, type: 'overlap' })
                  .filter((el: ExcalidrawElement) => !el.frameId || el.frameId === exportingFrame.id)
                : elements
              if (embedScene) {
                const exportedIds = new Set(exportElements.map((el: ExcalidrawElement) => el.id))
                exportElements = exportElements.map((el: ExcalidrawElement) =>
                  el.frameId && !exportedIds.has(el.frameId) ? { ...el, frameId: null } : el)
              }
              const appState = excalidrawAPI.getAppState()
              const exportAppState = {
                ...appState,
                exportBackground: data.background !== false,
                exportEmbedScene: embedScene,
                ...(opts.dark !== undefined ? { exportWithDarkMode: opts.dark } : {}),
                exportScale: opts.scale ?? 1
              }
              const files = excalidrawAPI.getFiles()

              if (data.format === 'svg') {
                const svg = await exportToSvg({
                  elements,
                  appState: exportAppState,
                  files,
                  exportPadding: opts.padding,
                  exportingFrame
                })
                const svgString = new XMLSerializer().serializeToString(svg)
                await fetch('/api/export/image/result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    requestId: data.requestId,
                    format: 'svg',
                    data: svgString
                  })
                })
              } else {
                const blob = await exportToBlob({
                  elements: exportElements,
                  appState: exportAppState,
                  files,
                  mimeType: 'image/png',
                  exportPadding: opts.padding,
                  exportingFrame
                })
                const reader = new FileReader()
                reader.onload = async () => {
                  try {
                    const resultString = reader.result as string
                    const base64 = resultString?.split(',')[1]
                    if (!base64) {
                      throw new Error('Could not extract base64 data from result')
                    }
                    await fetch('/api/export/image/result', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        requestId: data.requestId,
                        format: 'png',
                        data: base64
                      })
                    })
                  } catch (readerError) {
                    console.error('Image export (FileReader) failed:', readerError)
                    await fetch('/api/export/image/result', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        requestId: data.requestId,
                        error: (readerError as Error).message
                      })
                    }).catch(() => { })
                  }
                }
                reader.onerror = async () => {
                  console.error('FileReader error:', reader.error)
                  await fetch('/api/export/image/result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      requestId: data.requestId,
                      error: reader.error?.message || 'FileReader failed'
                    })
                  }).catch(() => { })
                }
                reader.readAsDataURL(blob)
              }
            } catch (exportError) {
              console.error('Image export failed:', exportError)
              await fetch('/api/export/image/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requestId: data.requestId,
                  error: (exportError as Error).message
                })
              })
            }
          }
          break

        case 'set_viewport':
          console.log('Received viewport control request', data)
          if (data.requestId) {
            try {
              if (data.scrollToContent) {
                const allElements = excalidrawAPI.getSceneElements()
                if (allElements.length > 0) {
                  excalidrawAPI.scrollToContent(allElements, {
                    fitToViewport: true,
                    viewportZoomFactor: data.viewportZoomFactor,
                    animate: true
                  })
                }
              } else if (data.scrollToElementIds !== undefined) {
                if (!Array.isArray(data.scrollToElementIds) ||
                    data.scrollToElementIds.length === 0 ||
                    !data.scrollToElementIds.every(id => typeof id === 'string' && id.length > 0)) {
                  throw new Error('scrollToElementIds must be a non-empty array of element IDs')
                }
                const allElements = excalidrawAPI.getSceneElements()
                const requestedIds = new Set(data.scrollToElementIds)
                const targetElements = allElements.filter(el => requestedIds.has(el.id))
                const foundIds = new Set(targetElements.map(el => el.id))
                const missingIds = data.scrollToElementIds.filter(id => !foundIds.has(id))
                if (missingIds.length > 0) {
                  throw new Error(`Elements not found for IDs: ${missingIds.join(', ')}`)
                }
                excalidrawAPI.scrollToContent(targetElements, {
                  fitToViewport: true,
                  viewportZoomFactor: data.viewportZoomFactor,
                  animate: true
                })
              } else if (data.scrollToElementId) {
                const allElements = excalidrawAPI.getSceneElements()
                const targetElement = allElements.find(el => el.id === data.scrollToElementId)
                if (targetElement) {
                  excalidrawAPI.scrollToContent([targetElement], { fitToViewport: false, animate: true })
                } else {
                  throw new Error(`Element ${data.scrollToElementId} not found`)
                }
              } else {
                // Direct zoom/scroll control
                const appState: any = {}
                if (data.zoom !== undefined) {
                  appState.zoom = { value: data.zoom }
                }
                if (data.offsetX !== undefined) {
                  appState.scrollX = data.offsetX
                }
                if (data.offsetY !== undefined) {
                  appState.scrollY = data.offsetY
                }
                if (Object.keys(appState).length > 0) {
                  applySceneUpdateWithoutAutoSync(excalidrawAPI, { appState })
                }
              }

              await fetch('/api/viewport/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requestId: data.requestId,
                  success: true,
                  message: 'Viewport updated'
                })
              })
            } catch (viewportError) {
              console.error('Viewport control failed:', viewportError)
              await fetch('/api/viewport/result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requestId: data.requestId,
                  error: (viewportError as Error).message
                })
              }).catch(() => { })
            }
          }
          break

        case 'mermaid_convert':
          console.log('Received Mermaid conversion request from MCP')
          if (data.mermaidDiagram) {
            try {
              if (!canSyncScene()) throw new Error('Scene is not fully loaded; Mermaid import is paused')
              const generation = sceneGenerationRef.current
              const result = await convertMermaidToExcalidraw(data.mermaidDiagram, data.config || DEFAULT_MERMAID_CONFIG)
              if (!canSyncScene() || generation !== sceneGenerationRef.current) return

              if (result.error) {
                console.error('Mermaid conversion error:', result.error)
                return
              }

              if (result.elements && result.elements.length > 0) {
                // Regenerate ids so repeated conversions of the same diagram
                // (mermaid emits stable ids like "A", "B") can't collide with
                // elements already on the canvas.
                const convertedElements = convertToExcalidrawElements([...result.elements] as Parameters<typeof convertToExcalidrawElements>[0], { regenerateIds: true })
                // Merge with the existing scene — updateScene() replaces the
                // element list wholesale, and syncToBackend() would otherwise
                // propagate that wipe to the server.
                applySceneUpdateWithoutAutoSync(excalidrawAPI, {
                  elements: [...excalidrawAPI.getSceneElements(), ...convertedElements],
                  captureUpdate: CaptureUpdateAction.IMMEDIATELY
                })

                if (result.files) {
                  excalidrawAPI.addFiles(Object.values(result.files))
                }

                console.log('Mermaid diagram converted successfully:', result.elements.length, 'elements')

                // Sync to backend automatically after creating elements
                await syncToBackend()
              }
            } catch (error) {
              console.error('Error converting Mermaid diagram from WebSocket:', error)
            }
          }
          break

        default:
          console.log('Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error, data)
      if (data.type === 'initial_elements' || data.type === 'canvas_cleared' || SCENE_MUTATIONS.has(data.type)) {
        failSceneLoad(error)
      }
    }
  }

  // Data format conversion for backend
  const convertToBackendFormat = (element: ExcalidrawElement): ServerElement => {
    return {
      ...element
    } as ServerElement
  }

  // Format sync time display
  const formatSyncTime = (time: Date | null): string => {
    if (!time) return ''
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Main sync function
  // Resolves true once the server holds the scene (fork: the Send button needs to know).
  const syncToBackend = async (options: { silent?: boolean } = {}): Promise<boolean> => {
    const { silent = false } = options
    // Every caller, including manual sync and Mermaid, must respect a failed
    // restore. A user interaction alone is not evidence of a complete scene.
    if (!canSyncScene()) return false

    // Read through the ref: WS message handlers attached at mount capture a
    // stale closure where the excalidrawAPI state is still null.
    const api = excalidrawAPIRef.current
    if (!api) {
      console.warn('Excalidraw API not available')
      return false
    }

    if (syncInFlightRef.current) {
      return false
    }

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }

    syncInFlightRef.current = true
    if (!silent) {
      setSyncStatus('syncing')
    }

    try {
      // 1. Get current elements
      const currentElements = api.getSceneElements()
      const syncedHash = hashElementsVersion(currentElements)
      console.log(`Syncing ${currentElements.length} elements to backend`)

      // Filter out deleted elements
      const activeElements = currentElements.filter(el => !el.isDeleted)

      // 2. Upload image files the server lacks, before the elements that use
      // them. An image element only holds a fileId; without the file the
      // server keeps a dangling reference and a reload shows a broken image.
      // One request per file keeps each body under the server's JSON limit.
      const usedFileIds = new Set(activeElements.flatMap(el =>
        el.type === 'image' && el.fileId ? [el.fileId as string] : []))
      const newFiles = Object.values(api.getFiles()).filter(file =>
        usedFileIds.has(file.id) && file.dataURL && !serverFileIdsRef.current.has(file.id))
      for (const file of newFiles) {
        const fileResponse = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [{
            id: file.id, dataURL: file.dataURL, mimeType: file.mimeType, created: file.created
          }] })
        })
        if (!fileResponse.ok) throw new Error(`Image upload failed: HTTP ${fileResponse.status}`)
        serverFileIdsRef.current.add(file.id)
      }

      // 3. Convert to backend format
      const backendElements = activeElements.map(convertToBackendFormat)

      // 4. Send to backend
      const response = await fetch('/api/elements/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: backendElements,
          timestamp: new Date().toISOString(),
          // The server refuses a sync that would empty a drawing unless told it
          // is meant. Deleted elements stay in the scene as tombstones, so a
          // tab that holds some is one where a person deleted what was there;
          // a tab that never loaded its scene holds none.
          allowEmpty: backendElements.length === 0 &&
            api.getSceneElementsIncludingDeleted().some(el => el.isDeleted)
        })
      })

      if (response.ok) {
        const result: ApiResponse = await response.json()
        noteServerRev(result.rev)
        serverSceneHashRef.current = syncedHash
        setLastSyncTime(new Date())
        console.log(`Sync successful: ${result.count} elements synced`)

        if (!silent) {
          setSyncStatus('success')
          // Reset status after 2 seconds
          setTimeout(() => setSyncStatus('idle'), 2000)
        }
        return true
      } else {
        const error: ApiResponse = await response.json()
        console.error('Sync failed:', error.error)
        if (!silent) {
          setSyncStatus('error')
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
      if (!silent) {
        setSyncStatus('error')
      }
    } finally {
      syncInFlightRef.current = false
    }
    return false
  }

  // Fork (ADR-007 option 3, SPEC-009): send the round. Draws a tick inside the legend's Send
  // box, as a person would by hand, and saves the scene through the ordinary sync, so the agent
  // sees a person's tick and nothing new. Every mark not yet saved goes in the same sync.
  const sendRound = async (): Promise<void> => {
    const api = excalidrawAPIRef.current
    if (!api || !canSyncScene() || sendStatus === 'sending') return
    const box = api.getSceneElements().find(el => el.id === SEND_BOX_ID)
    if (!box) return
    setSendStatus('sending')
    const [tick] = convertToExcalidrawElements(
      [sendTick(box, Date.now().toString(36)) as any], { regenerateIds: false })
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), tick],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    })
    // An auto-sync may be on its way out; wait for it rather than drop the tick.
    for (let i = 0; i < 100 && syncInFlightRef.current; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    const saved = await syncToBackend({ silent: true })
    setSendStatus(saved ? 'sent' : 'error')
    setTimeout(() => setSendStatus('idle'), saved ? 3000 : 5000)
  }

  const scheduleAutoSync = (): void => {
    if (!canSyncScene() || !excalidrawAPI) {
      return
    }
    if (!userInteractedRef.current) {
      return
    }
    if (suppressAutoSyncCountRef.current > 0) {
      return
    }
    if (hashElementsVersion(excalidrawAPI.getSceneElements()) === serverSceneHashRef.current) {
      return
    }
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
    }

    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null
      if (suppressAutoSyncCountRef.current > 0 || syncInFlightRef.current) {
        return
      }
      void syncToBackend({ silent: true })
    }, AUTO_SYNC_DEBOUNCE_MS)
  }

  const clearCanvas = async (): Promise<void> => {
    if (!canSyncScene()) return
    const generation = pauseSceneSync()
    try {
      const response = await fetch('/api/elements/clear', {
        method: 'DELETE', signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) throw new Error('Could not clear the saved canvas')
      // The server broadcasts canvas_cleared. HTTP is a fallback when that
      // message has not arrived; do not overwrite a newer WebSocket scene.
      if (generation === sceneGenerationRef.current) await loadExistingElements()
    } catch (error) {
      failSceneLoad(error, generation)
    }
  }

  return (
    <div className="app" data-theme={theme}>
      {/* Header */}
      <div className="header">
        <h1>Excalidraw Canvas</h1>
        <div className="controls">
          <div className="status">
            <div className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {/* Sync Controls */}
          <div className="sync-controls">
            <button
              className={`btn-primary ${syncStatus === 'syncing' ? 'btn-loading' : ''}`}
              onClick={() => void syncToBackend()}
              disabled={syncStatus === 'syncing' || !excalidrawAPI || !isConnected || sceneLoadStatus !== 'ready'}
            >
              {syncStatus === 'syncing' && <span className="spinner"></span>}
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync to Backend'}
            </button>

            {/* Sync Status */}
            <div className="sync-status">
              {syncStatus === 'success' && (
                <span className="sync-success">✅ Synced</span>
              )}
              {syncStatus === 'error' && (
                <span className="sync-error">❌ Sync Failed</span>
              )}
              {lastSyncTime && syncStatus === 'idle' && (
                <span className="sync-time">
                  Last sync: {formatSyncTime(lastSyncTime)}
                </span>
              )}
            </div>
          </div>

          {/* Fork (ADR-007 option 3): tick the legend's Send box for the person */}
          {hasSendBox && (
            <div className="sync-controls">
              <button
                className="btn-send"
                onClick={() => void sendRound()}
                disabled={sendStatus === 'sending' || !isConnected || sceneLoadStatus !== 'ready'}
                title="Tick the Send box: Claude reads your marks once you send them"
              >
                {sendStatus === 'sending' ? 'Sending...' : 'Send to Claude'}
              </button>
              <div className="sync-status" role="status">
                {sendStatus === 'sent' && <span className="sync-success">✅ Sent</span>}
                {sendStatus === 'error' && <span className="sync-error">❌ Not sent</span>}
              </div>
            </div>
          )}

          <button className="btn-secondary" onClick={clearCanvas} disabled={!isConnected || sceneLoadStatus !== 'ready'}>Clear Canvas</button>
        </div>
      </div>

      {sceneLoadStatus !== 'ready' && (
        <div className="scene-load-status" role={sceneLoadStatus === 'failed' ? 'alert' : 'status'}>
          <span>{sceneLoadStatus === 'failed'
            ? 'Canvas could not be loaded. Sync is paused to protect your saved scene.'
            : 'Loading canvas. Sync is paused until the scene is ready.'}</span>
          {sceneLoadStatus === 'failed' && (
            <button className="btn-secondary" onClick={() => void loadExistingElements()}>Retry loading</button>
          )}
        </div>
      )}

      {/* Canvas Container */}
      <div className="canvas-container">
        <div
          onPointerDownCapture={() => {
            userInteractedRef.current = true
          }}
          onKeyDownCapture={() => {
            userInteractedRef.current = true
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Excalidraw
            // Controlled: Excalidraw resets to light when an action result
            // omits the theme and no theme prop is set (e.g. copy element link).
            theme={theme}
            UIOptions={UI_OPTIONS}
            viewModeEnabled={sceneLoadStatus !== 'ready'}
            excalidrawAPI={(api: ExcalidrawAPIRefValue) => setExcalidrawAPI(api)}
            onChange={(_elements, appState) => {
              if (appState?.theme && appState.theme !== theme) {
                setTheme(appState.theme)
                try {
                  window.localStorage?.setItem('excalidraw-canvas-theme', appState.theme)
                } catch (error) {
                  console.warn('Failed to save theme to localStorage:', error)
                }
              }
              if (appState?.selectedElementIds && websocketRef.current?.readyState === WebSocket.OPEN) {
                const selectedIds = Object.keys(appState.selectedElementIds)
                  .filter((id) => appState.selectedElementIds[id])
                  .sort()
                const serialized = selectedIds.join(',')
                if (serialized !== lastReportedSelectionRef.current) {
                  lastReportedSelectionRef.current = serialized
                  try {
                    websocketRef.current.send(
                      JSON.stringify({
                        type: 'selection_updated',
                        selectedElementIds: selectedIds
                      })
                    )
                  } catch (error) {
                    console.warn('Failed to report selection update:', error)
                  }
                }
              }
              // Fork (ADR-007 option 3): a cheap scan, and a re-render only when it flips
              const sendBoxNow = _elements.some(el => el.id === SEND_BOX_ID && !el.isDeleted)
              if (sendBoxNow !== hasSendBox) setHasSendBox(sendBoxNow)
              scheduleAutoSync()
            }}
            initialData={{
              elements: [],
              appState: {
                theme
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default App
