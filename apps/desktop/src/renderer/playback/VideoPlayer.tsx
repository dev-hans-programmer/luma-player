import { useEffect, useRef, useState } from 'react';
import type { MediaAssetPayload } from '@luma/contracts';
import { applicationStore } from '../state/app-state';
import { playbackStore } from '../state/playback-state';
import { usePlaybackState } from '../state/hooks';
import { PlaybackController } from './playback-controller';
import { setActivePlaybackController } from './playback-controller-registry';

interface VideoPlayerProps {
  readonly asset: MediaAssetPayload;
  readonly onChooseAnother: () => void;
}

export function VideoPlayer({ asset, onChooseAnother }: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<PlaybackController | null>(null);
  const sourceRef = useRef<string | null>(null);
  const playbackState = usePlaybackState();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durationMs = playbackState.durationMs ?? 0;
  const currentTimeMs = scrubValue ?? playbackState.currentTimeMs;
  const progressPercent = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;
  const bufferedPercent = durationMs > 0 ? (playbackState.bufferedTimeMs / durationMs) * 100 : 0;

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const scheduleControlsHide = (): void => {
    setControlsVisible(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    if (playbackState.status === 'playing' && !isScrubbing) {
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 2800);
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const controller = new PlaybackController(({ userMessage, diagnosticMessage }) => {
      window.electronAPI.reportError({
        message: userMessage,
        stack: diagnosticMessage,
        source: 'error',
      });
    });
    controller.attach(video);
    controllerRef.current = controller;
    const removeActiveController = setActivePlaybackController(controller);
    const removeListener = controller.subscribe((event) => {
      playbackStore.setState(event.state);

      if (event.type === 'metadata') {
        applicationStore.setState((current) => ({ ...current, activeMetadata: event.metadata }));
      }
    });

    return () => {
      removeListener();
      removeActiveController();
      controller.detach();
      controllerRef.current = null;
      sourceRef.current = null;
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    let cancelled = false;

    if (!controller) {
      return;
    }

    playbackStore.setState((current) => ({
      ...current,
      status: 'loading',
      assetId: asset.id,
      errorMessage: null,
    }));

    void window.electronAPI
      .getMediaSource(asset.id)
      .then((source) => {
        if (cancelled) {
          return;
        }

        sourceRef.current = source;
        controller.load(asset.id, source);
        return window.electronAPI.getMediaMetadata(asset.id);
      })
      .then((metadata) => {
        if (!cancelled && metadata) {
          applicationStore.setState((current) => ({ ...current, activeMetadata: metadata }));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        applicationStore.setState((current) => ({
          ...current,
          mediaErrorMessage:
            error instanceof Error ? error.message : 'The media could not be opened.',
        }));
        playbackStore.setState((current) => ({
          ...current,
          status: 'error',
          errorMessage: 'The media file could not be opened.',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  const togglePlayback = (): void => {
    void controllerRef.current?.togglePlayback().catch(() => undefined);
  };

  const retry = (): void => {
    if (sourceRef.current) {
      controllerRef.current?.load(asset.id, sourceRef.current);
    }
  };

  const handleSeek = (value: number): void => {
    setScrubValue(value);
    controllerRef.current?.seek(value);
  };

  const handleSeekCommit = (): void => {
    setIsScrubbing(false);
    setScrubValue(null);
    scheduleControlsHide();
  };

  const handleVolume = (value: number): void => {
    controllerRef.current?.setVolume(value);
  };

  const handlePlaybackRate = (value: number): void => {
    controllerRef.current?.setPlaybackRate(value);
  };

  const toggleMute = (): void => {
    controllerRef.current?.setMuted(!playbackState.isMuted);
  };

  const toggleLoop = (): void => {
    controllerRef.current?.setLooping(!playbackState.isLooping);
    setIsMoreMenuOpen(false);
  };

  return (
    <section
      className={`player-surface${controlsVisible || playbackState.status !== 'playing' ? '' : ' controls-hidden'}`}
      aria-label={`Playing ${asset.displayName}`}
      onMouseMove={scheduleControlsHide}
      onFocusCapture={() => setControlsVisible(true)}
      onMouseLeave={() => {
        if (playbackState.status === 'playing' && !isScrubbing) {
          setControlsVisible(false);
        }
      }}
    >
      <video
        ref={videoRef}
        className="player-video"
        playsInline
        preload="metadata"
        aria-label={asset.displayName}
        onClick={togglePlayback}
        onDoubleClick={() => void controllerRef.current?.requestFullscreen()}
      />
      <div className={`player-status status-${playbackState.status}`} aria-live="polite">
        {playbackState.status === 'error' ? playbackState.errorMessage : playbackState.status}
      </div>
      <div className="player-controls" aria-label="Playback controls">
        <div className="timeline-row">
          <span className="time-label">{formatTime(currentTimeMs)}</span>
          <div className="timeline-wrap">
            <div
              className="timeline-buffered"
              style={{ width: `${Math.min(100, bufferedPercent)}%` }}
              aria-hidden="true"
            />
            <div
              className="timeline-progress"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
              aria-hidden="true"
            />
            <input
              className="timeline-input"
              type="range"
              min={0}
              max={Math.max(0, durationMs)}
              step={100}
              value={Math.min(Math.max(0, currentTimeMs), Math.max(0, durationMs))}
              aria-label="Seek through media"
              aria-valuetext={`${formatTime(currentTimeMs)} of ${formatTime(durationMs)}`}
              onPointerDown={() => {
                setIsScrubbing(true);
                setControlsVisible(true);
              }}
              onChange={(event) => handleSeek(Number(event.target.value))}
              onPointerUp={handleSeekCommit}
              onKeyUp={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleSeekCommit();
                }
              }}
              disabled={durationMs <= 0}
            />
          </div>
          <span className="time-label">{formatTime(durationMs)}</span>
        </div>
        <div className="player-toolbar">
          <button type="button" className="control-button primary-control" onClick={togglePlayback}>
            <span aria-hidden="true">{playbackState.status === 'playing' ? '❚❚' : '▶'}</span>
            <span className="sr-only">{playbackState.status === 'playing' ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className="control-button"
            onClick={() => controllerRef.current?.seek(playbackState.currentTimeMs - 10_000)}
            aria-label="Skip back 10 seconds"
          >
            ↶
          </button>
          <button
            type="button"
            className="control-button"
            onClick={() => controllerRef.current?.seek(playbackState.currentTimeMs + 10_000)}
            aria-label="Skip forward 10 seconds"
          >
            ↷
          </button>
          <button type="button" className="control-button" disabled aria-label="Previous item">
            ‹
          </button>
          <button type="button" className="control-button" disabled aria-label="Next item">
            ›
          </button>
          <button
            type="button"
            className="control-button"
            onClick={toggleMute}
            aria-label="Toggle mute"
          >
            {playbackState.isMuted || playbackState.volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            className="volume-input"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={playbackState.volume}
            aria-label="Volume"
            aria-valuetext={`${Math.round(playbackState.volume * 100)} percent`}
            onChange={(event) => handleVolume(Number(event.target.value))}
          />
          <span className="player-title" title={asset.displayName}>
            {asset.displayName}
          </span>
          <select
            className="speed-select"
            value={playbackState.playbackRate}
            aria-label="Playback speed"
            onChange={(event) => handlePlaybackRate(Number(event.target.value))}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
          <button
            type="button"
            className="control-button"
            onClick={() => void controllerRef.current?.requestPictureInPicture()}
            aria-label="Picture in Picture"
          >
            ⧉
          </button>
          <button
            type="button"
            className="control-button"
            onClick={() => void controllerRef.current?.requestFullscreen()}
            aria-label="Toggle fullscreen"
          >
            ⛶
          </button>
          <button
            type="button"
            className="control-button"
            onClick={() => setIsMoreMenuOpen((open) => !open)}
            aria-label="More playback actions"
            aria-expanded={isMoreMenuOpen}
          >
            ⋯
          </button>
          {isMoreMenuOpen ? (
            <div className="more-menu" role="menu">
              <button type="button" role="menuitem" onClick={toggleLoop}>
                {playbackState.isLooping ? 'Disable loop' : 'Enable loop'}
              </button>
              <button type="button" role="menuitem" onClick={retry} disabled={!sourceRef.current}>
                Retry media
              </button>
              <button type="button" role="menuitem" onClick={onChooseAnother}>
                Choose another file
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
