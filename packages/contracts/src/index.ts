export const IPC_CHANNELS = {
  appGetInfo: 'app:get-info',
  mediaOpenFile: 'media:open-file',
  mediaRegisterDroppedFiles: 'media:register-dropped-files',
  mediaGetSource: 'media:get-source',
  mediaGetMetadata: 'media:get-metadata',
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
  readonly 'media:register-dropped-files': { readonly filePaths: readonly string[] };
  readonly 'media:get-source': { readonly assetId: string };
  readonly 'media:get-metadata': { readonly assetId: string };
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
  readonly 'media:register-dropped-files': readonly MediaAssetPayload[];
  readonly 'media:get-source': string;
  readonly 'media:get-metadata': MediaMetadataPayload;
  readonly 'window:close': void;
  readonly 'window:minimize': void;
  readonly 'window:toggle-fullscreen': boolean;
  readonly 'window:toggle-maximize': boolean;
}

export interface IpcEventMap {
  readonly 'menu:command': AppCommandId;
  readonly 'renderer:error': RendererErrorPayload;
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
  readonly registerDroppedFiles: (
    filePaths: readonly string[],
  ) => Promise<readonly MediaAssetPayload[]>;
  readonly getMediaSource: (assetId: string) => Promise<string>;
  readonly getMediaMetadata: (assetId: string) => Promise<MediaMetadataPayload>;
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

export function serializeIpcError(error: unknown): SerializedIpcError {
  if (isRecord(error) && typeof error.code === 'string' && typeof error.userMessage === 'string') {
    return { code: error.code, userMessage: error.userMessage };
  }

  return {
    code: 'internal.unexpected-error',
    userMessage: 'Luma Player could not complete that action.',
  };
}
