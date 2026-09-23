import type {
  AppCommandId,
  AppInfo,
  MediaAssetPayload,
  MediaMetadataPayload,
} from '@luma/contracts';
import { createExternalStore } from './external-store';

export interface ApplicationState {
  readonly status: 'starting' | 'ready' | 'error';
  readonly appInfo: AppInfo | null;
  readonly lastCommand: AppCommandId | null;
  readonly errorMessage: string | null;
  readonly activeAsset: MediaAssetPayload | null;
  readonly activeMetadata: MediaMetadataPayload | null;
  readonly mediaErrorMessage: string | null;
}

export const applicationStore = createExternalStore<ApplicationState>({
  status: 'starting',
  appInfo: null,
  lastCommand: null,
  errorMessage: null,
  activeAsset: null,
  activeMetadata: null,
  mediaErrorMessage: null,
});
