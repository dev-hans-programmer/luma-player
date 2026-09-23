import type { AppCommandId, AppInfo } from '@luma/contracts';
import { createExternalStore } from './external-store';

export interface ApplicationState {
  readonly status: 'starting' | 'ready' | 'error';
  readonly appInfo: AppInfo | null;
  readonly lastCommand: AppCommandId | null;
  readonly errorMessage: string | null;
}

export const applicationStore = createExternalStore<ApplicationState>({
  status: 'starting',
  appInfo: null,
  lastCommand: null,
  errorMessage: null,
});
