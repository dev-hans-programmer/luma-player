import { useEffect, useRef, useState } from 'react';
import type { MediaAssetPayload } from '@luma/contracts';
import { applicationStore } from '../state/app-state';
import { playbackStore } from '../state/playback-state';
import { useApplicationState, usePlaybackState, useSettingsState } from '../state/hooks';
import { PLAYBACK_SPEED_PRESETS, PlaybackController } from './playback-controller';
import { setActivePlaybackController } from './playback-controller-registry';

type RepeatMode = 'off' | 'one' | 'playlist';

interface VideoPlayerProps {
  readonly asset: MediaAssetPayload;
  readonly onChooseAnother: () => void;
  readonly onPrevious: (() => void) | undefined;
  readonly onNext: (() => void) | undefined;
  readonly onPlaybackEnded: (() => void) | undefined;
}

export function VideoPlayer({
  asset,
  onChooseAnother,
  onPrevious,
  onNext,
  onPlaybackEnded,
}: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controllerRef = useRef<PlaybackController | null>(null);
  const sourceRef = useRef<string | null>(null);
  const playbackState = usePlaybackState();
  const { activeMetadata } = useApplicationState();
  const settings = useSettingsState();
  const settingsRef = useRef(settings);
  const assetIdRef = useRef(asset.id);
  const pendingResumeRef = useRef<number | null>(null);
  const lastSavedPositionRef = useRef({ positionMs: 0, savedAt: 0 });
  const autoplayAssetRef = useRef<string | null>(null);
  const repeatModeRef = useRef<RepeatMode>('off');
  const onPlaybackEndedRef = useRef(onPlaybackEnded);
  const thumbnailVideoRef = useRef<HTMLVideoElement | null>(null);
  const thumbnailCacheRef = useRef(new Map<string, string>());
  const thumbnailRequestRef = useRef(0);
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [customRate, setCustomRate] = useState('');
  const [isPictureInPictureSupported, setIsPictureInPictureSupported] = useState(false);
  const [subtitleSources, setSubtitleSources] = useState<Readonly<Record<string, string>>>({});
  const [thumbnailPreview, setThumbnailPreview] = useState<{
    readonly dataUrl: string;
    readonly positionMs: number;
  } | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  settingsRef.current = settings;
  assetIdRef.current = asset.id;
  repeatModeRef.current = repeatMode;
  onPlaybackEndedRef.current = onPlaybackEnded;

  const savePlaybackPosition = (force = false, requestedAssetId = assetIdRef.current): void => {
    const currentSettings = settingsRef.current;
    const controller = controllerRef.current;
    const state = controller?.getState();

    if (!currentSettings.rememberPlaybackPosition || !state || state.assetId !== requestedAssetId) {
      return;
    }

    const durationMs = state.durationMs ?? 0;
    const positionMs = Math.max(0, state.currentTimeMs);
    const isNearCompletion = durationMs > 0 && positionMs >= Math.max(0, durationMs - 10_000);

    if (isNearCompletion) {
      void window.electronAPI.removePlaybackPosition(requestedAssetId).catch(() => undefined);
      return;
    }

    const now = Date.now();
    const movedEnough = Math.abs(positionMs - lastSavedPositionRef.current.positionMs) >= 5_000;
    const waitedEnough = now - lastSavedPositionRef.current.savedAt >= 5_000;

    if (!force && (!movedEnough || !waitedEnough)) {
      return;
    }

    lastSavedPositionRef.current = { positionMs, savedAt: now };
    void window.electronAPI
      .savePlaybackPosition({
        assetId: requestedAssetId,
        positionMs,
        updatedAtIso: new Date(now).toISOString(),
      })
      .catch(() => undefined);
  };

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

    if (
      settingsRef.current.autoHideControls &&
      playbackState.status === 'playing' &&
      !isScrubbing
    ) {
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
    controller.setVolume(settingsRef.current.preferredVolume);
    controller.setPlaybackRate(settingsRef.current.preferredPlaybackRate);
    setIsPictureInPictureSupported(controller.supportsPictureInPicture());
    controllerRef.current = controller;
    const removeActiveController = setActivePlaybackController(controller);
    const removeListener = controller.subscribe((event) => {
      playbackStore.setState(event.state);

      if (event.type === 'metadata') {
        applicationStore.setState((current) => ({ ...current, activeMetadata: event.metadata }));
      }

      if (event.type === 'loadedmetadata' && pendingResumeRef.current !== null) {
        const positionMs = pendingResumeRef.current;
        const durationMs = event.state.durationMs ?? 0;
        pendingResumeRef.current = null;

        if (durationMs > 0 && positionMs >= Math.max(0, durationMs - 10_000)) {
          void window.electronAPI.removePlaybackPosition(assetIdRef.current).catch(() => undefined);
        } else {
          controller.seek(positionMs);
        }
      }

      if (event.type === 'canplay' && settingsRef.current.autoplay) {
        if (autoplayAssetRef.current !== assetIdRef.current) {
          autoplayAssetRef.current = assetIdRef.current;
          void controller.play().catch(() => undefined);
        }
      }

      if (event.type === 'timeupdate') {
        savePlaybackPosition();
      }

      if (event.type === 'ended') {
        void window.electronAPI.removePlaybackPosition(assetIdRef.current).catch(() => undefined);
        if (repeatModeRef.current === 'playlist') {
          onPlaybackEndedRef.current?.();
        }
      }
    });

    return () => {
      savePlaybackPosition(true);
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

    pendingResumeRef.current = null;
    lastSavedPositionRef.current = { positionMs: 0, savedAt: 0 };
    autoplayAssetRef.current = null;
    thumbnailCacheRef.current.clear();
    thumbnailRequestRef.current += 1;
    if (thumbnailTimerRef.current) {
      clearTimeout(thumbnailTimerRef.current);
      thumbnailTimerRef.current = null;
    }
    setThumbnailPreview(null);

    void Promise.all([
      window.electronAPI.getMediaSource(asset.id),
      settingsRef.current.rememberPlaybackPosition
        ? window.electronAPI.getPlaybackPosition(asset.id)
        : Promise.resolve(null),
    ])
      .then(([source, savedPosition]) => {
        if (cancelled) {
          return;
        }

        pendingResumeRef.current = savedPosition?.positionMs ?? null;
        sourceRef.current = source;
        if (thumbnailVideoRef.current) {
          thumbnailVideoRef.current.src = source;
          thumbnailVideoRef.current.load();
        }
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
      savePlaybackPosition(true, asset.id);
    };
  }, [asset.id]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    controller.setVolume(settings.preferredVolume);
    controller.setPlaybackRate(settings.preferredPlaybackRate);
  }, [settings.preferredPlaybackRate, settings.preferredVolume]);

  useEffect(() => {
    let cancelled = false;
    setSubtitleSources({});
    const externalTracks =
      activeMetadata?.subtitleTracks.filter((track) => track.kind === 'external') ?? [];

    void Promise.all(
      externalTracks.map(async (track) => {
        try {
          return [
            track.id,
            await window.electronAPI.getSubtitleSource(asset.id, track.id),
          ] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setSubtitleSources(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, string] => entry !== null),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [activeMetadata, asset.id]);

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

  const requestThumbnail = (positionMs: number): void => {
    const video = thumbnailVideoRef.current;
    if (!video || durationMs <= 0) {
      return;
    }

    const safePositionMs = Math.min(Math.max(0, positionMs), durationMs);
    const cacheKey = `${asset.id}:${Math.round(safePositionMs / 5_000)}`;
    const cachedDataUrl = thumbnailCacheRef.current.get(cacheKey);
    if (cachedDataUrl) {
      setThumbnailPreview({ dataUrl: cachedDataUrl, positionMs: safePositionMs });
      return;
    }

    const requestId = thumbnailRequestRef.current + 1;
    thumbnailRequestRef.current = requestId;
    if (thumbnailTimerRef.current) {
      clearTimeout(thumbnailTimerRef.current);
    }
    const drawPreview = (): void => {
      if (thumbnailRequestRef.current !== requestId || video.readyState < 2) {
        return;
      }

      const canvas = document.createElement('canvas');
      const width = 192;
      const height = Math.max(
        96,
        Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * width),
      );
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      thumbnailCacheRef.current.set(cacheKey, dataUrl);
      setThumbnailPreview({ dataUrl, positionMs: safePositionMs });
    };

    thumbnailTimerRef.current = setTimeout(() => {
      thumbnailTimerRef.current = null;
      video.addEventListener('seeked', drawPreview, { once: true });
      video.currentTime = safePositionMs / 1000;
    }, 70);
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

  const changeRepeatMode = (mode: RepeatMode): void => {
    setRepeatMode(mode);
    controllerRef.current?.setLooping(mode === 'one');
    setIsMoreMenuOpen(false);
  };

  const handleCustomRate = (): void => {
    const rate = Number(customRate);
    if (Number.isFinite(rate) && rate >= 0.25 && rate <= 4) {
      handlePlaybackRate(rate);
      setCustomRate('');
    }
  };

  const currentChapter = activeMetadata?.chapters.find(
    (chapter) => currentTimeMs >= chapter.startMs && currentTimeMs < chapter.endMs,
  );

  return (
    <section
      className={`player-surface${controlsVisible || playbackState.status !== 'playing' ? '' : ' controls-hidden'}`}
      aria-label={`Playing ${asset.displayName}`}
      onMouseMove={scheduleControlsHide}
      onFocusCapture={() => setControlsVisible(true)}
      onMouseLeave={() => {
        if (
          settingsRef.current.autoHideControls &&
          playbackState.status === 'playing' &&
          !isScrubbing
        ) {
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
      >
        {activeMetadata?.subtitleTracks.map((track) => {
          const source = subtitleSources[track.id];
          return source ? (
            <track key={track.id} kind="subtitles" label={track.label} src={source} id={track.id} />
          ) : null;
        })}
      </video>
      <div className={`player-status status-${playbackState.status}`} aria-live="polite">
        {playbackState.status === 'error' ? playbackState.errorMessage : playbackState.status}
      </div>
      <video
        ref={thumbnailVideoRef}
        className="thumbnail-source"
        muted
        preload="metadata"
        aria-hidden="true"
      />
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
              onPointerMove={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const ratio = (event.clientX - bounds.left) / Math.max(1, bounds.width);
                requestThumbnail(ratio * durationMs);
              }}
              onPointerLeave={() => {
                thumbnailRequestRef.current += 1;
                if (thumbnailTimerRef.current) {
                  clearTimeout(thumbnailTimerRef.current);
                  thumbnailTimerRef.current = null;
                }
                setThumbnailPreview(null);
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
            {thumbnailPreview ? (
              <img
                className="thumbnail-preview"
                src={thumbnailPreview.dataUrl}
                alt={`Preview at ${formatTime(thumbnailPreview.positionMs)}`}
                style={{
                  left: `${Math.min(100, Math.max(0, (thumbnailPreview.positionMs / durationMs) * 100))}%`,
                }}
              />
            ) : null}
          </div>
          <span className="time-label">{formatTime(durationMs)}</span>
          {currentChapter ? <span className="chapter-label">{currentChapter.title}</span> : null}
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
          <button
            type="button"
            className="control-button"
            disabled={!onPrevious}
            onClick={onPrevious}
            aria-label="Previous item"
          >
            ‹
          </button>
          <button
            type="button"
            className="control-button"
            disabled={!onNext}
            onClick={onNext}
            aria-label="Next item"
          >
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
            {PLAYBACK_SPEED_PRESETS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
          <button
            type="button"
            className="control-button"
            onClick={() => void controllerRef.current?.requestPictureInPicture()}
            disabled={!isPictureInPictureSupported}
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
              <label className="menu-field">
                Speed
                <input
                  type="number"
                  min={0.25}
                  max={4}
                  step={0.05}
                  placeholder="Custom ×"
                  value={customRate}
                  onChange={(event) => setCustomRate(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCustomRate();
                    }
                  }}
                />
                <button type="button" onClick={handleCustomRate} disabled={!customRate}>
                  Apply
                </button>
              </label>
              <div className="menu-group" aria-label="Repeat mode">
                <span>Repeat</span>
                <button type="button" role="menuitem" onClick={() => changeRepeatMode('off')}>
                  {repeatMode === 'off' ? '✓ ' : ''}Off
                </button>
                <button type="button" role="menuitem" onClick={() => changeRepeatMode('one')}>
                  {repeatMode === 'one' ? '✓ ' : ''}Repeat one
                </button>
                <button type="button" role="menuitem" onClick={() => changeRepeatMode('playlist')}>
                  {repeatMode === 'playlist' ? '✓ ' : ''}Repeat playlist
                </button>
              </div>
              {activeMetadata?.audioTracks.length ? (
                <div className="menu-group" aria-label="Audio tracks">
                  <span>Audio</span>
                  {activeMetadata.audioTracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      role="menuitem"
                      onClick={() => controllerRef.current?.setAudioTrack(track.id)}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeMetadata?.subtitleTracks.length ? (
                <div className="menu-group" aria-label="Subtitle tracks">
                  <span>Subtitles</span>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => controllerRef.current?.setSubtitleTrack(null)}
                  >
                    Off
                  </button>
                  {activeMetadata.subtitleTracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      role="menuitem"
                      onClick={() => controllerRef.current?.setSubtitleTrack(track.id)}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeMetadata?.chapters.length ? (
                <div className="menu-group" aria-label="Chapters">
                  <span>Chapters</span>
                  {activeMetadata.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      role="menuitem"
                      onClick={() => controllerRef.current?.seek(chapter.startMs)}
                    >
                      {chapter.title}
                    </button>
                  ))}
                </div>
              ) : null}
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
