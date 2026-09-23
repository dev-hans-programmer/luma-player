import type { MediaAssetId, PlaybackPosition, PlaybackPositionRepository } from '@luma/domain';
import { JsonFileStore } from './json-file-store';

const POSITIONS_VERSION = 1;

interface PersistedPositions {
  readonly version: number;
  readonly positions: Readonly<Record<string, PlaybackPosition>>;
}

function isPosition(value: unknown): value is PlaybackPosition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const position = value as Record<string, unknown>;
  return (
    typeof position.assetId === 'string' &&
    typeof position.positionMs === 'number' &&
    Number.isFinite(position.positionMs) &&
    position.positionMs >= 0 &&
    typeof position.updatedAtIso === 'string'
  );
}

export class ResumePositionService implements PlaybackPositionRepository {
  private readonly store = new JsonFileStore<PersistedPositions>('resume-positions.json');
  private positions: Record<string, PlaybackPosition> = {};
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  public async get(assetId: MediaAssetId): Promise<PlaybackPosition | null> {
    await this.ensureLoaded();
    return this.positions[assetId] ?? null;
  }

  public async save(position: PlaybackPosition): Promise<void> {
    await this.ensureLoaded();
    this.positions[position.assetId] = position;
    this.schedulePersist();
  }

  public async remove(assetId: MediaAssetId): Promise<void> {
    await this.ensureLoaded();
    delete this.positions[assetId];
    await this.persist();
  }

  public async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      await this.persist();
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    const persisted = await this.store.read();
    if (persisted?.version === POSITIONS_VERSION) {
      this.positions = Object.fromEntries(
        Object.entries(persisted.positions).filter(([, position]) => isPosition(position)),
      );
    }
  }

  private schedulePersist(): void {
    if (this.saveTimer) {
      return;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persist();
    }, 500);
  }

  private async persist(): Promise<void> {
    await this.store.write({ version: POSITIONS_VERSION, positions: this.positions });
  }
}
