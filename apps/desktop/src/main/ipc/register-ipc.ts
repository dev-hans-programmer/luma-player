import { app, ipcMain } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS, type RendererErrorPayload } from '@luma/contracts';
import { logger } from '../services/logger';

type WindowProvider = () => BrowserWindow | null;

function isRendererErrorPayload(value: unknown): value is RendererErrorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.message === 'string' &&
    (payload.stack === undefined || typeof payload.stack === 'string') &&
    (payload.source === 'error' ||
      payload.source === 'unhandled-rejection' ||
      payload.source === 'error-boundary')
  );
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

export function registerIpcHandlers(windowProvider: WindowProvider): () => void {
  const getAppInfo = (): { name: string; version: string } => ({
    name: app.getName(),
    version: app.getVersion(),
  });

  const handleWindowClose = (event: IpcMainInvokeEvent): void => {
    const window = assertTrustedSender(event, windowProvider);
    window.close();
  };

  const handleWindowMinimize = (event: IpcMainInvokeEvent): void => {
    const window = assertTrustedSender(event, windowProvider);
    window.minimize();
  };

  const handleWindowToggleFullscreen = (event: IpcMainInvokeEvent): boolean => {
    const window = assertTrustedSender(event, windowProvider);
    const nextState = !window.isFullScreen();
    window.setFullScreen(nextState);
    return nextState;
  };

  const handleWindowToggleMaximize = (event: IpcMainInvokeEvent): boolean => {
    const window = assertTrustedSender(event, windowProvider);

    if (window.isMaximized()) {
      window.unmaximize();
      return false;
    }

    window.maximize();
    return true;
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

    if (!isRendererErrorPayload(payload)) {
      logger.warn('Rejected malformed renderer error report');
      return;
    }

    logger.error('Renderer error reported', { ...payload });
  };

  ipcMain.handle(IPC_CHANNELS.appGetInfo, getAppInfo);
  ipcMain.handle(IPC_CHANNELS.windowClose, handleWindowClose);
  ipcMain.handle(IPC_CHANNELS.windowMinimize, handleWindowMinimize);
  ipcMain.handle(IPC_CHANNELS.windowToggleFullscreen, handleWindowToggleFullscreen);
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, handleWindowToggleMaximize);
  ipcMain.on(IPC_CHANNELS.rendererError, handleRendererError);

  return (): void => {
    ipcMain.removeHandler(IPC_CHANNELS.appGetInfo);
    ipcMain.removeHandler(IPC_CHANNELS.windowClose);
    ipcMain.removeHandler(IPC_CHANNELS.windowMinimize);
    ipcMain.removeHandler(IPC_CHANNELS.windowToggleFullscreen);
    ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize);
    ipcMain.removeListener(IPC_CHANNELS.rendererError, handleRendererError);
  };
}
