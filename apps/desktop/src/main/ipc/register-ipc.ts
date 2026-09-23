import { app, ipcMain } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type {
  MediaAsset,
  MediaMetadata,
  PlaybackPosition,
  Playlist,
  PlayerPreferences,
} from '@luma/domain';
import {
  assertEmptyIpcRequest,
  IPC_CHANNELS,
  serializeIpcError,
  validateAssetIdRequest,
  validateDroppedFilesRequest,
  validatePlaybackPositionPayload,
  validatePlaylistIdRequest,
  validatePlaylistPayload,
  validatePreferencesPayload,
  validateRendererErrorPayload,
} from '@luma/contracts';
import { logger } from '../services/logger';
import type { MediaAssetService } from '../services/media-asset-service';
import type { PlaylistService } from '../services/persistence/playlist-service';
import type { PreferencesService } from '../services/persistence/preferences-service';
import type { RecentFilesService } from '../services/persistence/recent-files-service';
import type { ResumePositionService } from '../services/persistence/resume-position-service';
import { createWindowControlService } from '../services/window-control-service';

type WindowProvider = () => BrowserWindow | null;

export interface PersistenceServices {
  readonly preferences: PreferencesService;
  readonly recentFiles: RecentFilesService;
  readonly resumePositions: ResumePositionService;
  readonly playlists: PlaylistService;
}

function assertTrustedSender(
  event: IpcMainEvent | IpcMainInvokeEvent,
  windowProvider: WindowProvider,
): BrowserWindow {
  const window = windowProvider();

  if (!window || window.webContents.id !== event.sender.id) {
    throw new Error('Rejected IPC request from an untrusted renderer.');
  }

  return window;
}

