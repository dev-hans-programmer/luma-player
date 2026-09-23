import type { PlayerPreferences, PreferencesRepository } from '@luma/domain';
import { JsonFileStore } from './json-file-store';

const PREFERENCES_VERSION = 1;

interface PersistedPreferences {
  readonly version: number;
  readonly preferences: unknown;
}

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  theme: 'system',
  rememberPlaybackPosition: true,
  autoplay: false,
  preferredVolume: 1,
  preferredPlaybackRate: 1,
  showSidebar: true,
  autoHideControls: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPreferences(value: unknown): value is PlayerPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.theme === 'system' || value.theme === 'light' || value.theme === 'dark') &&
    typeof value.rememberPlaybackPosition === 'boolean' &&
    typeof value.autoplay === 'boolean' &&
    typeof value.preferredVolume === 'number' &&
    value.preferredVolume >= 0 &&
    value.preferredVolume <= 1 &&
    typeof value.preferredPlaybackRate === 'number' &&
    value.preferredPlaybackRate >= 0.25 &&
    value.preferredPlaybackRate <= 4 &&
    typeof value.showSidebar === 'boolean' &&
    typeof value.autoHideControls === 'boolean'
  );
}

export class PreferencesService implements PreferencesRepository<PlayerPreferences> {
  private readonly store = new JsonFileStore<PersistedPreferences>('preferences.json');

  public async load(): Promise<PlayerPreferences> {
    const persisted = await this.store.read();

    if (
      !persisted ||
      persisted.version !== PREFERENCES_VERSION ||
      !isPreferences(persisted.preferences)
    ) {
      return DEFAULT_PLAYER_PREFERENCES;
    }

    return persisted.preferences;
  }

  public async save(preferences: PlayerPreferences): Promise<void> {
    await this.store.write({ version: PREFERENCES_VERSION, preferences });
  }
}
