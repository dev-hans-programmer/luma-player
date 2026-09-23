import type { PlaybackController } from './playback-controller';

let activeController: PlaybackController | null = null;

export function setActivePlaybackController(controller: PlaybackController): () => void {
  activeController = controller;

  return () => {
    if (activeController === controller) {
      activeController = null;
    }
  };
}

export function getActivePlaybackController(): PlaybackController | null {
  return activeController;
}
