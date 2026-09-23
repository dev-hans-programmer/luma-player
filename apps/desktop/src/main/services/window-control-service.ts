import type { BrowserWindow } from 'electron';
import type { WindowControlPort } from '@luma/domain';

type WindowProvider = () => BrowserWindow | null;

/** Adapts Electron's BrowserWindow API to the domain-level window port. */
export function createWindowControlService(windowProvider: WindowProvider): WindowControlPort {
  const getWindow = (): BrowserWindow => {
    const window = windowProvider();

    if (!window || window.isDestroyed()) {
      throw new Error('The main application window is unavailable.');
    }

    return window;
  };

  return {
    close: () => getWindow().close(),
    minimize: () => getWindow().minimize(),
    toggleFullscreen: () => {
      const window = getWindow();
      const nextState = !window.isFullScreen();
      window.setFullScreen(nextState);
      return nextState;
    },
    toggleMaximize: () => {
      const window = getWindow();

      if (window.isMaximized()) {
        window.unmaximize();
        return false;
      }

      window.maximize();
      return true;
    },
  };
}
