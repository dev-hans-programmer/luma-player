import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { dialog, type BrowserWindow } from 'electron';
import type { MediaAsset, MediaMetadata } from '@luma/domain';
import { FileAccessError, MediaError } from '@luma/domain';
import type { RecentFilesService } from './persistence/recent-files-service';

const SUPPORTED_EXTENSIONS = [
  'aac',
  'avi',
  'flac',
  'm4a',
  'm4v',
  'mkv',
  'mov',
  'mp3',
  'mp4',
  'oga',
  'ogg',
  'opus',
  'wav',
  'webm',
  'wmv',
] as const;

const EXTERNAL_SUBTITLE_EXTENSION = 'vtt';
const EXTERNAL_SUBTITLE_TRACK_ID = 'subtitle-external-vtt';

const MIME_TYPES: Readonly<Record<string, string>> = {
  aac: 'audio/aac',
  avi: 'video/x-msvideo',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  m4v: 'video/x-m4v',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  webm: 'video/webm',
  wmv: 'video/x-ms-wmv',
};

const EMPTY_METADATA: MediaMetadata = {
  durationMs: null,
  width: null,
  height: null,
  hasAudio: false,
  audioTracks: [],
  subtitleTracks: [],
  chapters: [],
};

interface FfprobeStream {
  readonly codec_type?: unknown;
  readonly width?: unknown;
  readonly height?: unknown;
  readonly channels?: unknown;
  readonly tags?: unknown;
}

interface FfprobeChapter {
  readonly id?: unknown;
  readonly start_time?: unknown;
  readonly end_time?: unknown;
  readonly tags?: unknown;
}

