import { useSyncExternalStore } from 'react';
import { applicationStore } from './app-state';
import { playbackStore } from './playback-state';
import { settingsStore } from './settings-state';
import { uiStore } from './ui-state';

export function useApplicationState() {
  return useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    applicationStore.getSnapshot,
  );
}

export function usePlaybackState() {
  return useSyncExternalStore(
    playbackStore.subscribe,
    playbackStore.getSnapshot,
    playbackStore.getSnapshot,
  );
}

export function useUiState() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot, uiStore.getSnapshot);
}

export function useSettingsState() {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );
}
