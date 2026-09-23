import type {
  MediaAsset,
  MediaAssetId,
  PlaybackPosition,
  PlaybackState,
  PlayerPreferences,
  RecentFileEntry,
} from './entities';

export interface MediaRepository {
  getAsset(assetId: MediaAssetId): Promise<MediaAsset | null>;
  saveAsset(asset: MediaAsset): Promise<void>;
  removeAsset(assetId: MediaAssetId): Promise<void>;
}

export interface PreferencesRepository<TPreferences = PlayerPreferences> {
  load(): Promise<TPreferences>;
  save(preferences: TPreferences): Promise<void>;
}

export interface RecentFilesRepository {
  list(): Promise<readonly RecentFileEntry[]>;
  add(entry: RecentFileEntry): Promise<void>;
  remove(assetId: MediaAssetId): Promise<void>;
  clear(): Promise<void>;
}

/** Capabilities that may eventually be backed by a Swift macOS helper. */
export interface NativeMacOSService {
  revealInFinder(assetId: MediaAssetId): Promise<void>;
  setNowPlayingInfo(info: Readonly<Record<string, string | number>>): Promise<void>;
  clearNowPlayingInfo(): Promise<void>;
}

export interface WindowControlPort {
  close(): void;
  minimize(): void;
  toggleFullscreen(): boolean;
  toggleMaximize(): boolean;
}

export type PlaybackEvent =
  | { readonly type: 'loadedmetadata'; readonly state: PlaybackState }
  | { readonly type: 'canplay'; readonly state: PlaybackState }
  | { readonly type: 'waiting'; readonly state: PlaybackState }
  | { readonly type: 'stalled'; readonly state: PlaybackState }
  | { readonly type: 'playing'; readonly state: PlaybackState }
  | { readonly type: 'paused'; readonly state: PlaybackState }
  | { readonly type: 'timeupdate'; readonly state: PlaybackState }
  | { readonly type: 'progress'; readonly state: PlaybackState }
  | { readonly type: 'ended'; readonly state: PlaybackState }
  | { readonly type: 'error'; readonly state: PlaybackState };

export interface PlaybackEventPort {
  subscribe(listener: (event: PlaybackEvent) => void): () => void;
  publish(event: PlaybackEvent): void;
}

export interface PlaybackPositionRepository {
  get(assetId: MediaAssetId): Promise<PlaybackPosition | null>;
  save(position: PlaybackPosition): Promise<void>;
  remove(assetId: MediaAssetId): Promise<void>;
}
