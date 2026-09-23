export const IPC_CHANNELS = {
  appGetInfo: 'app:get-info',
  mediaOpenFile: 'media:open-file',
  mediaOpenRecentFile: 'media:open-recent-file',
  mediaGetRecentFiles: 'media:get-recent-files',
  mediaClearRecentFiles: 'media:clear-recent-files',
  mediaRegisterDroppedFiles: 'media:register-dropped-files',
  mediaImportFolder: 'media:import-folder',
  mediaCancelFolderImport: 'media:cancel-folder-import',
  mediaImportFolderProgress: 'media:folder-import-progress',
  mediaGetSource: 'media:get-source',
  mediaGetMetadata: 'media:get-metadata',
  mediaGetSubtitleSource: 'media:get-subtitle-source',
  preferencesGet: 'preferences:get',
  preferencesSave: 'preferences:save',
  resumeGet: 'resume:get',
  resumeSave: 'resume:save',
  resumeRemove: 'resume:remove',
  playlistsList: 'playlists:list',
  playlistsSave: 'playlists:save',
  playlistsRemove: 'playlists:remove',
  menuCommand: 'menu:command',
  rendererError: 'renderer:error',
  windowClose: 'window:close',
  windowMinimize: 'window:minimize',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowToggleMaximize: 'window:toggle-maximize',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type AppCommandId =
  | 'media.open-file'
  | 'playback.toggle'
  | 'playback.seek-backward'
  | 'playback.seek-forward'
  | 'view.toggle-fullscreen'
  | 'view.toggle-sidebar'
  | 'app.open-settings'
  | 'app.export-diagnostics';

export interface AppInfo {
  readonly name: string;
  readonly version: string;
}

export interface MediaAssetPayload {
  readonly id: string;
  readonly displayName: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly addedAtIso: string;
  readonly metadata: MediaMetadataPayload | null;
}

export interface MediaMetadataPayload {
  readonly durationMs: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly hasAudio: boolean;
  readonly audioTracks: readonly AudioTrackPayload[];
  readonly subtitleTracks: readonly SubtitleTrackPayload[];
  readonly chapters: readonly ChapterPayload[];
}

export interface RecentFilePayload {
  readonly asset: MediaAssetPayload;
  readonly lastOpenedAtIso: string;
}

export interface PlayerPreferencesPayload {
  readonly theme: 'system' | 'light' | 'dark';
  readonly rememberPlaybackPosition: boolean;
  readonly autoplay: boolean;
  readonly preferredVolume: number;
  readonly preferredPlaybackRate: number;
  readonly showSidebar: boolean;
  readonly autoHideControls: boolean;
}

export interface PlaybackPositionPayload {
  readonly assetId: string;
  readonly positionMs: number;
  readonly updatedAtIso: string;
}

export interface PlaylistItemPayload {
  readonly id: string;
  readonly assetId: string;
  readonly title: string;
}

export interface PlaylistPayload {
  readonly id: string;
  readonly name: string;
  readonly items: readonly PlaylistItemPayload[];
  readonly activeItemId: string | null;
}

export interface FolderImportProgressPayload {
  readonly scanned: number;
  readonly imported: number;
  readonly skipped: number;
  readonly complete: boolean;
}

export interface AudioTrackPayload {
  readonly id: string;
  readonly label: string;
  readonly language: string | null;
  readonly channels: number | null;
}

export interface SubtitleTrackPayload {
  readonly id: string;
  readonly label: string;
  readonly language: string | null;
  readonly kind: 'embedded' | 'external';
}

export interface ChapterPayload {
  readonly id: string;
  readonly title: string;
  readonly startMs: number;
  readonly endMs: number;
}

export interface RendererErrorPayload {
  readonly message: string;
  readonly stack?: string | undefined;
  readonly source: 'error' | 'unhandled-rejection' | 'error-boundary';
}

export interface IpcRequestMap {
  readonly 'app:get-info': undefined;
  readonly 'media:open-file': undefined;
  readonly 'media:open-recent-file': { readonly assetId: string };
  readonly 'media:get-recent-files': undefined;
  readonly 'media:clear-recent-files': undefined;
  readonly 'media:register-dropped-files': { readonly filePaths: readonly string[] };
  readonly 'media:import-folder': undefined;
  readonly 'media:cancel-folder-import': undefined;
  readonly 'media:get-source': { readonly assetId: string };
  readonly 'media:get-metadata': { readonly assetId: string };
  readonly 'media:get-subtitle-source': { readonly assetId: string; readonly trackId: string };
  readonly 'preferences:get': undefined;
  readonly 'preferences:save': PlayerPreferencesPayload;
  readonly 'resume:get': { readonly assetId: string };
  readonly 'resume:save': PlaybackPositionPayload;
  readonly 'resume:remove': { readonly assetId: string };
  readonly 'playlists:list': undefined;
  readonly 'playlists:save': PlaylistPayload;
  readonly 'playlists:remove': { readonly playlistId: string };
  readonly 'menu:command': undefined;
  readonly 'renderer:error': RendererErrorPayload;
  readonly 'window:close': undefined;
  readonly 'window:minimize': undefined;
  readonly 'window:toggle-fullscreen': undefined;
  readonly 'window:toggle-maximize': undefined;
}

export interface IpcResponseMap {
  readonly 'app:get-info': AppInfo;
  readonly 'media:open-file': readonly MediaAssetPayload[];
  readonly 'media:open-recent-file': MediaAssetPayload;
  readonly 'media:get-recent-files': readonly RecentFilePayload[];
  readonly 'media:clear-recent-files': void;
  readonly 'media:register-dropped-files': readonly MediaAssetPayload[];
  readonly 'media:import-folder': readonly MediaAssetPayload[];
  readonly 'media:cancel-folder-import': void;
  readonly 'media:get-source': string;
  readonly 'media:get-metadata': MediaMetadataPayload;
  readonly 'media:get-subtitle-source': string;
  readonly 'preferences:get': PlayerPreferencesPayload;
  readonly 'preferences:save': void;
  readonly 'resume:get': PlaybackPositionPayload | null;
  readonly 'resume:save': void;
  readonly 'resume:remove': void;
  readonly 'playlists:list': readonly PlaylistPayload[];
  readonly 'playlists:save': void;
  readonly 'playlists:remove': void;
  readonly 'window:close': void;
  readonly 'window:minimize': void;
  readonly 'window:toggle-fullscreen': boolean;
  readonly 'window:toggle-maximize': boolean;
}

export interface IpcEventMap {
  readonly 'menu:command': AppCommandId;
  readonly 'renderer:error': RendererErrorPayload;
  readonly 'media:folder-import-progress': FolderImportProgressPayload;
}

export type IpcRequest<C extends keyof IpcRequestMap> = IpcRequestMap[C];
export type IpcResponse<C extends keyof IpcResponseMap> = IpcResponseMap[C];
export type IpcEvent<C extends keyof IpcEventMap> = IpcEventMap[C];

export interface SerializedIpcError {
  readonly code: string;
  readonly userMessage: string;
}

export type ValidationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly message: string };

