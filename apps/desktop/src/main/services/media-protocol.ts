import { createReadStream, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { protocol } from 'electron';
import type { MediaAssetService } from './media-asset-service';

interface ByteRange {
  readonly start: number;
  readonly end: number;
}

function parseRangeHeader(value: string | null, size: number): ByteRange | null {
  if (!value?.startsWith('bytes=') || size <= 0) {
    return null;
  }

  const [range] = value.slice('bytes='.length).split(',');
  const [startText, endText] = range?.split('-') ?? [];
  const parsedStart = Number.parseInt(startText ?? '', 10);
  const parsedEnd = Number.parseInt(endText ?? '', 10);

  if (Number.isNaN(parsedStart) && Number.isNaN(parsedEnd)) {
    return null;
  }

  if (Number.isNaN(parsedStart)) {
    const suffixLength = Math.min(Math.max(parsedEnd, 0), size);
    return { start: size - suffixLength, end: size - 1 };
  }

  const end = Number.isNaN(parsedEnd) ? size - 1 : Math.min(parsedEnd, size - 1);

  if (parsedStart < 0 || parsedStart >= size || end < parsedStart) {
    return null;
  }

  return { start: parsedStart, end };
}

function getAssetId(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== 'media:' || (url.pathname !== '' && url.pathname !== '/')) {
      return null;
    }

    const assetId = decodeURIComponent(url.hostname);
    return assetId.length > 0 ? assetId : null;
  } catch {
    return null;
  }
}

function getSubtitleTrackId(requestUrl: string): string | null {
  try {
    const value = new URL(requestUrl).searchParams.get('subtitle');
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function createStreamBody(filePath: string, range: ByteRange | null): BodyInit {
  const stream = range
    ? createReadStream(filePath, { start: range.start, end: range.end })
    : createReadStream(filePath);
  return Readable.toWeb(stream) as unknown as BodyInit;
}

export function registerMediaProtocol(assetService: MediaAssetService): () => void {
  protocol.handle('media', async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const assetId = getAssetId(request.url);
    if (!assetId) {
      return new Response('Not Found', { status: 404 });
    }

    const subtitleTrackId = getSubtitleTrackId(request.url);
    const filePath = subtitleTrackId
      ? assetService.getSubtitlePath(assetId, subtitleTrackId)
      : assetService.getAssetPath(assetId);

    if (!filePath) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return new Response('Not Found', { status: 404 });
      }

      const range = parseRangeHeader(request.headers.get('range'), stats.size);
      const isRange = request.headers.has('range');

      if (isRange && !range) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${stats.size}` },
        });
      }

      const start = range?.start ?? 0;
      const end = range?.end ?? stats.size - 1;
      const contentLength = end - start + 1;
      const headers = new Headers({
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'Content-Length': String(contentLength),
        'Content-Type': subtitleTrackId
          ? 'text/vtt; charset=utf-8'
          : (assetService.getAsset(assetId)?.mimeType ?? 'application/octet-stream'),
      });

      if (range) {
        headers.set('Content-Range', `bytes ${range.start}-${range.end}/${stats.size}`);
      }

      return new Response(request.method === 'HEAD' ? null : createStreamBody(filePath, range), {
        status: range ? 206 : 200,
        headers,
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });

  return () => {
    protocol.unhandle('media');
  };
}

export { getAssetId, getSubtitleTrackId, parseRangeHeader };
