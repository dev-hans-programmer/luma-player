export type DomainErrorCode =
  | 'media.unsupported'
  | 'media.load-failed'
  | 'file.not-found'
  | 'file.access-denied'
  | 'file.invalid'
  | 'validation.invalid-input'
  | 'persistence.read-failed'
  | 'persistence.write-failed'
  | 'native.unavailable'
  | 'native.failed';

export interface DomainErrorOptions {
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Domain errors carry both a diagnostic message and a safe message intended
 * for users. IPC serialization must expose only the safe part to the renderer.
 */
export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly userMessage: string;
  public readonly details: Readonly<Record<string, unknown>> | undefined;

  public constructor(
    code: DomainErrorCode,
    message: string,
    userMessage: string,
    options: DomainErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'DomainError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = options.details;
  }
}

export class MediaError extends DomainError {
  public constructor(
    code: 'media.unsupported' | 'media.load-failed',
    message: string,
    userMessage: string,
    options?: DomainErrorOptions,
  ) {
    super(code, message, userMessage, options);
    this.name = 'MediaError';
  }
}

export class FileAccessError extends DomainError {
  public constructor(
    code: 'file.not-found' | 'file.access-denied' | 'file.invalid',
    message: string,
    userMessage: string,
    options?: DomainErrorOptions,
  ) {
    super(code, message, userMessage, options);
    this.name = 'FileAccessError';
  }
}

export class ValidationError extends DomainError {
  public constructor(message: string, userMessage = 'Some information was invalid.') {
    super('validation.invalid-input', message, userMessage);
    this.name = 'ValidationError';
  }
}

export class PersistenceError extends DomainError {
  public constructor(
    code: 'persistence.read-failed' | 'persistence.write-failed',
    message: string,
    userMessage: string,
    options?: DomainErrorOptions,
  ) {
    super(code, message, userMessage, options);
    this.name = 'PersistenceError';
  }
}

export class NativeHelperError extends DomainError {
  public constructor(
    code: 'native.unavailable' | 'native.failed',
    message: string,
    userMessage: string,
    options?: DomainErrorOptions,
  ) {
    super(code, message, userMessage, options);
    this.name = 'NativeHelperError';
  }
}
