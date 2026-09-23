import { useEffect, useRef } from 'react';
import type { MediaAssetPayload } from '@luma/contracts';
import { applicationStore } from '../state/app-state';
import { playbackStore } from '../state/playback-state';
import { usePlaybackState } from '../state/hooks';
import { PlaybackController } from './playback-controller';

interface VideoPlayerProps {
  readonly asset: MediaAssetPayload;
  readonly onChooseAnother: () => void;
}

export function VideoPlayer({ asset, onChooseAnother }: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<PlaybackController | null>(null);
  const sourceRef = useRef<string | null>(null);
  const playbackState = usePlaybackState();

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
    const removeListener = controller.subscribe((event) => {
      playbackStore.setState(event.state);

      if (event.type === 'metadata') {
        applicationStore.setState((current) => ({ ...current, activeMetadata: event.metadata }));
      }
    });

    return () => {
      removeListener();
      controller.detach();
      controllerRef.current = null;
      sourceRef.current = null;
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

  return (
    <section className="player-surface" aria-label={`Playing ${asset.displayName}`}>
      <video
        ref={videoRef}
        className="player-video"
        playsInline
        preload="metadata"
        aria-label={asset.displayName}
        onDoubleClick={() => void controllerRef.current?.requestFullscreen()}
      />
      <div className="player-status" aria-live="polite">
        {playbackState.status === 'error' ? playbackState.errorMessage : playbackState.status}
      </div>
      <div className="player-toolbar">
        <button type="button" onClick={togglePlayback}>
          {playbackState.status === 'playing' ? 'Pause' : 'Play'}
        </button>
        <span className="player-title" title={asset.displayName}>
          {asset.displayName}
        </span>
        <button type="button" onClick={retry} disabled={!sourceRef.current}>
          Retry
        </button>
        <button type="button" onClick={onChooseAnother}>
          Choose another file
        </button>
      </div>
    </section>
  );
}
