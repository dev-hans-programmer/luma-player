import type { MediaAssetPayload } from '@luma/contracts';
import { applicationStore } from '../state/app-state';
import { uiStore } from '../state/ui-state';

function setActiveAsset(asset: MediaAssetPayload | null): void {
  applicationStore.setState((current) => ({
    ...current,
    activeAsset: asset,
    activeMetadata: null,
    mediaErrorMessage: null,
  }));
}

export async function refreshRecentFiles(): Promise<void> {
  const recentFiles = await window.electronAPI.getRecentFiles();
  applicationStore.setState((current) => ({ ...current, recentFiles }));
}

export async function openMediaFile(): Promise<readonly MediaAssetPayload[]> {
  const assets = await window.electronAPI.openFile();
  setActiveAsset(assets[0] ?? null);
  await refreshRecentFiles();
  return assets;
}

export async function registerDroppedMediaFiles(
  filePaths: readonly string[],
): Promise<readonly MediaAssetPayload[]> {
  const assets = await window.electronAPI.registerDroppedFiles(filePaths);
  setActiveAsset(assets[0] ?? null);
  await refreshRecentFiles();
  return assets;
}

export async function openRecentMedia(assetId: string): Promise<MediaAssetPayload> {
  const asset = await window.electronAPI.openRecentFile(assetId);
  setActiveAsset(asset);
  await refreshRecentFiles();
  return asset;
}

export async function importMediaFolder(): Promise<readonly MediaAssetPayload[]> {
  uiStore.setState((current) => ({
    ...current,
    isImportingFolder: true,
    importProgress: { scanned: 0, imported: 0 },
  }));

  try {
    const assets = await window.electronAPI.importFolder();
    setActiveAsset(assets[0] ?? null);
    await refreshRecentFiles();
    return assets;
  } finally {
    uiStore.setState((current) => ({ ...current, isImportingFolder: false }));
  }
}

export function setMediaError(error: unknown): void {
  applicationStore.setState((current) => ({
    ...current,
    mediaErrorMessage: error instanceof Error ? error.message : 'The media could not be opened.',
  }));
}
