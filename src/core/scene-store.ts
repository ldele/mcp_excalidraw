import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { pidFilePath } from './pidfile.js';
import {
  elements,
  files,
  snapshots,
  changeLog,
  CHANGE_LOG_LIMIT,
  ServerElement,
  ExcalidrawFile,
  Snapshot,
  ChangeRecord
} from '../types.js';

// T-023: the canvas keeps its scene on disk, one file per port, and reads it back on start.
//
// The server held the scene in memory only, so a crash or a reboot ended the drawing, and a tab
// still open on the canvas then loaded the empty scene of the server that came back: a round of
// markup was lost that way on 2026-10-22. Now every request that can change the scene schedules a
// save, written whole to a temporary file and renamed over the last one once the writes pause. A
// process killed outright loses at most that pause; the open tab covers it (the reconnect rule in
// frontend/src/App.tsx).
//
// Saved: the elements in store order, image files, named snapshots, and the change log, so
// `changes --since N` still answers across a restart.
//
// EXCALIDRAW_NO_PERSIST=1 keeps the scene in memory only, as before. EXCALIDRAW_SCENE_DIR moves
// the files; the default is the pidfile's directory (src/core/pidfile.ts).

const FORMAT = 'excalidraw-canvas-scene';
const VERSION = 1;
// A save waits for the writes to pause, and no longer than the cap during a long burst of them.
const SAVE_QUIET_MS = 250;
const SAVE_MAX_WAIT_MS = 2000;

interface SavedScene {
  format: typeof FORMAT;
  version: typeof VERSION;
  sceneId: string;
  revision: number;
  records: ChangeRecord[];
  elements: ServerElement[];
  files: ExcalidrawFile[];
  snapshots: Snapshot[];
}

export interface CanvasIdentity {
  instanceId: string;
  sceneId: string;
  rev: number;
}

export interface SceneRestore {
  file: string | null;
  restored: boolean;
  elements: number;
  rev: number;
  setAside?: string;
}

// What a page compares when it reconnects. A new process has a new instance. The scene id is born
// with an empty change log and is saved with the scene, so revisions compare only within one id:
// a server restored from disk keeps it, a server that came back empty has a new one.
const instanceId: string = randomUUID();
let sceneId: string = randomUUID();

let file: string | null = null;
let lastWritten: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pendingSince = 0;
let failing = false;

/** Where the scene for `port` is kept, or null when persistence is off. Read on each call. */
export function sceneFilePath(port: number): string | null {
  if (process.env.EXCALIDRAW_NO_PERSIST === '1') return null;
  const dir = process.env.EXCALIDRAW_SCENE_DIR || path.dirname(pidFilePath(port));
  return path.join(dir, `scene-${port}.json`);
}

/** The file this process saves to, or null when it keeps the scene in memory only. */
export function sceneFile(): string | null {
  return file;
}

export function canvasIdentity(): CanvasIdentity {
  return { instanceId, sceneId, rev: changeLog.revision };
}

function serialize(): string {
  const saved: SavedScene = {
    format: FORMAT,
    version: VERSION,
    sceneId,
    revision: changeLog.revision,
    records: changeLog.records,
    elements: [...elements.values()],
    files: [...files.values()],
    snapshots: [...snapshots.values()]
  };
  return JSON.stringify(saved);
}

function parseSaved(raw: string): SavedScene {
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || data.format !== FORMAT) throw new Error('not a canvas scene file');
  if (data.version !== VERSION) throw new Error(`format version ${data.version}; this build reads ${VERSION}`);
  if (typeof data.sceneId !== 'string' || !Number.isInteger(data.revision) || data.revision < 0) {
    throw new Error('no scene id or revision');
  }
  for (const key of ['records', 'elements', 'files', 'snapshots'] as const) {
    if (!Array.isArray(data[key])) throw new Error(`${key} is not a list`);
  }
  if (!data.elements.every((e: any) => e && typeof e.id === 'string')) throw new Error('an element has no id');
  if (!data.files.every((f: any) => f && typeof f.id === 'string')) throw new Error('a file has no id');
  if (!data.snapshots.every((s: any) => s && typeof s.name === 'string')) throw new Error('a snapshot has no name');
  return data as SavedScene;
}

