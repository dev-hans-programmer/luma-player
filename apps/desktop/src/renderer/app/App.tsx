import { useApplicationState } from '../state/hooks';
import { openMediaFile, registerDroppedMediaFiles, setMediaError } from '../media/media-actions';
import { VideoPlayer } from '../playback/VideoPlayer';

interface DroppedFile extends File {
  readonly path?: string;
}

export function App(): React.JSX.Element {
  const { activeAsset, appInfo, errorMessage, lastCommand, mediaErrorMessage, status } =
    useApplicationState();

  const handleDrop = (event: React.DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => (file as DroppedFile).path)
      .filter((filePath): filePath is string => Boolean(filePath));

    if (paths.length === 0) {
      setMediaError(new Error('The dropped item does not contain a readable file path.'));
      return;
    }

    void registerDroppedMediaFiles(paths).catch(setMediaError);
  };

  const handleOpenFile = (): void => {
    void openMediaFile().catch(setMediaError);
  };

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <section className="scaffold-card" aria-labelledby="scaffold-title">
        <p className="eyebrow">Phase 3 architecture</p>
        <h1 id="scaffold-title">Luma Player</h1>
        {activeAsset ? (
          <VideoPlayer asset={activeAsset} onChooseAnother={handleOpenFile} />
        ) : (
          <div className="drop-target">
            <p>Drop a local video or audio file here to begin.</p>
            <button type="button" onClick={handleOpenFile}>
              Open media file
            </button>
            <small>Supported: MP4, MOV, WebM, MKV, MP3, M4A, WAV, FLAC, and more.</small>
          </div>
        )}
        {mediaErrorMessage ? (
          <p className="media-error" role="alert">
            {mediaErrorMessage}
          </p>
        ) : null}
        <p className="command-status" aria-live="polite">
          {status === 'ready' && appInfo
            ? `${appInfo.name} ${appInfo.version}`
            : status === 'error'
              ? (errorMessage ?? 'Application initialization failed.')
              : 'Initializing application services…'}
        </p>
        <p className="command-status" aria-live="polite">
          {lastCommand
            ? `Last menu command: ${lastCommand}`
            : 'Waiting for an application command.'}
        </p>
      </section>
    </main>
  );
}
