export const IPC_CHANNELS = {
  appGetInfo: 'app:get-info',
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

export interface RendererErrorPayload {
  readonly message: string;
  readonly stack?: string | undefined;
  readonly source: 'error' | 'unhandled-rejection' | 'error-boundary';
}

export interface IpcRequestMap {
  readonly 'app:get-info': undefined;
  readonly 'menu:command': undefined;
  readonly 'renderer:error': RendererErrorPayload;
  readonly 'window:close': undefined;
  readonly 'window:minimize': undefined;
  readonly 'window:toggle-fullscreen': undefined;
  readonly 'window:toggle-maximize': undefined;
}

export interface IpcResponseMap {
  readonly 'app:get-info': AppInfo;
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

export function serializeIpcError(error: unknown): SerializedIpcError {
  if (isRecord(error) && typeof error.code === 'string' && typeof error.userMessage === 'string') {
    return { code: error.code, userMessage: error.userMessage };
  }

  return {
    code: 'internal.unexpected-error',
    userMessage: 'Luma Player could not complete that action.',
  };
}
