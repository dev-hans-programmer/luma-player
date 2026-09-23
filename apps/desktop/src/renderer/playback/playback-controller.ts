import type { MediaAssetId, MediaMetadata, PlaybackEvent, PlaybackState } from '@luma/domain';

export type PlaybackControllerEvent =
  | PlaybackEvent
  | { readonly type: 'metadata'; readonly state: PlaybackState; readonly metadata: MediaMetadata };

type PlaybackListener = (event: PlaybackControllerEvent) => void;
type PlaybackDiagnosticReporter = (diagnostic: {
  readonly userMessage: string;
  readonly diagnosticMessage: string;
}) => void;

const INITIAL_STATE: PlaybackState = {
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
};

const HIGH_FREQUENCY_THROTTLE_MS = 50;

export const PLAYBACK_SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;

interface AudioTrackLike {
  readonly id?: string;
  readonly label?: string;
  readonly language?: string;
  enabled: boolean;
}

interface AudioTrackListLike {
  readonly length: number;
  readonly [index: number]: AudioTrackLike;
}

interface TextTrackLike {
  readonly id?: string;
  readonly label?: string;
  readonly language?: string;
  mode: 'disabled' | 'hidden' | 'showing';
}

interface TextTrackListLike {
  readonly length: number;
  readonly [index: number]: TextTrackLike;
}

