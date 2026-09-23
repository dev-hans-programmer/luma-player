import { describe, expect, it } from 'vitest';
import {
  assertEmptyIpcRequest,
  isAppCommandId,
  serializeIpcError,
  validateRendererErrorPayload,
} from './index';

describe('IPC contract validation', () => {
  it('accepts a valid renderer error payload', () => {
    expect(
      validateRendererErrorPayload({
        message: 'Something failed',
        stack: 'Error: Something failed',
        source: 'error-boundary',
      }),
    ).toEqual({
      success: true,
      data: {
        message: 'Something failed',
        stack: 'Error: Something failed',
        source: 'error-boundary',
      },
    });
  });

  it('rejects malformed renderer error payloads', () => {
    expect(validateRendererErrorPayload({ message: '', source: 'error' }).success).toBe(false);
    expect(validateRendererErrorPayload({ message: 'Failure', source: 'unknown' }).success).toBe(
      false,
    );
    expect(
      validateRendererErrorPayload({ message: 'Failure', stack: 42, source: 'error' }).success,
    ).toBe(false);
  });

  it('validates menu command identifiers', () => {
    expect(isAppCommandId('playback.toggle')).toBe(true);
    expect(isAppCommandId('playback.inject-script')).toBe(false);
  });

  it('rejects unexpected payloads on empty IPC requests', () => {
    expect(() => assertEmptyIpcRequest(undefined)).not.toThrow();
    expect(() => assertEmptyIpcRequest({ unexpected: true })).toThrow();
  });

  it('does not expose diagnostic error details through IPC serialization', () => {
    expect(
      serializeIpcError({
        code: 'media.load-failed',
        userMessage: 'This video could not be opened.',
        details: { path: '/Users/private/video.mp4' },
      }),
    ).toEqual({
      code: 'media.load-failed',
      userMessage: 'This video could not be opened.',
    });

    expect(serializeIpcError(new Error('private diagnostic'))).toEqual({
      code: 'internal.unexpected-error',
      userMessage: 'Luma Player could not complete that action.',
    });
  });
});
