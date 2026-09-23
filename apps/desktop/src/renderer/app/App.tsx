import { useState } from 'react';
import {
  importMediaFolder,
  openMediaFile,
  openRecentMedia,
  registerDroppedMediaFiles,
  setMediaError,
} from '../media/media-actions';
import { VideoPlayer } from '../playback/VideoPlayer';
import {
  addAssetToPlaylist,
  createPlaylist,
  getAdjacentPlaylistItem,
  removePlaylistItem,
  reorderPlaylistItem,
  setPlaylistActiveItem,
} from '../playlists/playlist-actions';
import { applicationStore } from '../state/app-state';
import {
  useApplicationState,
  usePlaylistState,
  useSettingsState,
  useUiState,
} from '../state/hooks';
import { updatePreferences } from '../settings/settings-actions';
import { uiStore } from '../state/ui-state';

interface DroppedFile extends File {
  readonly path?: string;
}

export function App(): React.JSX.Element {
  const {
    activeAsset,
    activeMetadata,
    appInfo,
    errorMessage,
    mediaErrorMessage,
    recentFiles,
    status,
  } = useApplicationState();
  const { importProgress, isImportingFolder, isSettingsOpen, isSidebarOpen } = useUiState();
  const settings = useSettingsState();
  const { activePlaylistId, playlists } = usePlaylistState();
  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId);
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

  const handleImportFolder = (): void => {
    void importMediaFolder().catch(setMediaError);
  };

  const handleClearRecentFiles = (): void => {
    void window.electronAPI
      .clearRecentFiles()
      .then(() => applicationStore.setState((current) => ({ ...current, recentFiles: [] })))
      .catch(setMediaError);
  };

  const openPlaylistItem = (
    item: NonNullable<ReturnType<typeof getAdjacentPlaylistItem>>,
  ): void => {
    void openRecentMedia(item.assetId)
      .then(() => {
        if (activePlaylist) {
          void setPlaylistActiveItem(activePlaylist.id, item.id);
        }
      })
      .catch(setMediaError);
  };

  const previousItem = activeAsset
    ? getAdjacentPlaylistItem(activePlaylist, activeAsset.id, -1)
    : null;
  const nextItem = activeAsset ? getAdjacentPlaylistItem(activePlaylist, activeAsset.id, 1) : null;

  const handleCreatePlaylist = (): void => {
    const name = window.prompt('Playlist name', 'New playlist');
    if (name !== null) {
      void createPlaylist(name).catch(setMediaError);
    }
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
            <VideoPlayer
              asset={activeAsset}
              onChooseAnother={handleOpenFile}
              onPrevious={previousItem ? () => openPlaylistItem(previousItem) : undefined}
              onNext={nextItem ? () => openPlaylistItem(nextItem) : undefined}
              onPlaybackEnded={() => {
                const repeatItem = nextItem ?? activePlaylist?.items[0] ?? null;
                if (repeatItem) {
                  openPlaylistItem(repeatItem);
                }
              }}
            />
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
            <div className="recent-files-section">
              <div className="recent-files-heading">
                <span>Recent files</span>
                <button type="button" onClick={handleImportFolder} disabled={isImportingFolder}>
                  {isImportingFolder ? 'Importing…' : 'Import folder'}
                </button>
                {recentFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearRecentFiles}
                    disabled={isImportingFolder}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {recentFiles.length > 0 ? (
                <div className="recent-file-list">
                  {recentFiles.slice(0, 5).map((recentFile) => (
                    <button
                      key={recentFile.asset.id}
                      type="button"
                      className="recent-file-button"
                      onClick={() => void openRecentMedia(recentFile.asset.id).catch(setMediaError)}
                    >
                      <span aria-hidden="true">◌</span>
                      <span>{recentFile.asset.displayName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <small className="recent-empty">No recent files yet.</small>
              )}
              {isImportingFolder && importProgress ? (
                <small className="import-progress" aria-live="polite">
                  Scanned {importProgress.scanned} · imported {importProgress.imported}
                </small>
              ) : null}
              {isImportingFolder ? (
                <button type="button" onClick={() => void window.electronAPI.cancelFolderImport()}>
                  Cancel import
                </button>
              ) : null}
            </div>
            <div className="recent-files-section playlist-section">
              <div className="recent-files-heading">
                <span>Playlists</span>
                <button type="button" onClick={handleCreatePlaylist}>
                  New
                </button>
              </div>
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <div className="playlist-card" key={playlist.id}>
                    <div className="playlist-card-heading">
                      <strong>{playlist.name}</strong>
                      {activeAsset ? (
                        <button
                          type="button"
                          onClick={() =>
                            void addAssetToPlaylist(playlist.id, activeAsset).catch(setMediaError)
                          }
                        >
                          + current
                        </button>
                      ) : null}
                    </div>
                    {playlist.items.length > 0 ? (
                      playlist.items.map((item) => (
                        <div className="playlist-item-row" key={item.id}>
                          <button
                            type="button"
                            className="playlist-item-button"
                            onClick={() => openPlaylistItem(item)}
                            disabled={
                              !recentFiles.some(
                                (recentFile) => recentFile.asset.id === item.assetId,
                              )
                            }
                          >
                            {item.title}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void reorderPlaylistItem(playlist.id, item.id, -1).catch(
                                setMediaError,
                              )
                            }
                            aria-label={`Move ${item.title} up`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void reorderPlaylistItem(playlist.id, item.id, 1).catch(setMediaError)
                            }
                            aria-label={`Move ${item.title} down`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void removePlaylistItem(playlist.id, item.id).catch(setMediaError)
                            }
                            aria-label={`Remove ${item.title}`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <small className="recent-empty">Add the current file to begin.</small>
                    )}
                  </div>
                ))
              ) : (
                <small className="recent-empty">Create a playlist for a queue.</small>
              )}
            </div>
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
            <div className="settings-form">
              <label>
                Appearance
                <select
                  value={settings.theme}
                  onChange={(event) =>
                    updatePreferences({ theme: event.target.value as typeof settings.theme })
                  }
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.rememberPlaybackPosition}
                  onChange={(event) =>
                    updatePreferences({ rememberPlaybackPosition: event.target.checked })
                  }
                />
                Remember playback position
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={(event) => updatePreferences({ autoplay: event.target.checked })}
                />
                Autoplay when media is ready
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.autoHideControls}
                  onChange={(event) =>
                    updatePreferences({ autoHideControls: event.target.checked })
                  }
                />
                Hide controls while playing
              </label>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
