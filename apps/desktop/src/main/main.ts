import { app } from 'electron';
import { registerIpcHandlers } from './ipc/register-ipc';
import { createApplicationMenu } from './menu/application-menu';
import { registerWindowSecurity } from './security/security-policy';
import { logger, registerProcessErrorHandlers } from './services/logger';
import { createMainWindow, getMainWindow } from './windows/main-window';

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  const unregisterProcessErrorHandlers = registerProcessErrorHandlers();
  let unregisterIpcHandlers: (() => void) | undefined;
  let unregisterWindowSecurity: (() => void) | undefined;
  let isInitialized = false;

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
    unregisterIpcHandlers = registerIpcHandlers(getMainWindow);
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
    unregisterProcessErrorHandlers();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
