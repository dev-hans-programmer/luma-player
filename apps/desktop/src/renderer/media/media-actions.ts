import type { MediaAssetPayload } from '@luma/contracts';
import { applicationStore } from '../state/app-state';

function setActiveAsset(asset: MediaAssetPayload | null): void {
  applicationStore.setState((current) => ({
    ...current,
    activeAsset: asset,
    activeMetadata: null,
    mediaErrorMessage: null,
  }));
}

export async function openMediaFile(): Promise<readonly MediaAssetPayload[]> {
  const assets = await window.electronAPI.openFile();
  setActiveAsset(assets[0] ?? null);
  return assets;
}

export async function registerDroppedMediaFiles(
  filePaths: readonly string[],
): Promise<readonly MediaAssetPayload[]> {
  const assets = await window.electronAPI.registerDroppedFiles(filePaths);
  setActiveAsset(assets[0] ?? null);
  return assets;
}

export function setMediaError(error: unknown): void {
  applicationStore.setState((current) => ({
    ...current,
    mediaErrorMessage: error instanceof Error ? error.message : 'The media could not be opened.',
  }));
}