interface FfprobeResult {
  readonly streams?: unknown;
  readonly format?: unknown;
  readonly chapters?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getTags(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function getExtension(filePath: string): string {
  return path.extname(filePath).slice(1).toLowerCase();
}

function isSupportedExtension(extension: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extension);
}

function getLabel(tags: Record<string, unknown>, fallback: string): string {
  return getString(tags.title) ?? getString(tags.handler_name) ?? fallback;
}

function createFallbackMetadata(asset: MediaAsset): MediaMetadata {
  return {
    ...EMPTY_METADATA,
    hasAudio: asset.mimeType?.startsWith('audio/') ?? false,
  };
}

function parseFfprobeMetadata(result: FfprobeResult, fallback: MediaMetadata): MediaMetadata {
  const streams = Array.isArray(result.streams)
    ? result.streams.filter(isRecord).map((stream) => stream as FfprobeStream)
    : [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
  const subtitleStreams = streams.filter((stream) => stream.codec_type === 'subtitle');
  const format = isRecord(result.format) ? result.format : {};
  const durationSeconds = getNumber(format.duration);
  const chapters = Array.isArray(result.chapters)
    ? result.chapters.filter(isRecord).map((chapter, index) => {
        const typedChapter = chapter as FfprobeChapter;
        const tags = getTags(typedChapter.tags);
        return {
          id: String(typedChapter.id ?? index),
          title: getLabel(tags, `Chapter ${index + 1}`),
          startMs: Math.max(0, (getNumber(typedChapter.start_time) ?? 0) * 1000),
          endMs: Math.max(0, (getNumber(typedChapter.end_time) ?? 0) * 1000),
        };
      })
    : [];

  return {
    durationMs:
      durationSeconds === null ? fallback.durationMs : Math.max(0, durationSeconds * 1000),
    width: getNumber(videoStream?.width) ?? fallback.width,
    height: getNumber(videoStream?.height) ?? fallback.height,
    hasAudio: audioStreams.length > 0 || fallback.hasAudio,
    audioTracks: audioStreams.map((stream, index) => {
      const tags = getTags(stream.tags);
      return {
        id: `audio-${index}`,
        label: getLabel(tags, `Audio ${index + 1}`),
        language: getString(tags.language),
        channels: getNumber(stream.channels),
      };
    }),
    subtitleTracks: subtitleStreams.map((stream, index) => {
      const tags = getTags(stream.tags);
      return {
        id: `subtitle-${index}`,
        label: getLabel(tags, `Subtitle ${index + 1}`),
        language: getString(tags.language),
        kind: 'embedded' as const,
      };
    }),
    chapters,
  };
}

function runFfprobe(filePath: string): Promise<FfprobeResult | null> {
  return new Promise((resolve) => {
    const executable = process.env.LUMA_FFPROBE_PATH ?? 'ffprobe';
    const child = spawn(
      executable,
      ['-v', 'error', '-show_streams', '-show_format', '-show_chapters', '-of', 'json', filePath],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let output = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve(null);
    }, 10_000);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.once('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        resolve(null);
        return;
      }

      try {
        const parsed: unknown = JSON.parse(output);
        resolve(isRecord(parsed) ? (parsed as FfprobeResult) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

export class MediaAssetService {
  private readonly assetPaths = new Map<string, string>();
  private readonly assets = new Map<string, MediaAsset>();
  private readonly subtitlePaths = new Map<string, Map<string, string>>();
  private readonly recentFiles: RecentFilesService;
  private recentHydration: Promise<void> | null = null;
  private activeFolderImport: AbortController | null = null;

  public constructor(recentFiles: RecentFilesService) {
    this.recentFiles = recentFiles;
  }

  public async openFileDialog(window: BrowserWindow | null): Promise<readonly MediaAsset[]> {
    if (!window || window.isDestroyed()) {
      return [];
    }

    const result = await dialog.showOpenDialog(window, {
      title: 'Open Media',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Supported media', extensions: [...SUPPORTED_EXTENSIONS] },
        { name: 'All files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return [];
    }

    return this.registerFiles(result.filePaths);
  }

  public async registerFiles(filePaths: readonly string[]): Promise<readonly MediaAsset[]> {
    return Promise.all(filePaths.map((filePath) => this.registerFile(filePath, undefined, true)));
  }

  public async getRecentAssets(): Promise<
    readonly { readonly asset: MediaAsset; readonly lastOpenedAtIso: string }[]
  > {
    await this.hydrateRecentAssets();
    const entries = await this.recentFiles.listPersisted();
    const recentAssets: { asset: MediaAsset; lastOpenedAtIso: string }[] = [];

    for (const entry of entries) {
      try {
        const asset = await this.registerFile(entry.filePath, entry.assetId, false);
        recentAssets.push({ asset, lastOpenedAtIso: entry.lastOpenedAtIso });
      } catch {
        await this.recentFiles.remove(entry.assetId);
      }
    }

    return recentAssets;
  }

  public async openRecentAsset(assetId: string): Promise<MediaAsset> {
    await this.hydrateRecentAssets();
    const entry = await this.recentFiles.get(assetId);

    if (!entry) {
      throw new FileAccessError(
        'file.not-found',
        `Recent media asset ${assetId} was not found.`,
        'This recent file is no longer available.',
      );
    }

    return this.registerFile(entry.filePath, entry.assetId, true);
  }

  public async importFolder(
    window: BrowserWindow | null,
    onProgress: (progress: {
      readonly scanned: number;
      readonly imported: number;
      readonly skipped: number;
      readonly complete: boolean;
    }) => void,
  ): Promise<readonly MediaAsset[]> {
    if (!window || window.isDestroyed()) {
      return [];
    }

    if (this.activeFolderImport) {
      throw new Error('A folder import is already running.');
    }

    const result = await dialog.showOpenDialog(window, {
      title: 'Import Media Folder',
      properties: ['openDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) {
      return [];
    }

    const controller = new AbortController();
    this.activeFolderImport = controller;
    const assets: MediaAsset[] = [];
    let scanned = 0;
    let skipped = 0;

    const report = (): void => {
      onProgress({ scanned, imported: assets.length, skipped, complete: false });
    };

    const scanDirectory = async (directoryPath: string): Promise<void> => {
      if (controller.signal.aborted) {
        return;
      }

      let directory;
      try {
        directory = await fs.opendir(directoryPath);
      } catch {
        skipped += 1;
        return;
      }

      try {
        for await (const entry of directory) {
          if (controller.signal.aborted) {
            return;
          }

          const entryPath = path.join(directoryPath, entry.name);
          if (entry.isDirectory()) {
            await scanDirectory(entryPath);
          } else if (entry.isFile()) {
            scanned += 1;
            if (isSupportedExtension(getExtension(entryPath))) {
              try {
                assets.push(await this.registerFile(entryPath, undefined, true));
              } catch {
                skipped += 1;
              }
            } else {
              skipped += 1;
            }
            report();
            await new Promise<void>((resolve) => setImmediate(resolve));
          }
        }
      } finally {
        await directory.close().catch(() => undefined);
      }
    };

    try {
      await scanDirectory(result.filePaths[0]);
      onProgress({ scanned, imported: assets.length, skipped, complete: true });
      return assets;
    } finally {
      this.activeFolderImport = null;
    }
  }

  public cancelFolderImport(): void {
    this.activeFolderImport?.abort();
  }

  public getAssetPath(assetId: string): string | null {
    return this.assetPaths.get(assetId) ?? null;
  }

  public getMediaSource(assetId: string): string {
    if (!this.assetPaths.has(assetId)) {
      throw new FileAccessError(
        'file.not-found',
        `No registered media asset exists for id ${assetId}.`,
        'This media file is no longer available.',
      );
    }

    return `media://${encodeURIComponent(assetId)}`;
  }

  public async getSubtitleSource(assetId: string, trackId: string): Promise<string> {
    await this.loadExternalSubtitle(assetId);
    const subtitlePath = this.getSubtitlePath(assetId, trackId);
    if (!subtitlePath) {
      throw new FileAccessError(
        'file.not-found',
        `No subtitle track ${trackId} exists for asset ${assetId}.`,
        'This subtitle track is no longer available.',
      );
    }

    return `media://${encodeURIComponent(assetId)}?subtitle=${encodeURIComponent(trackId)}`;
  }

  public getSubtitlePath(assetId: string, trackId: string): string | null {
    return this.subtitlePaths.get(assetId)?.get(trackId) ?? null;
  }

  public getAsset(assetId: string): MediaAsset | null {
    return this.assets.get(assetId) ?? null;
  }

  public async loadMetadata(assetId: string): Promise<MediaMetadata> {
    const asset = this.getAsset(assetId);
    const filePath = this.getAssetPath(assetId);

    if (!asset || !filePath) {
      throw new FileAccessError(
        'file.not-found',
        `Cannot load metadata for unknown asset ${assetId}.`,
        'This media file is no longer available.',
      );
    }

    const fallback = createFallbackMetadata(asset);
    const probeResult = await runFfprobe(filePath);
    let metadata = fallback;

    if (probeResult) {
      try {
        metadata = parseFfprobeMetadata(probeResult, fallback);
      } catch (error) {
        throw new MediaError(
          'media.load-failed',
          `Metadata parsing failed for ${filePath}.`,
          'Media metadata could not be read, but playback may still be available.',
          { cause: error },
        );
      }
    }

    const externalSubtitle = await this.loadExternalSubtitle(assetId);
    return externalSubtitle
      ? {
          ...metadata,
          subtitleTracks: [
            ...metadata.subtitleTracks,
            {
              id: EXTERNAL_SUBTITLE_TRACK_ID,
              label: 'External subtitles',
              language: null,
              kind: 'external' as const,
            },
          ],
        }
      : metadata;
  }

  private async registerFile(
    filePath: string,
    preferredAssetId: string | undefined,
    persistRecent: boolean,
  ): Promise<MediaAsset> {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new FileAccessError(
        'file.invalid',
        'A media path was empty.',
        'Choose a valid media file.',
      );
    }

    const normalizedPath = path.normalize(filePath);
    const extension = getExtension(normalizedPath);

    if (!isSupportedExtension(extension)) {
      throw new MediaError(
        'media.unsupported',
        `Unsupported media extension: ${extension || '<none>'}.`,
        'This file format is not supported by Luma Player.',
      );
    }

    let resolvedPath: string;
    let stats: Awaited<ReturnType<typeof fs.stat>>;

    try {
      resolvedPath = await fs.realpath(normalizedPath);
      stats = await fs.stat(resolvedPath);
    } catch (error) {
      throw new FileAccessError(
        'file.not-found',
        `Unable to access media file ${normalizedPath}.`,
        'The selected media file could not be accessed.',
        { cause: error },
      );
    }

    if (!stats.isFile()) {
      throw new FileAccessError(
        'file.invalid',
        `Media selection is not a regular file: ${resolvedPath}.`,
        'Folders cannot be opened as media files.',
      );
    }

    const existingAsset = [...this.assets.entries()].find(([, asset]) => {
      return this.assetPaths.get(asset.id) === resolvedPath;
    });

    if (existingAsset) {
      if (persistRecent) {
        await this.recentFiles.addAsset(existingAsset[1], resolvedPath);
      }
      return existingAsset[1];
    }

    const asset: MediaAsset = {
      id: preferredAssetId ?? randomUUID(),
      displayName: path.basename(resolvedPath),
      mimeType: MIME_TYPES[extension] ?? null,
      sizeBytes: stats.size,
      addedAtIso: new Date().toISOString(),
      metadata: null,
    };
    this.assets.set(asset.id, asset);
    this.assetPaths.set(asset.id, resolvedPath);
    if (persistRecent) {
      await this.recentFiles.addAsset(asset, resolvedPath);
    }
    return asset;
  }

  private async hydrateRecentAssets(): Promise<void> {
    if (!this.recentHydration) {
      this.recentHydration = (async () => {
        const entries = await this.recentFiles.listPersisted();
        for (const entry of entries) {
          try {
            await this.registerFile(entry.filePath, entry.assetId, false);
          } catch {
            await this.recentFiles.remove(entry.assetId);
          }
        }
      })();
    }

    await this.recentHydration;
  }

  private async loadExternalSubtitle(assetId: string): Promise<string | null> {
    const filePath = this.assetPaths.get(assetId);
    if (!filePath) {
      return null;
    }

    const subtitlePath = `${filePath.slice(0, -path.extname(filePath).length)}.${EXTERNAL_SUBTITLE_EXTENSION}`;
    try {
      const stats = await fs.stat(subtitlePath);
      if (!stats.isFile()) {
        return null;
      }
      this.subtitlePaths.set(assetId, new Map([[EXTERNAL_SUBTITLE_TRACK_ID, subtitlePath]]));
      return subtitlePath;
    } catch {
      this.subtitlePaths.delete(assetId);
      return null;
    }
  }
}

export { MIME_TYPES, SUPPORTED_EXTENSIONS };
