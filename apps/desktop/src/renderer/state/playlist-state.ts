import type { PlaylistPayload } from '@luma/contracts';
import { createExternalStore } from './external-store';

export interface PlaylistState {
  readonly playlists: readonly PlaylistPayload[];
  readonly activePlaylistId: string | null;
}

export const playlistStore = createExternalStore<PlaylistState>({
  playlists: [],
  activePlaylistId: null,
});
