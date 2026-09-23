import type { PlayerPreferences } from '@luma/domain';
import { createExternalStore } from './external-store';

export const settingsStore = createExternalStore<PlayerPreferences>({
  rememberPlaybackPosition: true,
  autoplay: false,
  preferredVolume: 1,
  preferredPlaybackRate: 1,
});
