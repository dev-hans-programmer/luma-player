import type { MediaAssetPayload, PlaylistPayload } from '@luma/contracts';
import { playlistStore } from '../state/playlist-state';

function replacePlaylist(playlist: PlaylistPayload): void {
  playlistStore.setState((current) => ({
    ...current,
    playlists: [playlist, ...current.playlists.filter((item) => item.id !== playlist.id)],
  }));
}

export async function loadPlaylists(): Promise<void> {
  const playlists = await window.electronAPI.listPlaylists();
  playlistStore.setState((current) => ({
    ...current,
    playlists,
    activePlaylistId: current.activePlaylistId ?? playlists[0]?.id ?? null,
  }));
}

export async function createPlaylist(name: string): Promise<PlaylistPayload> {
  const playlist: PlaylistPayload = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled playlist',
    items: [],
    activeItemId: null,
  };
  await window.electronAPI.savePlaylist(playlist);
  replacePlaylist(playlist);
  playlistStore.setState((current) => ({ ...current, activePlaylistId: playlist.id }));
  return playlist;
}

export async function addAssetToPlaylist(
  playlistId: string,
  asset: MediaAssetPayload,
): Promise<void> {
  const playlist = playlistStore.getSnapshot().playlists.find((item) => item.id === playlistId);
  if (!playlist || playlist.items.some((item) => item.assetId === asset.id)) {
    return;
  }

  const item = { id: crypto.randomUUID(), assetId: asset.id, title: asset.displayName };
  const nextPlaylist: PlaylistPayload = {
    ...playlist,
    items: [...playlist.items, item],
    activeItemId: playlist.activeItemId ?? item.id,
  };
  await window.electronAPI.savePlaylist(nextPlaylist);
  replacePlaylist(nextPlaylist);
}

export async function removePlaylistItem(playlistId: string, itemId: string): Promise<void> {
  const playlist = playlistStore.getSnapshot().playlists.find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }

  const items = playlist.items.filter((item) => item.id !== itemId);
  const nextPlaylist: PlaylistPayload = {
    ...playlist,
    items,
    activeItemId: playlist.activeItemId === itemId ? (items[0]?.id ?? null) : playlist.activeItemId,
  };
  await window.electronAPI.savePlaylist(nextPlaylist);
  replacePlaylist(nextPlaylist);
}

export async function setPlaylistActiveItem(
  playlistId: string,
  itemId: string | null,
): Promise<void> {
  const playlist = playlistStore.getSnapshot().playlists.find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }

  const nextPlaylist = { ...playlist, activeItemId: itemId };
  await window.electronAPI.savePlaylist(nextPlaylist);
  replacePlaylist(nextPlaylist);
}

export async function reorderPlaylistItem(
  playlistId: string,
  itemId: string,
  direction: -1 | 1,
): Promise<void> {
  const playlist = playlistStore.getSnapshot().playlists.find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }

  const index = playlist.items.findIndex((item) => item.id === itemId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= playlist.items.length) {
    return;
  }

  const items = [...playlist.items];
  [items[index], items[targetIndex]] = [items[targetIndex]!, items[index]!];
  const nextPlaylist = { ...playlist, items };
  await window.electronAPI.savePlaylist(nextPlaylist);
  replacePlaylist(nextPlaylist);
}

export async function removePlaylist(playlistId: string): Promise<void> {
  await window.electronAPI.removePlaylist(playlistId);
  playlistStore.setState((current) => {
    const playlists = current.playlists.filter((playlist) => playlist.id !== playlistId);
    return {
      playlists,
      activePlaylistId:
        current.activePlaylistId === playlistId
          ? (playlists[0]?.id ?? null)
          : current.activePlaylistId,
    };
  });
}

export function getAdjacentPlaylistItem(
  playlist: PlaylistPayload | undefined,
  assetId: string,
  direction: -1 | 1,
): PlaylistPayload['items'][number] | null {
  if (!playlist || playlist.items.length === 0) {
    return null;
  }

  const index = playlist.items.findIndex((item) => item.assetId === assetId);
  if (index < 0) {
    return null;
  }

  return playlist.items[index + direction] ?? null;
}
