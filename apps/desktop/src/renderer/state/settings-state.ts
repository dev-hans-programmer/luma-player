import type { PlayerPreferences } from '@luma/domain';
import { createExternalStore } from './external-store';

export const settingsStore = createExternalStore<PlayerPreferences>({
  theme: 'system',
  rememberPlaybackPosition: true,
  autoplay: false,
  preferredVolume: 1,
  preferredPlaybackRate: 1,
  showSidebar: true,
  autoHideControls: true,
});
