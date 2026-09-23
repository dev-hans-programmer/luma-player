import type { MediaAsset, RecentFileEntry, RecentFilesRepository } from '@luma/domain';
import { JsonFileStore } from './json-file-store';

const RECENTS_VERSION = 1;
const MAX_RECENTS = 30;

export interface PersistedRecentFile extends RecentFileEntry {
  readonly filePath: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
}

interface PersistedRecents {
  readonly version: number;
  readonly entries: readonly PersistedRecentFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEntry(value: unknown): value is PersistedRecentFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.assetId === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.lastOpenedAtIso === 'string' &&
    typeof value.filePath === 'string' &&
    (typeof value.mimeType === 'string' || value.mimeType === null) &&
    (typeof value.sizeBytes === 'number' || value.sizeBytes === null)
  );
}

export class RecentFilesService implements RecentFilesRepository {
  private readonly store = new JsonFileStore<PersistedRecents>('recent-files.json');
  private entries: PersistedRecentFile[] = [];
  private loaded = false;

  public async list(): Promise<readonly RecentFileEntry[]> {
    await this.ensureLoaded();
    return this.entries.map(({ assetId, displayName, lastOpenedAtIso }) => ({
      assetId,
      displayName,
      lastOpenedAtIso,
    }));
  }

  public async listPersisted(): Promise<readonly PersistedRecentFile[]> {
    await this.ensureLoaded();
    return this.entries;
  }

  public async get(assetId: string): Promise<PersistedRecentFile | null> {
    await this.ensureLoaded();
    return this.entries.find((entry) => entry.assetId === assetId) ?? null;
  }

  public async add(entry: RecentFileEntry): Promise<void> {
    await this.ensureLoaded();
    const existing = this.entries.find((candidate) => candidate.assetId === entry.assetId);
    const completeEntry: PersistedRecentFile = {
      ...(existing ?? {
        filePath: '',
        mimeType: null,
        sizeBytes: null,
      }),
      ...entry,
    };
    this.entries = [
      completeEntry,
      ...this.entries.filter((item) => item.assetId !== entry.assetId),
    ].slice(0, MAX_RECENTS);
    await this.persist();
  }

  public async addAsset(asset: MediaAsset, filePath: string): Promise<void> {
    await this.ensureLoaded();
    const entry: PersistedRecentFile = {
      assetId: asset.id,
      displayName: asset.displayName,
      lastOpenedAtIso: new Date().toISOString(),
      filePath,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    };
    this.entries = [entry, ...this.entries.filter((item) => item.filePath !== filePath)].slice(
      0,
      MAX_RECENTS,
    );
    await this.persist();
  }

  public async remove(assetId: string): Promise<void> {
    await this.ensureLoaded();
    this.entries = this.entries.filter((entry) => entry.assetId !== assetId);
    await this.persist();
  }

  public async clear(): Promise<void> {
    await this.ensureLoaded();
    this.entries = [];
    await this.persist();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    const persisted = await this.store.read();
    if (persisted?.version === RECENTS_VERSION && Array.isArray(persisted.entries)) {
      this.entries = persisted.entries.filter(isEntry).slice(0, MAX_RECENTS);
    }
  }

  private async persist(): Promise<void> {
    await this.store.write({ version: RECENTS_VERSION, entries: this.entries });
  }
}
