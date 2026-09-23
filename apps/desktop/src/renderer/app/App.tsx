import { useEffect, useState } from 'react';
import type { AppCommandId } from '@luma/contracts';

export function App(): React.JSX.Element {
  const [lastCommand, setLastCommand] = useState<AppCommandId | null>(null);

  useEffect(() => window.electronAPI.onMenuCommand(setLastCommand), []);

  return (
    <main className="app-shell">
      <section className="scaffold-card" aria-labelledby="scaffold-title">
        <p className="eyebrow">Phase 2 shell</p>
        <h1 id="scaffold-title">Luma Player</h1>
        <p>The secure Electron, React, and TypeScript application shell is ready.</p>
        <p className="command-status" aria-live="polite">
          {lastCommand
            ? `Last menu command: ${lastCommand}`
            : 'Waiting for an application command.'}
        </p>
      </section>
    </main>
  );
}
