import type { ElectronAPI } from '@luma/contracts';

declare global {
  interface Window {
    readonly electronAPI: ElectronAPI;
  }
}

export {};
