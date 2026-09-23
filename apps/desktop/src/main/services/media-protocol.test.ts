import { describe, expect, it } from 'vitest';
import { getAssetId, getSubtitleTrackId, parseRangeHeader } from './media-protocol';

describe('media protocol asset addressing', () => {
  it('accepts only opaque media asset hosts', () => {
    expect(getAssetId('media://asset-123')).toBe('asset-123');
    expect(getAssetId('media:///Users/private/video.mp4')).toBeNull();
    expect(getAssetId('media://asset-123/private/video.mp4')).toBeNull();
  });
});

describe('media protocol subtitle addressing', () => {
  it('accepts only the subtitle query value', () => {
    expect(getSubtitleTrackId('media://asset-123?subtitle=subtitle-external-vtt')).toBe(
      'subtitle-external-vtt',
    );
    expect(getSubtitleTrackId('media://asset-123')).toBeNull();
  });
});

describe('media protocol range parsing', () => {
  it('parses an explicit byte range', () => {
    expect(parseRangeHeader('bytes=100-199', 1_000)).toEqual({ start: 100, end: 199 });
  });

  it('parses open-ended and suffix ranges', () => {
    expect(parseRangeHeader('bytes=500-', 1_000)).toEqual({ start: 500, end: 999 });
    expect(parseRangeHeader('bytes=-200', 1_000)).toEqual({ start: 800, end: 999 });
  });

  it('rejects malformed and unsatisfiable ranges', () => {
    expect(parseRangeHeader('items=0-1', 1_000)).toBeNull();
    expect(parseRangeHeader('bytes=1000-1001', 1_000)).toBeNull();
    expect(parseRangeHeader('bytes=200-100', 1_000)).toBeNull();
  });
});
