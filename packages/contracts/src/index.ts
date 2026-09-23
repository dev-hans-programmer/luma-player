export interface ElectronAPI {
  readonly platform: string;
  readonly phase: 'phase-1-scaffold';
}

export interface WindowApi {
  readonly electronAPI: ElectronAPI;
}
