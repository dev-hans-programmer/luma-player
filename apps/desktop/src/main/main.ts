import { app, protocol } from 'electron';
import { registerIpcHandlers } from './ipc/register-ipc';
import { createApplicationMenu } from './menu/application-menu';
import { registerWindowSecurity } from './security/security-policy';
import { logger, registerProcessErrorHandlers } from './services/logger';
import { MediaAssetService } from './services/media-asset-service';
import { registerMediaProtocol } from './services/media-protocol';
import { createMainWindow, getMainWindow } from './windows/main-window';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  const unregisterProcessErrorHandlers = registerProcessErrorHandlers();
  let unregisterIpcHandlers: (() => void) | undefined;
  let unregisterWindowSecurity: (() => void) | undefined;
  let unregisterMediaProtocol: (() => void) | undefined;
  let isInitialized = false;
  const mediaAssetService = new MediaAssetService();

  const handleTerminationSignal = (signal: NodeJS.Signals): void => {
    logger.info('Received development termination signal', { signal });
    app.quit();
  };

  process.once('SIGTERM', () => handleTerminationSignal('SIGTERM'));
  process.once('SIGINT', () => handleTerminationSignal('SIGINT'));

  app.on('second-instance', () => {
    const window = getMainWindow();

    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
    }

    window.focus();
  });

  void app.whenReady().then(async () => {
    if (isInitialized) {
      return;
    }

    isInitialized = true;
    unregisterMediaProtocol = registerMediaProtocol(mediaAssetService);
    unregisterIpcHandlers = registerIpcHandlers(getMainWindow, mediaAssetService);
    await createMainWindow((createdWindow) => {
      unregisterWindowSecurity = registerWindowSecurity(createdWindow);
    });
    createApplicationMenu(getMainWindow);

    app.on('activate', () => {
      if (!getMainWindow()) {
        void createMainWindow((createdWindow) => {
          unregisterWindowSecurity = registerWindowSecurity(createdWindow);
        });
      }
    });

    logger.info('Application initialized');
  });

  app.on('before-quit', () => {
    unregisterIpcHandlers?.();
    unregisterWindowSecurity?.();
    unregisterMediaProtocol?.();
    unregisterProcessErrorHandlers();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
