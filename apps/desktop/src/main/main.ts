import path from 'node:path';
import { app, BrowserWindow } from 'electron';

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#111214',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload', 'preload.mjs'),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
};

void app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
