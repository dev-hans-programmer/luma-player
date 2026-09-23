export type MediaAssetId = string;
export type PlaylistId = string;
export type PlaylistItemId = string;
export type AudioTrackId = string;
export type SubtitleTrackId = string;

export interface MediaMetadata {
  readonly durationMs: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly hasAudio: boolean;
  readonly audioTracks: readonly AudioTrack[];
  readonly subtitleTracks: readonly SubtitleTrack[];
  readonly chapters: readonly Chapter[];
}

/**
 * A media asset deliberately contains an opaque identifier instead of a
 * filesystem path. Paths stay inside the main process and infrastructure
 * adapters so the renderer cannot turn domain data into arbitrary file access.
 */
export interface MediaAsset {
  readonly id: MediaAssetId;
  readonly displayName: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly addedAtIso: string;
  readonly metadata: MediaMetadata | null;
}

export interface PlaybackPosition {
  readonly assetId: MediaAssetId;
  readonly positionMs: number;
  readonly updatedAtIso: string;
}

export interface PlaylistItem {
  readonly id: PlaylistItemId;
  readonly assetId: MediaAssetId;
  readonly title: string;
}

export interface Playlist {
  readonly id: PlaylistId;
  readonly name: string;
  readonly items: readonly PlaylistItem[];
  readonly activeItemId: PlaylistItemId | null;
}

export interface AudioTrack {
  readonly id: AudioTrackId;
  readonly label: string;
  readonly language: string | null;
  readonly channels: number | null;
}

export interface SubtitleTrack {
  readonly id: SubtitleTrackId;
  readonly label: string;
  readonly language: string | null;
  readonly kind: 'embedded' | 'external';
}

export interface Chapter {
  readonly id: string;
  readonly title: string;
  readonly startMs: number;
  readonly endMs: number;
}

export type PlaybackStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'waiting' | 'ended' | 'error';

export interface PlaybackState {
  readonly status: PlaybackStatus;
  readonly assetId: MediaAssetId | null;
  readonly currentTimeMs: number;
  readonly durationMs: number | null;
  readonly bufferedTimeMs: number;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly playbackRate: number;
  readonly isLooping: boolean;
  readonly errorMessage: string | null;
}

export interface RecentFileEntry {
  readonly assetId: MediaAssetId;
  readonly displayName: string;
  readonly lastOpenedAtIso: string;
}

export interface PlayerPreferences {
  readonly rememberPlaybackPosition: boolean;
  readonly autoplay: boolean;
  readonly preferredVolume: number;
  readonly preferredPlaybackRate: number;
}
