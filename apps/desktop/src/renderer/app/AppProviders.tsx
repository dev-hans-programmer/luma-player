import { useEffect, type ReactNode } from 'react';
import { openMediaFile, refreshRecentFiles, setMediaError } from '../media/media-actions';
import { loadPlaylists } from '../playlists/playlist-actions';
import { getActivePlaybackController } from '../playback/playback-controller-registry';
import { applicationStore } from '../state/app-state';
import { settingsStore } from '../state/settings-state';
import { uiStore } from '../state/ui-state';

interface AppProvidersProps {
  readonly children: ReactNode;
}

// Keep provider composition in one place. Feature-specific providers can be
// added here without making the renderer entry point responsible for wiring.
export function AppProviders({ children }: AppProvidersProps): ReactNode {
  useEffect(() => {
    const removeMenuListener = window.electronAPI.onMenuCommand((command) => {
      applicationStore.setState((current) => ({ ...current, lastCommand: command }));

      const controller = getActivePlaybackController();

      if (command === 'media.open-file') {
        void openMediaFile().catch(setMediaError);
      } else if (command === 'playback.toggle') {
        void controller?.togglePlayback().catch(() => undefined);
      } else if (command === 'playback.seek-backward') {
        if (controller) {
          controller.seek(controller.getState().currentTimeMs - 10_000);
        }
      } else if (command === 'playback.seek-forward') {
        if (controller) {
          controller.seek(controller.getState().currentTimeMs + 10_000);
        }
      } else if (command === 'view.toggle-fullscreen') {
        void (
          controller ? controller.requestFullscreen() : window.electronAPI.window.toggleFullscreen()
        ).catch(() => undefined);
      } else if (command === 'view.toggle-sidebar') {
        uiStore.setState((current) => ({ ...current, isSidebarOpen: !current.isSidebarOpen }));
      } else if (command === 'app.open-settings') {
        uiStore.setState((current) => ({ ...current, isSettingsOpen: !current.isSettingsOpen }));
      }
    });

    void window.electronAPI
      .getAppInfo()
      .then((appInfo) => {
        applicationStore.setState((current) => ({ ...current, status: 'ready', appInfo }));
      })
      .catch((error: unknown) => {
        applicationStore.setState((current) => ({
          ...current,
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Application initialization failed.',
        }));
      });

    void window.electronAPI
      .getPreferences()
      .then((preferences) => {
        settingsStore.setState(preferences);
        uiStore.setState((current) => ({ ...current, isSidebarOpen: preferences.showSidebar }));
        document.documentElement.dataset.theme = preferences.theme;
      })
      .catch(() => undefined);

    void refreshRecentFiles().catch(() => undefined);
    void loadPlaylists().catch(() => undefined);

    const removeImportProgressListener = window.electronAPI.onFolderImportProgress((progress) => {
      uiStore.setState((current) => ({
        ...current,
        importProgress: { scanned: progress.scanned, imported: progress.imported },
      }));
    });

    return () => {
      removeMenuListener();
      removeImportProgressListener();
    };
  }, []);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (isEditable) {
        return;
      }

      const controller = getActivePlaybackController();
      const hasCommandModifier = event.metaKey || event.ctrlKey;

      if (hasCommandModifier && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void openMediaFile().catch(setMediaError);
        return;
      }

      if (hasCommandModifier && event.key === ',') {
        event.preventDefault();
        uiStore.setState((current) => ({ ...current, isSettingsOpen: !current.isSettingsOpen }));
        return;
      }

      if (!controller || hasCommandModifier || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          void controller.togglePlayback().catch(() => undefined);
          break;
        case 'arrowleft':
          event.preventDefault();
          controller.seek(controller.getState().currentTimeMs - (event.shiftKey ? 30_000 : 10_000));
          break;
        case 'arrowright':
          event.preventDefault();
          controller.seek(controller.getState().currentTimeMs + (event.shiftKey ? 30_000 : 10_000));
          break;
        case 'arrowup':
          event.preventDefault();
          controller.setVolume(controller.getState().volume + 0.05);
          break;
        case 'arrowdown':
          event.preventDefault();
          controller.setVolume(controller.getState().volume - 0.05);
          break;
        case 'm':
          controller.setMuted(!controller.getState().isMuted);
          break;
        case 'f':
          void controller.requestFullscreen().catch(() => undefined);
          break;
        case 'p':
          void controller.requestPictureInPicture().catch(() => undefined);
          break;
        case 'j':
          controller.seek(controller.getState().currentTimeMs - 10_000);
          break;
        case 'k':
          void controller.togglePlayback().catch(() => undefined);
          break;
        case 'l':
          controller.seek(controller.getState().currentTimeMs + 10_000);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  return children;
}
