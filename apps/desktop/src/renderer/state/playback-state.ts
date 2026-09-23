import type { PlaybackState } from '@luma/domain';
import { createExternalStore } from './external-store';

export const playbackStore = createExternalStore<PlaybackState>({
  status: 'idle',
  assetId: null,
  currentTimeMs: 0,
  durationMs: null,
  bufferedTimeMs: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isLooping: false,
  errorMessage: null,
});
