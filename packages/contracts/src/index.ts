export const IPC_CHANNELS = {
  appGetInfo: 'app:get-info',
  menuCommand: 'menu:command',
  rendererError: 'renderer:error',
  windowClose: 'window:close',
  windowMinimize: 'window:minimize',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowToggleMaximize: 'window:toggle-maximize',
} as const;

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
