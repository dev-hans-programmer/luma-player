import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type AppCommandId,
  type ElectronAPI,
  type FolderImportProgressPayload,
  type MediaAssetPayload,
  type MediaMetadataPayload,
  type PlaybackPositionPayload,
  type PlaylistPayload,
  type PlayerPreferencesPayload,
  type RecentFilePayload,
  type RendererErrorPayload,
} from '@luma/contracts';

const electronAPI: ElectronAPI = {
  platform: process.platform,
  electronVersion: process.versions.electron,
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appGetInfo),
  openFile: (): Promise<readonly MediaAssetPayload[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaOpenFile),
  openRecentFile: (assetId: string): Promise<MediaAssetPayload> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaOpenRecentFile, { assetId }),
  getRecentFiles: (): Promise<readonly RecentFilePayload[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaGetRecentFiles),
  clearRecentFiles: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.mediaClearRecentFiles),
  registerDroppedFiles: (filePaths: readonly string[]): Promise<readonly MediaAssetPayload[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaRegisterDroppedFiles, { filePaths }),
  getMediaSource: (assetId: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaGetSource, { assetId }),
  getMediaMetadata: (assetId: string): Promise<MediaMetadataPayload> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaGetMetadata, { assetId }),
  importFolder: (): Promise<readonly MediaAssetPayload[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.mediaImportFolder),
  cancelFolderImport: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.mediaCancelFolderImport),
  onFolderImportProgress: (
    listener: (progress: FolderImportProgressPayload) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: FolderImportProgressPayload,
    ): void => {
      listener(progress);
    };
    ipcRenderer.on(IPC_CHANNELS.mediaImportFolderProgress, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.mediaImportFolderProgress, handler);
  },
  getPreferences: (): Promise<PlayerPreferencesPayload> =>
    ipcRenderer.invoke(IPC_CHANNELS.preferencesGet),
  savePreferences: (preferences: PlayerPreferencesPayload): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.preferencesSave, preferences),
  getPlaybackPosition: (assetId: string): Promise<PlaybackPositionPayload | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.resumeGet, { assetId }),
  savePlaybackPosition: (position: PlaybackPositionPayload): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.resumeSave, position),
  removePlaybackPosition: (assetId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.resumeRemove, { assetId }),
  listPlaylists: (): Promise<readonly PlaylistPayload[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.playlistsList),
  savePlaylist: (playlist: PlaylistPayload): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.playlistsSave, playlist),
  removePlaylist: (playlistId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.playlistsRemove, { playlistId }),
  reportError: (payload: RendererErrorPayload) => {
    ipcRenderer.send(IPC_CHANNELS.rendererError, payload);
  },
  onMenuCommand: (listener: (command: AppCommandId) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: AppCommandId): void => {
      listener(command);
    };

    ipcRenderer.on(IPC_CHANNELS.menuCommand, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.menuCommand, handler);
  },
  window: {
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleFullscreen),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
  },
};

// Keep this bridge intentionally small. Privileged capabilities are added through
// explicit, validated methods in later phases rather than exposing Electron wholesale.
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