export interface ElectronAPI {
  readonly platform: string;
  readonly electronVersion: string;
  readonly getAppInfo: () => Promise<AppInfo>;
  readonly openFile: () => Promise<readonly MediaAssetPayload[]>;
  readonly openRecentFile: (assetId: string) => Promise<MediaAssetPayload>;
  readonly getRecentFiles: () => Promise<readonly RecentFilePayload[]>;
  readonly clearRecentFiles: () => Promise<void>;
  readonly registerDroppedFiles: (
    filePaths: readonly string[],
  ) => Promise<readonly MediaAssetPayload[]>;
  readonly getMediaSource: (assetId: string) => Promise<string>;
  readonly getMediaMetadata: (assetId: string) => Promise<MediaMetadataPayload>;
  readonly getSubtitleSource: (assetId: string, trackId: string) => Promise<string>;
  readonly importFolder: () => Promise<readonly MediaAssetPayload[]>;
  readonly cancelFolderImport: () => Promise<void>;
  readonly onFolderImportProgress: (
    listener: (progress: FolderImportProgressPayload) => void,
  ) => () => void;
  readonly getPreferences: () => Promise<PlayerPreferencesPayload>;
  readonly savePreferences: (preferences: PlayerPreferencesPayload) => Promise<void>;
  readonly getPlaybackPosition: (assetId: string) => Promise<PlaybackPositionPayload | null>;
  readonly savePlaybackPosition: (position: PlaybackPositionPayload) => Promise<void>;
  readonly removePlaybackPosition: (assetId: string) => Promise<void>;
  readonly listPlaylists: () => Promise<readonly PlaylistPayload[]>;
  readonly savePlaylist: (playlist: PlaylistPayload) => Promise<void>;
  readonly removePlaylist: (playlistId: string) => Promise<void>;
  readonly reportError: (payload: RendererErrorPayload) => void;
  readonly onMenuCommand: (listener: (command: AppCommandId) => void) => () => void;
  readonly window: {
    readonly close: () => Promise<void>;
    readonly minimize: () => Promise<void>;
    readonly toggleFullscreen: () => Promise<boolean>;
    readonly toggleMaximize: () => Promise<boolean>;
  };
}

export interface WindowApi {
  readonly electronAPI: ElectronAPI;
}

