import { useEffect, type ReactNode } from 'react';
import { applicationStore } from '../state/app-state';

interface AppProvidersProps {
  readonly children: ReactNode;
}

// Keep provider composition in one place. Feature-specific providers can be
// added here without making the renderer entry point responsible for wiring.
export function AppProviders({ children }: AppProvidersProps): ReactNode {
  useEffect(() => {
    const removeMenuListener = window.electronAPI.onMenuCommand((command) => {
      applicationStore.setState((current) => ({ ...current, lastCommand: command }));
    });

    void window.electronAPI
      .getAppInfo()
      .then((appInfo) => {
        applicationStore.setState((current) => ({ ...current, status: 'ready', appInfo }));
      })
      .catch((error: unknown) => {
        applicationStore.setState((current) => ({
          ...current,
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Application initialization failed.',
        }));
      });

    return removeMenuListener;
  }, []);

  return children;
}
