import { contextBridge } from 'electron';
import type { ElectronAPI } from '@luma/contracts';

const electronAPI: ElectronAPI = {
  platform: process.platform,
  phase: 'phase-1-scaffold',
};

// Keep this bridge intentionally small. Privileged capabilities are added through
// explicit, validated methods in later phases rather than exposing Electron wholesale.
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
