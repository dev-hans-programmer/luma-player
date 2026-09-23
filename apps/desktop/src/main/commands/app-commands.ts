import type { BrowserWindow } from 'electron';
import type { AppCommandId } from '@luma/contracts';
import { IPC_CHANNELS } from '@luma/contracts';
import { exportDiagnostics } from '../services/diagnostics-service';

export function dispatchCommand(command: AppCommandId, window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (command === 'view.toggle-fullscreen') {
    window.setFullScreen(!window.isFullScreen());
    return;
  }

  if (command === 'app.export-diagnostics') {
    void exportDiagnostics(window);
    return;
  }

  window.webContents.send(IPC_CHANNELS.menuCommand, command);
}