const APP_COMMAND_IDS: readonly AppCommandId[] = [
  'media.open-file',
  'playback.toggle',
  'playback.seek-backward',
  'playback.seek-forward',
  'view.toggle-fullscreen',
  'view.toggle-sidebar',
  'app.open-settings',
  'app.export-diagnostics',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAppCommandId(value: unknown): value is AppCommandId {
  return typeof value === 'string' && APP_COMMAND_IDS.includes(value as AppCommandId);
}

export function validateRendererErrorPayload(
  value: unknown,
): ValidationResult<RendererErrorPayload> {
  if (!isRecord(value) || typeof value.message !== 'string' || value.message.length === 0) {
    return { success: false, message: 'Renderer error message must be a non-empty string.' };
  }

  if (value.stack !== undefined && typeof value.stack !== 'string') {
    return { success: false, message: 'Renderer error stack must be a string when provided.' };
  }

  if (
    value.source !== 'error' &&
    value.source !== 'unhandled-rejection' &&
    value.source !== 'error-boundary'
  ) {
    return { success: false, message: 'Renderer error source is invalid.' };
  }

  return {
    success: true,
    data: {
      message: value.message,
      ...(value.stack === undefined ? {} : { stack: value.stack }),
      source: value.source,
    },
  };
}

export function assertEmptyIpcRequest(value: unknown): void {
  if (value !== undefined) {
    throw new Error('This IPC channel does not accept a request payload.');
  }
}

export function validateDroppedFilesRequest(
  value: unknown,
): ValidationResult<{ readonly filePaths: readonly string[] }> {
  if (!isRecord(value) || !Array.isArray(value.filePaths) || value.filePaths.length === 0) {
    return { success: false, message: 'At least one dropped file path is required.' };
  }

  if (
    value.filePaths.some((filePath) => typeof filePath !== 'string' || filePath.trim().length === 0)
  ) {
    return { success: false, message: 'Dropped file paths must be non-empty strings.' };
  }

  return { success: true, data: { filePaths: value.filePaths } };
}

export function validateAssetIdRequest(
  value: unknown,
): ValidationResult<{ readonly assetId: string }> {
  if (!isRecord(value) || typeof value.assetId !== 'string' || value.assetId.trim().length === 0) {
    return { success: false, message: 'A non-empty media asset id is required.' };
  }

  return { success: true, data: { assetId: value.assetId } };
}

export function validateSubtitleTrackRequest(
  value: unknown,
): ValidationResult<{ readonly assetId: string; readonly trackId: string }> {
  if (
    !isRecord(value) ||
    typeof value.assetId !== 'string' ||
    value.assetId.trim().length === 0 ||
    typeof value.trackId !== 'string' ||
    value.trackId.trim().length === 0
  ) {
    return { success: false, message: 'A media asset id and subtitle track id are required.' };
  }

  return { success: true, data: { assetId: value.assetId, trackId: value.trackId } };
}

export function validatePlaylistIdRequest(
  value: unknown,
): ValidationResult<{ readonly playlistId: string }> {
  if (
    !isRecord(value) ||
    typeof value.playlistId !== 'string' ||
    value.playlistId.trim().length === 0
  ) {
    return { success: false, message: 'A non-empty playlist id is required.' };
  }

  return { success: true, data: { playlistId: value.playlistId } };
}

export function validatePreferencesPayload(
  value: unknown,
): ValidationResult<PlayerPreferencesPayload> {
  if (!isRecord(value)) {
    return { success: false, message: 'Preferences payload must be an object.' };
  }

  if (
    (value.theme !== 'system' && value.theme !== 'light' && value.theme !== 'dark') ||
    typeof value.rememberPlaybackPosition !== 'boolean' ||
    typeof value.autoplay !== 'boolean' ||
    typeof value.preferredVolume !== 'number' ||
    value.preferredVolume < 0 ||
    value.preferredVolume > 1 ||
    typeof value.preferredPlaybackRate !== 'number' ||
    value.preferredPlaybackRate < 0.25 ||
    value.preferredPlaybackRate > 4 ||
    typeof value.showSidebar !== 'boolean' ||
    typeof value.autoHideControls !== 'boolean'
  ) {
    return { success: false, message: 'Preferences payload is invalid.' };
  }

  return { success: true, data: value as unknown as PlayerPreferencesPayload };
}

export function validatePlaybackPositionPayload(
  value: unknown,
): ValidationResult<PlaybackPositionPayload> {
  if (
    !isRecord(value) ||
    typeof value.assetId !== 'string' ||
    value.assetId.length === 0 ||
    typeof value.positionMs !== 'number' ||
    !Number.isFinite(value.positionMs) ||
    value.positionMs < 0 ||
    typeof value.updatedAtIso !== 'string'
  ) {
    return { success: false, message: 'Playback position payload is invalid.' };
  }

  return { success: true, data: value as unknown as PlaybackPositionPayload };
}

export function validatePlaylistPayload(value: unknown): ValidationResult<PlaylistPayload> {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.items) ||
    (value.activeItemId !== null && typeof value.activeItemId !== 'string')
  ) {
    return { success: false, message: 'Playlist payload is invalid.' };
  }

  const hasInvalidItem = value.items.some((item) => {
    if (!isRecord(item)) {
      return true;
    }
    return (
      typeof item.id !== 'string' ||
      typeof item.assetId !== 'string' ||
      typeof item.title !== 'string'
    );
  });

  if (hasInvalidItem) {
    return { success: false, message: 'Playlist items are invalid.' };
  }

  return { success: true, data: value as unknown as PlaylistPayload };
}

export function serializeIpcError(error: unknown): SerializedIpcError {
  if (isRecord(error) && typeof error.code === 'string' && typeof error.userMessage === 'string') {
    return { code: error.code, userMessage: error.userMessage };
  }

  return {
    code: 'internal.unexpected-error',
    userMessage: 'Luma Player could not complete that action.',
  };
}
