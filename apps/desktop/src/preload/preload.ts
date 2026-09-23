import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type AppCommandId,
  type ElectronAPI,
  type RendererErrorPayload,
} from '@luma/contracts';

const electronAPI: ElectronAPI = {
  platform: process.platform,
  electronVersion: process.versions.electron,
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.appGetInfo),
  reportError: (payload: RendererErrorPayload) => {
    ipcRenderer.send(IPC_CHANNELS.rendererError, payload);
  },
  onMenuCommand: (listener: (command: AppCommandId) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: AppCommandId): void => {
      listener(command);
    };

    ipcRenderer.on(IPC_CHANNELS.menuCommand, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.menuCommand, handler);
  },
  window: {
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleFullscreen),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
  },
};

// Keep this bridge intentionally small. Privileged capabilities are added through
// explicit, validated methods in later phases rather than exposing Electron wholesale.
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
