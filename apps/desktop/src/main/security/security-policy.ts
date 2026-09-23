import { app, type BrowserWindow } from 'electron';
import { logger } from '../services/logger';

interface SecurityContext {
  readonly isPackaged: boolean;
  readonly developmentOrigin?: string | undefined;
}

export function isAllowedNavigation(url: string, context: SecurityContext): boolean {
  if (context.isPackaged) {
    return url.startsWith('file://');
  }

  if (!context.developmentOrigin) {
    return false;
  }

  try {
    return new URL(url).origin === context.developmentOrigin;
  } catch {
    return false;
  }
}

function isAllowedDevToolsUrl(url: string): boolean {
  return url.startsWith('devtools://') || url.startsWith('chrome-devtools://');
}

export function registerWindowSecurity(window: BrowserWindow): () => void {
  const developmentOrigin = process.env.ELECTRON_RENDERER_URL
    ? new URL(process.env.ELECTRON_RENDERER_URL).origin
    : undefined;
  const context: SecurityContext = {
    isPackaged: app.isPackaged,
    developmentOrigin,
  };

  const handleWillNavigate = (event: Electron.Event, url: string): void => {
    if (!isAllowedNavigation(url, context)) {
      event.preventDefault();
      logger.warn('Blocked renderer navigation', { url });
    }
  };

  const handleWindowOpen = ({
    url,
  }: Electron.HandlerDetails): Electron.WindowOpenHandlerResponse => {
    if (isAllowedDevToolsUrl(url)) {
      return { action: 'allow' };
    }

    logger.warn('Blocked renderer-created window', { url });
    return { action: 'deny' };
  };

  const handleWebviewAttach = (event: Electron.Event): void => {
    event.preventDefault();
    logger.warn('Blocked webview attachment');
  };

  window.webContents.on('will-navigate', handleWillNavigate);
  window.webContents.setWindowOpenHandler(handleWindowOpen);
  window.webContents.on('will-attach-webview', handleWebviewAttach);

  return (): void => {
    window.webContents.off('will-navigate', handleWillNavigate);
    window.webContents.off('will-attach-webview', handleWebviewAttach);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  };
}
