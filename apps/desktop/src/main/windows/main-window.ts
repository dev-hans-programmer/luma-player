import path from 'node:path';
import { app, BrowserWindow, screen } from 'electron';
import { logger } from '../services/logger';
import { WindowStateService, type PersistedWindowBounds } from '../services/window-state-service';

const MIN_WIDTH = 760;
const MIN_HEIGHT = 480;
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 760;

let mainWindow: BrowserWindow | null = null;

function hasVisibleIntersection(bounds: PersistedWindowBounds): boolean {
  return screen.getAllDisplays().some(({ workArea }) => {
    const horizontalOverlap =
      bounds.x < workArea.x + workArea.width && bounds.x + bounds.width > workArea.x;
    const verticalOverlap =
      bounds.y < workArea.y + workArea.height && bounds.y + bounds.height > workArea.y;
    return horizontalOverlap && verticalOverlap;
  });
}

function getSafeBounds(bounds: PersistedWindowBounds | null): PersistedWindowBounds {
  if (bounds && hasVisibleIntersection(bounds)) {
    return {
      ...bounds,
      width: Math.max(bounds.width, MIN_WIDTH),
      height: Math.max(bounds.height, MIN_HEIGHT),
    };
  }

  const workArea = screen.getPrimaryDisplay().workArea;
  return {
    x: workArea.x + Math.round((workArea.width - DEFAULT_WIDTH) / 2),
    y: workArea.y + Math.round((workArea.height - DEFAULT_HEIGHT) / 2),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  };
}

function getWindowBounds(window: BrowserWindow): PersistedWindowBounds {
  const bounds = window.getNormalBounds();
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

export async function createMainWindow(
  beforeLoad?: (window: BrowserWindow) => void,
): Promise<BrowserWindow> {
  const stateService = new WindowStateService();
  const persistedState = await stateService.load();
  const bounds = getSafeBounds(persistedState?.bounds ?? null);

  const window = new BrowserWindow({
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    backgroundColor: '#111214',
    title: 'Luma Player',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
    },
  });

  if (persistedState?.isMaximized) {
    window.maximize();
  }

  let saveTimer: NodeJS.Timeout | undefined;
  const saveWindowState = (): void => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      void stateService.save({
        bounds: getWindowBounds(window),
        isMaximized: window.isMaximized(),
      });
    }, 250);
  };

  window.on('resize', saveWindowState);
  window.on('move', saveWindowState);
  window.on('maximize', saveWindowState);
  window.on('unmaximize', saveWindowState);
  window.on('ready-to-show', () => window.show());
  window.on('close', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    void stateService.save({
      bounds: getWindowBounds(window),
      isMaximized: window.isMaximized(),
    });
  });
  window.on('closed', () => {
    mainWindow = null;
  });

  let rendererRecoveryAttempted = false;
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process exited', {
      reason: details.reason,
      exitCode: details.exitCode,
    });

    if (!rendererRecoveryAttempted && details.reason !== 'clean-exit' && !window.isDestroyed()) {
      rendererRecoveryAttempted = true;
      logger.warn('Reloading the renderer once after an unexpected renderer exit');
      void window.reload();
    }
  });

  beforeLoad?.(window);

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow = window;
  logger.info('Main window created', { isPackaged: app.isPackaged });
  return window;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}
