import { writeFile } from 'node:fs/promises';
import { dialog, type BrowserWindow } from 'electron';
import { getLogSnapshot, logger } from './logger';

export async function exportDiagnostics(window: BrowserWindow | null): Promise<void> {
  if (!window || window.isDestroyed()) {
    return;
  }

  const result = await dialog.showSaveDialog(window, {
    title: 'Export Luma Player Diagnostics',
    defaultPath: 'luma-player-diagnostics.log',
    filters: [{ name: 'Log files', extensions: ['log', 'txt'] }],
  });

  if (result.canceled || !result.filePath) {
    return;
  }

  try {
    await writeFile(result.filePath, getLogSnapshot(), 'utf8');
    logger.info('Diagnostics exported');
  } catch (error) {
    logger.error('Failed to export diagnostics', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
