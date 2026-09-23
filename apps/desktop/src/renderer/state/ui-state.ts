import { createExternalStore } from './external-store';

export interface UiState {
  readonly isSidebarOpen: boolean;
  readonly isSettingsOpen: boolean;
  readonly isCommandPaletteOpen: boolean;
  readonly isImportingFolder: boolean;
  readonly importProgress: { readonly scanned: number; readonly imported: number } | null;
}

export const uiStore = createExternalStore<UiState>({
  isSidebarOpen: true,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
  isImportingFolder: false,
  importProgress: null,
});