type VideoElementWithTracks = HTMLVideoElement & {
  readonly audioTracks?: AudioTrackListLike;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSafeDuration(element: HTMLVideoElement): number | null {
  return Number.isFinite(element.duration) ? Math.max(0, element.duration) : null;
}

function getBufferedTime(element: HTMLVideoElement): number {
  if (element.buffered.length === 0) {
    return 0;
  }

  return Math.max(0, element.buffered.end(element.buffered.length - 1) * 1000);
}

function createElementMetadata(element: HTMLVideoElement): MediaMetadata {
  return {
    durationMs: getSafeDuration(element) === null ? null : getSafeDuration(element),
    width: element.videoWidth || null,
    height: element.videoHeight || null,
    hasAudio: true,
    audioTracks: [],
    subtitleTracks: [],
    chapters: [],
  };
}

export class PlaybackController {
  private element: HTMLVideoElement | null = null;
  private assetId: MediaAssetId | null = null;
  private state: PlaybackState = INITIAL_STATE;
  private readonly listeners = new Set<PlaybackListener>();
  private highFrequencyTimer: ReturnType<typeof setTimeout> | null = null;
  private highFrequencyEvent: 'timeupdate' | 'progress' | null = null;

  public constructor(private readonly reportDiagnostic?: PlaybackDiagnosticReporter) {}

  public attach(element: HTMLVideoElement): void {
    if (this.element === element) {
      return;
    }

    this.detach();
    this.element = element;
    element.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    element.addEventListener('canplay', this.handleCanPlay);
    element.addEventListener('waiting', this.handleWaiting);
    element.addEventListener('stalled', this.handleStalled);
    element.addEventListener('playing', this.handlePlaying);
    element.addEventListener('pause', this.handlePause);
    element.addEventListener('timeupdate', this.handleTimeUpdate);
    element.addEventListener('progress', this.handleProgress);
    element.addEventListener('ended', this.handleEnded);
    element.addEventListener('error', this.handleError);
  }

  public detach(): void {
    this.clearHighFrequencyTimer();

    if (!this.element) {
      return;
    }

    this.element.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.element.removeEventListener('canplay', this.handleCanPlay);
    this.element.removeEventListener('waiting', this.handleWaiting);
    this.element.removeEventListener('stalled', this.handleStalled);
    this.element.removeEventListener('playing', this.handlePlaying);
    this.element.removeEventListener('pause', this.handlePause);
    this.element.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.element.removeEventListener('progress', this.handleProgress);
    this.element.removeEventListener('ended', this.handleEnded);
    this.element.removeEventListener('error', this.handleError);
    this.element.pause();
    this.element = null;
    this.assetId = null;
    this.state = INITIAL_STATE;
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public load(assetId: MediaAssetId, source: string): void {
    const element = this.requireElement();
    this.clearHighFrequencyTimer();
    element.pause();
    element.removeAttribute('src');
    element.load();
    this.assetId = assetId;
    this.updateState({
      status: 'loading',
      assetId,
      currentTimeMs: 0,
      durationMs: null,
      bufferedTimeMs: 0,
      errorMessage: null,
    });
    element.src = source;
    element.load();
  }

  public async play(): Promise<void> {
    const element = this.requireElement();

    try {
      await element.play();
    } catch (error) {
      this.handlePlaybackFailure(error);
      throw error;
    }
  }

  public pause(): void {
    this.requireElement().pause();
  }

  public async togglePlayback(): Promise<void> {
    if (this.requireElement().paused) {
      await this.play();
      return;
    }

    this.pause();
  }

  public seek(positionMs: number): void {
    const element = this.requireElement();
    const duration = getSafeDuration(element);
    const nextPosition =
      duration === null ? Math.max(0, positionMs) : clamp(positionMs, 0, duration * 1000);
    element.currentTime = nextPosition / 1000;
    this.updateState({ currentTimeMs: nextPosition });
  }

  public setVolume(volume: number): void {
    const nextVolume = clamp(volume, 0, 1);
    this.requireElement().volume = nextVolume;
    this.updateState({ volume: nextVolume });
  }

  public setMuted(isMuted: boolean): void {
    this.requireElement().muted = isMuted;
    this.updateState({ isMuted });
  }

  public setPlaybackRate(rate: number): void {
    const nextRate = clamp(rate, 0.25, 4);
    this.requireElement().playbackRate = nextRate;
    this.updateState({ playbackRate: nextRate });
  }

  public setLooping(isLooping: boolean): void {
    this.requireElement().loop = isLooping;
    this.updateState({ isLooping });
  }

  public setAudioTrack(trackId: string): boolean {
    const tracks = (this.requireElement() as VideoElementWithTracks).audioTracks;
    if (!tracks) {
      return false;
    }

    let matched = false;
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      if (!track) {
        continue;
      }
      const id = track.id || `audio-${index}`;
      track.enabled = id === trackId;
      matched = matched || id === trackId;
    }
    return matched;
  }

  public setSubtitleTrack(trackId: string | null): boolean {
    const tracks = (this.requireElement() as HTMLVideoElement).textTracks as
      TextTrackListLike | undefined;
    if (!tracks) {
      return false;
    }

    let matched = trackId === null;
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      if (!track) {
        continue;
      }
      const id = track.id || `subtitle-${index}`;
      const isSelected = trackId !== null && id === trackId;
      track.mode = isSelected ? 'showing' : 'disabled';
      matched = matched || isSelected;
    }
    return matched;
  }

  public supportsPictureInPicture(): boolean {
    const element = this.requireElement() as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<unknown>;
    };
    return Boolean(document.pictureInPictureEnabled && element.requestPictureInPicture);
  }

  public async requestFullscreen(): Promise<void> {
    const element = this.requireElement();

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await (element.parentElement ?? element).requestFullscreen();
  }

  public async requestPictureInPicture(): Promise<void> {
    const element = this.requireElement() as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<unknown>;
    };
    const requestPictureInPicture = element.requestPictureInPicture;

    if (!requestPictureInPicture) {
      return;
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }

    await requestPictureInPicture.call(element);
  }

  private readonly handleLoadedMetadata = (): void => {
    const element = this.requireElement();
    this.updateState({
      status: 'ready',
      durationMs: getSafeDuration(element) === null ? null : getSafeDuration(element),
      bufferedTimeMs: getBufferedTime(element),
    });
    this.emit({ type: 'loadedmetadata', state: this.state });
    this.emit({ type: 'metadata', state: this.state, metadata: createElementMetadata(element) });
  };

  private readonly handleCanPlay = (): void => {
    if (this.state.status !== 'playing') {
      this.updateState({ status: 'ready' });
    }
    this.emit({ type: 'canplay', state: this.state });
  };

  private readonly handleWaiting = (): void => {
    this.updateState({ status: 'waiting' });
    this.emit({ type: 'waiting', state: this.state });
  };

  private readonly handleStalled = (): void => {
    this.updateState({ status: 'waiting' });
    this.emit({ type: 'stalled', state: this.state });
  };

  private readonly handlePlaying = (): void => {
    this.updateState({ status: 'playing' });
    this.emit({ type: 'playing', state: this.state });
  };

  private readonly handlePause = (): void => {
    if (this.state.status !== 'ended') {
      this.updateState({ status: 'paused' });
    }
    this.emit({ type: 'paused', state: this.state });
  };

  private readonly handleTimeUpdate = (): void => {
    this.scheduleHighFrequencyEvent('timeupdate');
  };

  private readonly handleProgress = (): void => {
    this.scheduleHighFrequencyEvent('progress');
  };

  private readonly handleEnded = (): void => {
    this.updateState({
      status: 'ended',
      currentTimeMs: getSafeDuration(this.requireElement()) ?? 0,
    });
    this.emit({ type: 'ended', state: this.state });
  };

  private readonly handleError = (): void => {
    const error = this.requireElement().error;
    const diagnosticMessage = error?.message ?? 'The media element reported an unknown error.';
    const userMessage =
      error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        ? 'This media format is not supported.'
        : error?.code === MediaError.MEDIA_ERR_NETWORK
          ? 'The media file could not be read. It may have moved or become unavailable.'
          : 'The media could not be played.';
    this.updateState({ status: 'error', errorMessage: userMessage });
    this.emit({ type: 'error', state: this.state });
    this.reportDiagnostic?.({ userMessage, diagnosticMessage });
  };

  private handlePlaybackFailure(error: unknown): void {
    const diagnosticMessage = error instanceof Error ? error.message : String(error);
    this.updateState({ status: 'error', errorMessage: 'Playback could not be started.' });
    this.emit({ type: 'error', state: this.state });
    this.reportDiagnostic?.({
      userMessage: 'Playback could not be started.',
      diagnosticMessage,
    });
  }

  private scheduleHighFrequencyEvent(type: 'timeupdate' | 'progress'): void {
    this.highFrequencyEvent = type;

    if (this.highFrequencyTimer) {
      return;
    }

    this.highFrequencyTimer = setTimeout(() => {
      this.highFrequencyTimer = null;
      const eventType = this.highFrequencyEvent;
      this.highFrequencyEvent = null;
      const element = this.element;

      if (!element || !eventType) {
        return;
      }

      this.updateState({
        currentTimeMs: element.currentTime * 1000,
        bufferedTimeMs: getBufferedTime(element),
      });
      this.emit({ type: eventType, state: this.state });
    }, HIGH_FREQUENCY_THROTTLE_MS);
  }

  private clearHighFrequencyTimer(): void {
    if (this.highFrequencyTimer) {
      clearTimeout(this.highFrequencyTimer);
      this.highFrequencyTimer = null;
    }
    this.highFrequencyEvent = null;
  }

  private updateState(patch: Partial<PlaybackState>): void {
    this.state = { ...this.state, ...patch };
  }

  private emit(event: PlaybackControllerEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private requireElement(): HTMLVideoElement {
    if (!this.element) {
      throw new Error('PlaybackController must be attached to a video element first.');
    }

    return this.element;
  }
}