/**
 * Opens the scene file for `port` and loads what it holds into the store. Call once, before the
 * server listens. A file that cannot be read is never written over: an unreadable one is moved
 * aside, and when even that fails this process keeps its scene in memory only.
 */
export function openSceneStore(port: number): SceneRestore {
  file = sceneFilePath(port);
  if (!file) return { file: null, restored: false, elements: 0, rev: 0 };

  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { file, restored: false, elements: 0, rev: 0 };
    logger.error(`Cannot read the saved scene ${file} (${(error as Error).message}); keeping this one in memory only`);
    file = null;
    return { file: null, restored: false, elements: 0, rev: 0 };
  }

  let saved: SavedScene;
  try {
    saved = parseSaved(raw);
  } catch (error) {
    const aside = file.replace(/\.json$/, `.unreadable-${Date.now()}.json`);
    try {
      fs.renameSync(file, aside);
    } catch {
      logger.error(`Saved scene ${file} is unreadable and could not be moved aside; keeping this one in memory only`);
      file = null;
      return { file: null, restored: false, elements: 0, rev: 0 };
    }
    logger.error(`Saved scene ${file} is unreadable (${(error as Error).message}); moved to ${aside}, starting empty`);
    return { file, restored: false, elements: 0, rev: 0, setAside: aside };
  }

  elements.clear();
  for (const element of saved.elements) elements.set(element.id, element);
  files.clear();
  for (const f of saved.files) files.set(f.id, f);
  snapshots.clear();
  for (const snapshot of saved.snapshots) snapshots.set(snapshot.name, snapshot);
  changeLog.revision = saved.revision;
  changeLog.records.splice(0, changeLog.records.length, ...saved.records.slice(-CHANGE_LOG_LIMIT));
  sceneId = saved.sceneId;
  lastWritten = serialize();
  return { file, restored: true, elements: elements.size, rev: changeLog.revision };
}

// Windows refuses to rename over a file another program holds open (an indexer, a virus scan).
// Copying over it is not atomic, but it beats losing the save.
function replaceFile(from: string, to: string): void {
  try {
    fs.renameSync(from, to);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') throw error;
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
  }
}

function save(): void {
  timer = null;
  if (!file) return;
  const body = serialize();
  if (body === lastWritten) return;
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temp, body, 'utf-8');
    replaceFile(temp, file);
    lastWritten = body;
    if (failing) logger.info(`Scene saved to ${file} again`);
    failing = false;
  } catch (error) {
    if (!failing) logger.error(`Could not save the scene to ${file}: ${(error as Error).message}`);
    failing = true;
    try { fs.unlinkSync(temp); } catch { /* never written */ }
    timer = setTimeout(save, SAVE_MAX_WAIT_MS);
    timer.unref();
  }
}

/** Saves once the writes pause, or after SAVE_MAX_WAIT_MS of them at most. */
export function scheduleSceneSave(): void {
  if (!file) return;
  const now = Date.now();
  if (timer) clearTimeout(timer);
  else pendingSince = now;
  timer = setTimeout(save, Math.min(SAVE_QUIET_MS, Math.max(0, pendingSince + SAVE_MAX_WAIT_MS - now)));
  timer.unref();
}

/** Writes a pending save now. Synchronous, so an exit handler can call it. */
export function flushScene(): void {
  if (timer) clearTimeout(timer);
  save();
}

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Express middleware: a request that may have changed the scene schedules a save once answered. */
export function saveSceneAfterWrites(req: Request, res: Response, next: NextFunction): void {
  if (!READS.has(req.method)) res.on('close', scheduleSceneSave);
  next();
}
