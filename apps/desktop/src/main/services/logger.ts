type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  readonly [key: string]: unknown;
}

const logRecords: string[] = [];
const MAX_LOG_RECORDS = 500;

function redactString(value: string): string {
  return value
    .replace(/\/Users\/[^/\\\s]+/g, '/Users/<user>')
    .replace(/file:\/\/\/[^\s?]+/g, 'file:///<redacted>');
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactValue(nestedValue)]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message: redactString(message),
    ...(context ? { context: redactValue(context) } : {}),
  };

  const serialized = JSON.stringify(record);
  logRecords.push(serialized);

  if (logRecords.length > MAX_LOG_RECORDS) {
    logRecords.shift();
  }

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function getLogSnapshot(): string {
  return `${logRecords.join('\n')}\n`;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
};

export function registerProcessErrorHandlers(): () => void {
  const onUncaughtException = (error: Error): void => {
    logger.error('Uncaught main-process exception', {
      message: error.message,
      stack: error.stack,
    });
  };

  const onUnhandledRejection = (reason: unknown): void => {
    logger.error('Unhandled main-process rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  };

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  return (): void => {
    process.off('uncaughtException', onUncaughtException);
    process.off('unhandledRejection', onUnhandledRejection);
  };
}
