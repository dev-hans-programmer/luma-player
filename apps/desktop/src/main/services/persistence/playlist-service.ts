import type { Playlist, PlaylistId } from '@luma/domain';
import { JsonFileStore } from './json-file-store';

const PLAYLISTS_VERSION = 1;

interface PersistedPlaylists {
  readonly version: number;
  readonly playlists: readonly Playlist[];
}

function isPlaylist(value: unknown): value is Playlist {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const playlist = value as Record<string, unknown>;
  if (!Array.isArray(playlist.items)) {
    return false;
  }

  const hasValidItems = playlist.items.every((item) => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    const playlistItem = item as Record<string, unknown>;
    return (
      typeof playlistItem.id === 'string' &&
      typeof playlistItem.assetId === 'string' &&
      typeof playlistItem.title === 'string'
    );
  });

  return (
    typeof playlist.id === 'string' &&
    typeof playlist.name === 'string' &&
    hasValidItems &&
    (typeof playlist.activeItemId === 'string' || playlist.activeItemId === null)
  );
}

export class PlaylistService {
  private readonly store = new JsonFileStore<PersistedPlaylists>('playlists.json');
  private playlists: Playlist[] = [];
  private loaded = false;

  public async list(): Promise<readonly Playlist[]> {
    await this.ensureLoaded();
    return this.playlists;
  }

  public async save(playlist: Playlist): Promise<void> {
    await this.ensureLoaded();
    this.playlists = [playlist, ...this.playlists.filter((item) => item.id !== playlist.id)];
    await this.store.write({ version: PLAYLISTS_VERSION, playlists: this.playlists });
  }

  public async remove(playlistId: PlaylistId): Promise<void> {
    await this.ensureLoaded();
    this.playlists = this.playlists.filter((playlist) => playlist.id !== playlistId);
    await this.store.write({ version: PLAYLISTS_VERSION, playlists: this.playlists });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    const persisted = await this.store.read();
    if (persisted?.version === PLAYLISTS_VERSION && Array.isArray(persisted.playlists)) {
      this.playlists = persisted.playlists.filter(isPlaylist);
    }
  }
}