function throwSafeIpcError(error: unknown): never {
  const serialized = serializeIpcError(error);
  logger.error('Media IPC request failed', {
    code: serialized.code,
    diagnosticMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw new Error(serialized.userMessage);
}

let activeCleanup: (() => void) | null = null;

export function registerIpcHandlers(
  windowProvider: WindowProvider,
  mediaAssetService: MediaAssetService,
  persistence: PersistenceServices,
): () => void {
  if (activeCleanup) {
    throw new Error('IPC handlers have already been registered.');
  }

  const windowControl = createWindowControlService(windowProvider);
  const getWindow = (): BrowserWindow => {
    const window = windowProvider();

    if (!window || window.isDestroyed()) {
      throw new Error('The main application window is unavailable.');
    }

    return window;
  };

  const getAppInfo = (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): { name: string; version: string } => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);

    return {
      name: app.getName(),
      version: app.getVersion(),
    };
  };

  const validateWindowRequest = (event: IpcMainInvokeEvent, request: unknown): void => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
  };

  const handleOpenFile = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<readonly MediaAsset[]> => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      return await mediaAssetService.openFileDialog(getWindow());
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleRegisterDroppedFiles = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<readonly MediaAsset[]> => {
    assertTrustedSender(event, windowProvider);
    const validation = validateDroppedFilesRequest(request);

    if (!validation.success) {
      throw new Error(validation.message);
    }

    try {
      return await mediaAssetService.registerFiles(validation.data.filePaths);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleGetMediaSource = (event: IpcMainInvokeEvent, request: unknown): string => {
    assertTrustedSender(event, windowProvider);
    const validation = validateAssetIdRequest(request);

    if (!validation.success) {
      throw new Error(validation.message);
    }

    try {
      return mediaAssetService.getMediaSource(validation.data.assetId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleGetMediaMetadata = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<MediaMetadata> => {
    assertTrustedSender(event, windowProvider);
    const validation = validateAssetIdRequest(request);

    if (!validation.success) {
      throw new Error(validation.message);
    }

    try {
      return await mediaAssetService.loadMetadata(validation.data.assetId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleOpenRecentFile = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<MediaAsset> => {
    assertTrustedSender(event, windowProvider);
    const validation = validateAssetIdRequest(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      return await mediaAssetService.openRecentAsset(validation.data.assetId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleGetRecentFiles = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<readonly { readonly asset: MediaAsset; readonly lastOpenedAtIso: string }[]> => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      return await mediaAssetService.getRecentAssets();
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleClearRecentFiles = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      await persistence.recentFiles.clear();
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleImportFolder = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<readonly MediaAsset[]> => {
    const window = assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      return await mediaAssetService.importFolder(window, (progress) => {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.mediaImportFolderProgress, progress);
        }
      });
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleCancelFolderImport = (event: IpcMainInvokeEvent, request: unknown): void => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    mediaAssetService.cancelFolderImport();
  };

  const handleGetPreferences = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<PlayerPreferences> => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      return await persistence.preferences.load();
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleSavePreferences = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    const validation = validatePreferencesPayload(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      await persistence.preferences.save(validation.data);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleGetResumePosition = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<PlaybackPosition | null> => {
    assertTrustedSender(event, windowProvider);
    const validation = validateAssetIdRequest(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      return await persistence.resumePositions.get(validation.data.assetId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleSaveResumePosition = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    const validation = validatePlaybackPositionPayload(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      await persistence.resumePositions.save(validation.data);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleRemoveResumePosition = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    const validation = validateAssetIdRequest(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      await persistence.resumePositions.remove(validation.data.assetId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleListPlaylists = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<readonly Playlist[]> => {
    assertTrustedSender(event, windowProvider);
    assertEmptyIpcRequest(request);
    try {
      return await persistence.playlists.list();
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleSavePlaylist = async (event: IpcMainInvokeEvent, request: unknown): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    const validation = validatePlaylistPayload(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      await persistence.playlists.save(validation.data as Playlist);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleRemovePlaylist = async (
    event: IpcMainInvokeEvent,
    request: unknown,
  ): Promise<void> => {
    assertTrustedSender(event, windowProvider);
    const validation = validatePlaylistIdRequest(request);
    if (!validation.success) {
      throw new Error(validation.message);
    }
    try {
      await persistence.playlists.remove(validation.data.playlistId);
    } catch (error) {
      return throwSafeIpcError(error);
    }
  };

  const handleWindowClose = (event: IpcMainInvokeEvent, request: unknown): void => {
    validateWindowRequest(event, request);
    windowControl.close();
  };

  const handleWindowMinimize = (event: IpcMainInvokeEvent, request: unknown): void => {
    validateWindowRequest(event, request);
    windowControl.minimize();
  };

  const handleWindowToggleFullscreen = (event: IpcMainInvokeEvent, request: unknown): boolean => {
    validateWindowRequest(event, request);
    return windowControl.toggleFullscreen();
  };

  const handleWindowToggleMaximize = (event: IpcMainInvokeEvent, request: unknown): boolean => {
    validateWindowRequest(event, request);
    return windowControl.toggleMaximize();
  };

  const handleRendererError = (event: IpcMainEvent, payload: unknown): void => {
    try {
      assertTrustedSender(event, windowProvider);
    } catch (error) {
      logger.warn('Rejected renderer error report', {
        reason: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const validation = validateRendererErrorPayload(payload);

    if (!validation.success) {
      logger.warn('Rejected malformed renderer error report', { reason: validation.message });
      return;
    }

    logger.error('Renderer error reported', { ...validation.data });
  };

  ipcMain.handle(IPC_CHANNELS.appGetInfo, getAppInfo);
  ipcMain.handle(IPC_CHANNELS.mediaOpenFile, handleOpenFile);
  ipcMain.handle(IPC_CHANNELS.mediaOpenRecentFile, handleOpenRecentFile);
  ipcMain.handle(IPC_CHANNELS.mediaGetRecentFiles, handleGetRecentFiles);
  ipcMain.handle(IPC_CHANNELS.mediaClearRecentFiles, handleClearRecentFiles);
  ipcMain.handle(IPC_CHANNELS.mediaRegisterDroppedFiles, handleRegisterDroppedFiles);
  ipcMain.handle(IPC_CHANNELS.mediaImportFolder, handleImportFolder);
  ipcMain.handle(IPC_CHANNELS.mediaCancelFolderImport, handleCancelFolderImport);
  ipcMain.handle(IPC_CHANNELS.mediaGetSource, handleGetMediaSource);
  ipcMain.handle(IPC_CHANNELS.mediaGetMetadata, handleGetMediaMetadata);
  ipcMain.handle(IPC_CHANNELS.preferencesGet, handleGetPreferences);
  ipcMain.handle(IPC_CHANNELS.preferencesSave, handleSavePreferences);
  ipcMain.handle(IPC_CHANNELS.resumeGet, handleGetResumePosition);
  ipcMain.handle(IPC_CHANNELS.resumeSave, handleSaveResumePosition);
  ipcMain.handle(IPC_CHANNELS.resumeRemove, handleRemoveResumePosition);
  ipcMain.handle(IPC_CHANNELS.playlistsList, handleListPlaylists);
  ipcMain.handle(IPC_CHANNELS.playlistsSave, handleSavePlaylist);
  ipcMain.handle(IPC_CHANNELS.playlistsRemove, handleRemovePlaylist);
  ipcMain.handle(IPC_CHANNELS.windowClose, handleWindowClose);
  ipcMain.handle(IPC_CHANNELS.windowMinimize, handleWindowMinimize);
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, handleWindowToggleFullscreen);
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, handleWindowToggleMaximize);
  ipcMain.on(IPC_CHANNELS.rendererError, handleRendererError);

  const cleanup = (): void => {
    ipcMain.removeHandler(IPC_CHANNELS.appGetInfo);
    ipcMain.removeHandler(IPC_CHANNELS.mediaOpenFile);
    ipcMain.removeHandler(IPC_CHANNELS.mediaOpenRecentFile);
    ipcMain.removeHandler(IPC_CHANNELS.mediaGetRecentFiles);
    ipcMain.removeHandler(IPC_CHANNELS.mediaClearRecentFiles);
    ipcMain.removeHandler(IPC_CHANNELS.mediaRegisterDroppedFiles);
    ipcMain.removeHandler(IPC_CHANNELS.mediaImportFolder);
    ipcMain.removeHandler(IPC_CHANNELS.mediaCancelFolderImport);
    ipcMain.removeHandler(IPC_CHANNELS.mediaGetSource);
    ipcMain.removeHandler(IPC_CHANNELS.mediaGetMetadata);
    ipcMain.removeHandler(IPC_CHANNELS.preferencesGet);
    ipcMain.removeHandler(IPC_CHANNELS.preferencesSave);
    ipcMain.removeHandler(IPC_CHANNELS.resumeGet);
    ipcMain.removeHandler(IPC_CHANNELS.resumeSave);
    ipcMain.removeHandler(IPC_CHANNELS.resumeRemove);
    ipcMain.removeHandler(IPC_CHANNELS.playlistsList);
    ipcMain.removeHandler(IPC_CHANNELS.playlistsSave);
    ipcMain.removeHandler(IPC_CHANNELS.playlistsRemove);
    ipcMain.removeHandler(IPC_CHANNELS.windowClose);
    ipcMain.removeHandler(IPC_CHANNELS.windowMinimize);
    ipcMain.removeHandler(IPC_CHANNELS.windowToggleFullscreen);
    ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize);
    ipcMain.removeListener(IPC_CHANNELS.rendererError, handleRendererError);

    if (activeCleanup === cleanup) {
      activeCleanup = null;
    }
  };

  activeCleanup = cleanup;
  return cleanup;
}
