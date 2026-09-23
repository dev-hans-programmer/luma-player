import { app, protocol } from 'electron';
import { registerIpcHandlers } from './ipc/register-ipc';
import { createApplicationMenu } from './menu/application-menu';
import { registerWindowSecurity } from './security/security-policy';
import { logger, registerProcessErrorHandlers } from './services/logger';
import { MediaAssetService } from './services/media-asset-service';
import { registerMediaProtocol } from './services/media-protocol';
import { SwiftNativeMediaService } from './services/native-macos-service';
import { PlaylistService } from './services/persistence/playlist-service';
import { PreferencesService } from './services/persistence/preferences-service';
import { RecentFilesService } from './services/persistence/recent-files-service';
import { ResumePositionService } from './services/persistence/resume-position-service';
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
  let isPreparingToQuit = false;
  let isFinalizingQuit = false;
  const recentFiles = new RecentFilesService();
  const nativeMediaService = new SwiftNativeMediaService();
  const mediaAssetService = new MediaAssetService(recentFiles, nativeMediaService);
  const preferences = new PreferencesService();
  const resumePositions = new ResumePositionService();
  const playlists = new PlaylistService();

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
    unregisterIpcHandlers = registerIpcHandlers(getMainWindow, mediaAssetService, {
      preferences,
      recentFiles,
      resumePositions,
      playlists,
    });
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

  app.on('before-quit', (event) => {
    if (isPreparingToQuit) {
      return;
    }

    event.preventDefault();
    isPreparingToQuit = true;
    void resumePositions.flush().finally(() => app.quit());
  });

  app.on('will-quit', (event) => {
    if (isFinalizingQuit) {
      return;
    }

    // Keep IPC alive until renderer teardown has had a chance to send its
    // final resume position, then flush the debounced store before exiting.
    event.preventDefault();
    isFinalizingQuit = true;
    void resumePositions.flush().finally(() => {
      unregisterIpcHandlers?.();
      unregisterWindowSecurity?.();
      unregisterMediaProtocol?.();
      nativeMediaService.dispose();
      unregisterProcessErrorHandlers();
      app.quit();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
