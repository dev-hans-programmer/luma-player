import { useState } from 'react';
import { openMediaFile, registerDroppedMediaFiles, setMediaError } from '../media/media-actions';
import { VideoPlayer } from '../playback/VideoPlayer';
import { useApplicationState, useUiState } from '../state/hooks';
import { uiStore } from '../state/ui-state';

interface DroppedFile extends File {
  readonly path?: string;
}

export function App(): React.JSX.Element {
  const { activeAsset, activeMetadata, appInfo, errorMessage, mediaErrorMessage, status } =
    useApplicationState();
  const { isSettingsOpen, isSidebarOpen } = useUiState();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLElement>): void => {
    event.preventDefault();
    setIsDragActive(false);
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => (file as DroppedFile).path)
      .filter((filePath): filePath is string => Boolean(filePath));

    if (paths.length === 0) {
      setMediaError(new Error('The dropped item does not contain a readable file path.'));
      return;
    }

    void registerDroppedMediaFiles(paths).catch(setMediaError);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>): void => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleOpenFile = (): void => {
    void openMediaFile().catch(setMediaError);
  };

  const handleToggleSidebar = (): void => {
    uiStore.setState((current) => ({ ...current, isSidebarOpen: !current.isSidebarOpen }));
  };

  return (
    <main
      className={`app-shell${isDragActive ? ' drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setIsDragActive(false)}
    >
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ◒
          </span>
          <span>Luma Player</span>
        </div>
        <div className="header-title" title={activeAsset?.displayName}>
          {activeAsset?.displayName ?? 'Ready for your next story'}
        </div>
        <div className="header-actions">
          <span className="connection-status" aria-live="polite">
            {status === 'ready' ? 'Ready' : status === 'error' ? 'Offline' : 'Starting'}
          </span>
          <button
            type="button"
            className="header-button"
            onClick={handleOpenFile}
            aria-label="Open media file"
          >
            + Open
          </button>
          <button type="button" className="header-button" onClick={handleToggleSidebar}>
            {isSidebarOpen ? 'Hide library' : 'Show library'}
          </button>
        </div>
      </header>

      <div className="player-layout">
        <section className="player-content" aria-labelledby="player-title">
          <div className="content-heading">
            <div>
              <p className="eyebrow">Local media</p>
              <h1 id="player-title">
                {activeAsset ? 'Now playing' : 'Make room for a good story'}
              </h1>
            </div>
            {activeAsset && activeMetadata ? (
              <span className="media-facts">
                {activeMetadata.width && activeMetadata.height
                  ? `${activeMetadata.width} × ${activeMetadata.height}`
                  : 'Media'}
              </span>
            ) : null}
          </div>
          {activeAsset ? (
            <VideoPlayer asset={activeAsset} onChooseAnother={handleOpenFile} />
          ) : (
            <div className="drop-target">
              <span className="drop-icon" aria-hidden="true">
                ↥
              </span>
              <strong>Drop a media file here</strong>
              <p>or click to browse your Mac</p>
              <button type="button" onClick={handleOpenFile}>
                Open media file
              </button>
              <small>MP4, MOV, WebM, MKV, MP3, M4A, WAV, FLAC, and more.</small>
            </div>
          )}
          {mediaErrorMessage ? (
            <div className="media-error" role="alert">
              <strong>We couldn’t open that media.</strong>
              <span>{mediaErrorMessage}</span>
              <button type="button" onClick={handleOpenFile}>
                Choose another file
              </button>
            </div>
          ) : null}
          {status === 'error' ? (
            <p className="app-error" role="alert">
              {errorMessage ?? 'Application initialization failed.'}
            </p>
          ) : null}
        </section>

        {isSidebarOpen ? (
          <aside className="library-sidebar" aria-label="Library">
            <div className="sidebar-heading">
              <div>
                <p className="eyebrow">Your library</p>
                <h2>Up next</h2>
              </div>
              <span className="sidebar-count">{activeAsset ? '1' : '0'}</span>
            </div>
            {activeAsset ? (
              <div className="library-item active-library-item">
                <span className="library-item-icon" aria-hidden="true">
                  ▷
                </span>
                <span>
                  <strong>{activeAsset.displayName}</strong>
                  <small>
                    {activeMetadata?.durationMs ? 'Ready to continue' : 'Loading metadata…'}
                  </small>
                </span>
              </div>
            ) : (
              <div className="sidebar-empty">
                <span aria-hidden="true">✦</span>
                <p>Your recent files will appear here.</p>
                <small>History and playlists arrive in the next phase.</small>
              </div>
            )}
            <div className="sidebar-footer">
              <span>{appInfo?.version ? `Luma ${appInfo.version}` : 'Luma Player'}</span>
              <button type="button" onClick={() => window.electronAPI.window.toggleFullscreen()}>
                Focus mode
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {isSettingsOpen ? (
        <div className="settings-scrim" role="presentation">
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="settings-heading">
              <div>
                <p className="eyebrow">Preferences</p>
                <h2 id="settings-title">Settings</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  uiStore.setState((current) => ({ ...current, isSettingsOpen: false }))
                }
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            <p>Playback preferences and appearance controls will be connected in Phase 6.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
