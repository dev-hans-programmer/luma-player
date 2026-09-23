import { useApplicationState } from '../state/hooks';

export function App(): React.JSX.Element {
  const { appInfo, errorMessage, lastCommand, status } = useApplicationState();

  return (
    <main className="app-shell">
      <section className="scaffold-card" aria-labelledby="scaffold-title">
        <p className="eyebrow">Phase 3 architecture</p>
        <h1 id="scaffold-title">Luma Player</h1>
        <p>The domain, IPC, and renderer state boundaries are ready for playback features.</p>
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
