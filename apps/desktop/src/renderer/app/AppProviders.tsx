import type { ReactNode } from 'react';

interface AppProvidersProps {
  readonly children: ReactNode;
}

// Keep provider composition in one place. Feature-specific providers can be
// added here without making the renderer entry point responsible for wiring.
export function AppProviders({ children }: AppProvidersProps): ReactNode {
  return children;
}
