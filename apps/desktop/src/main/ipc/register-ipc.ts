import { app, ipcMain } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { assertEmptyIpcRequest, IPC_CHANNELS, validateRendererErrorPayload } from '@luma/contracts';
import { logger } from '../services/logger';
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

let activeCleanup: (() => void) | null = null;

export function registerIpcHandlers(windowProvider: WindowProvider): () => void {
  if (activeCleanup) {
    throw new Error('IPC handlers have already been registered.');
  }

  const windowControl = createWindowControlService(windowProvider);
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
  ipcMain.handle(IPC_CHANNELS.windowClose, handleWindowClose);
  ipcMain.handle(IPC_CHANNELS.windowMinimize, handleWindowMinimize);
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, handleWindowToggleFullscreen);
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, handleWindowToggleMaximize);
  ipcMain.on(IPC_CHANNELS.rendererError, handleRendererError);

  const cleanup = (): void => {
    ipcMain.removeHandler(IPC_CHANNELS.appGetInfo);
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
