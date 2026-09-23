import type { PlayerPreferencesPayload } from '@luma/contracts';
import { settingsStore } from '../state/settings-state';

export function updatePreferences(patch: Partial<PlayerPreferencesPayload>): void {
  settingsStore.setState((current) => ({ ...current, ...patch }));
  const preferences = settingsStore.getSnapshot();
  document.documentElement.dataset.theme = preferences.theme;
  void window.electronAPI.savePreferences(preferences).catch(() => undefined);
}
