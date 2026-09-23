import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export interface PersistedWindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PersistedWindowState {
  readonly bounds: PersistedWindowBounds;
  readonly isMaximized: boolean;
}

const WINDOW_STATE_FILE = 'window-state.json';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidBounds(value: unknown): value is PersistedWindowBounds {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const bounds = value as Record<string, unknown>;

  return (
    isFiniteNumber(bounds.x) &&
    isFiniteNumber(bounds.y) &&
    isFiniteNumber(bounds.width) &&
    isFiniteNumber(bounds.height) &&
    bounds.width >= 400 &&
    bounds.height >= 300
  );
}

function isValidState(value: unknown): value is PersistedWindowState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;
  return isValidBounds(state.bounds) && typeof state.isMaximized === 'boolean';
}

export class WindowStateService {
  private readonly statePath: string;

  public constructor() {
    this.statePath = path.join(app.getPath('userData'), WINDOW_STATE_FILE);
  }

  public async load(): Promise<PersistedWindowState | null> {
    try {
      const contents = await readFile(this.statePath, 'utf8');
      const parsed: unknown = JSON.parse(contents);
      return isValidState(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  public async save(state: PersistedWindowState): Promise<void> {
    const directory = path.dirname(this.statePath);
    await mkdir(directory, { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
}
