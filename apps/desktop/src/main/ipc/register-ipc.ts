import { app, ipcMain } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type { MediaAsset, MediaMetadata } from '@luma/domain';
import {
  assertEmptyIpcRequest,
  IPC_CHANNELS,
  serializeIpcError,
  validateAssetIdRequest,
  validateDroppedFilesRequest,
  validateRendererErrorPayload,
} from '@luma/contracts';
import { logger } from '../services/logger';
import type { MediaAssetService } from '../services/media-asset-service';
import { createWindowControlService } from '../services/window-control-service';

type WindowProvider = () => BrowserWindow | null;

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
  ipcMain.handle(IPC_CHANNELS.mediaRegisterDroppedFiles, handleRegisterDroppedFiles);
  ipcMain.handle(IPC_CHANNELS.mediaGetSource, handleGetMediaSource);
  ipcMain.handle(IPC_CHANNELS.mediaGetMetadata, handleGetMediaMetadata);
  ipcMain.handle(IPC_CHANNELS.windowClose, handleWindowClose);
  ipcMain.handle(IPC_CHANNELS.windowMinimize, handleWindowMinimize);
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, handleWindowToggleFullscreen);
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, handleWindowToggleMaximize);
  ipcMain.on(IPC_CHANNELS.rendererError, handleRendererError);

  const cleanup = (): void => {
    ipcMain.removeHandler(IPC_CHANNELS.appGetInfo);
    ipcMain.removeHandler(IPC_CHANNELS.mediaOpenFile);
    ipcMain.removeHandler(IPC_CHANNELS.mediaRegisterDroppedFiles);
    ipcMain.removeHandler(IPC_CHANNELS.mediaGetSource);
    ipcMain.removeHandler(IPC_CHANNELS.mediaGetMetadata);
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
