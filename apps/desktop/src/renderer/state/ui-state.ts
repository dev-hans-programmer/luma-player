import { createExternalStore } from './external-store';

export interface UiState {
  readonly isSidebarOpen: boolean;
  readonly isSettingsOpen: boolean;
  readonly isCommandPaletteOpen: boolean;
}

export const uiStore = createExternalStore<UiState>({
  isSidebarOpen: true,
  isSettingsOpen: false,
  isCommandPaletteOpen: false,
});
