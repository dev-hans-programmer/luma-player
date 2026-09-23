import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { NativeMediaProbe, NativeMediaProbeResult } from '@luma/domain';
import { NativeHelperError } from '@luma/domain';
import { logger } from './logger';

interface NativeProbeRequest {
  readonly id: string;
  readonly command: 'probe';
  readonly path: string;
}

interface NativeProbeResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly metadata?: NativeMediaProbeResult;
  readonly error?: string;
}

interface PendingRequest {
  readonly resolve: (metadata: NativeMediaProbeResult) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Optional JSONL bridge to the Swift AVFoundation helper. The service is
 * intentionally fail-soft: missing, crashing, or slow native code falls back
 * to the existing ffprobe adapter and never blocks ordinary playback.
 */
export class SwiftNativeMediaService implements NativeMediaProbe {
  private helperProcess: ChildProcessWithoutNullStreams | null = null;
  private helperPathPromise: Promise<string | null> | null = null;
  private startPromise: Promise<ChildProcessWithoutNullStreams | null> | null = null;
  private stdoutBuffer = '';
  private requestSequence = 0;
  private readonly pendingRequests = new Map<string, PendingRequest>();

  public async probe(filePath: string): Promise<NativeMediaProbeResult | null> {
    if (process.platform !== 'darwin') {
      return null;
    }

    const helperPath = await this.resolveHelperPath();
    if (!helperPath) {
      return null;
    }

    const helperProcess = await this.ensureProcess(helperPath);
    if (!helperProcess) {
      return null;
    }

    const id = `native-${++this.requestSequence}`;
    const request: NativeProbeRequest = { id, command: 'probe', path: filePath };

    try {
      return await new Promise<NativeMediaProbeResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(
            new NativeHelperError(
              'native.failed',
              `Swift metadata request ${id} timed out.`,
              'Native metadata is unavailable; continuing with the standard metadata reader.',
            ),
          );
        }, REQUEST_TIMEOUT_MS);
        this.pendingRequests.set(id, { resolve, reject, timer });

        try {
          helperProcess.stdin.write(`${JSON.stringify(request)}\n`);
        } catch (error) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(
            new NativeHelperError(
              'native.failed',
              `Swift metadata request ${id} could not be written.`,
              'Native metadata is unavailable; continuing with the standard metadata reader.',
              { cause: error },
            ),
          );
        }
      });
    } catch (error) {
      logger.warn('Swift metadata probe failed; using the standard metadata reader', {
        diagnosticMessage: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  public dispose(): void {
    this.helperProcess?.kill();
    this.helperProcess = null;
    this.startPromise = null;
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(
        new NativeHelperError(
          'native.unavailable',
          `Swift metadata request ${id} was cancelled during shutdown.`,
          'Native metadata is unavailable.',
        ),
      );
    }
    this.pendingRequests.clear();
  }

  private async resolveHelperPath(): Promise<string | null> {
    if (!this.helperPathPromise) {
      this.helperPathPromise = (async () => {
        const configuredPath = process.env.LUMA_NATIVE_HELPER_PATH;
        const architectureDirectory =
          process.arch === 'arm64' ? 'arm64-apple-macosx' : 'x86_64-apple-macosx';
        const candidates = [
          configuredPath,
          path.resolve(
            process.cwd(),
            'native/macos/MediaMetadataKit/.build',
            architectureDirectory,
            'debug/luma-media-helper',
          ),
          path.resolve(
            process.cwd(),
            'native/macos/MediaMetadataKit/.build',
            architectureDirectory,
            'release/luma-media-helper',
          ),
          path.resolve(process.resourcesPath, 'native/macos/luma-media-helper'),
          // Electron Forge copies the optional helper as a top-level extra
          // resource so it stays outside app.asar and can be executed safely.
          path.resolve(process.resourcesPath, 'luma-media-helper'),
        ].filter((candidate): candidate is string => Boolean(candidate));

        for (const candidate of candidates) {
          try {
            await access(candidate);
            logger.info('Swift metadata helper discovered', { helperPath: candidate });
            return candidate;
          } catch {
            // Continue searching. The helper is optional in development and production.
          }
        }

        return null;
      })();
    }

    return this.helperPathPromise;
  }

  private async ensureProcess(helperPath: string): Promise<ChildProcessWithoutNullStreams | null> {
    if (this.helperProcess && !this.helperProcess.killed) {
      return this.helperProcess;
    }

    if (!this.startPromise) {
      this.startPromise = Promise.resolve()
        .then(() => {
          const child = spawn(helperPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
          child.stdout.setEncoding('utf8');
          child.stderr.setEncoding('utf8');
          child.stdout.on('data', (chunk: string) => this.handleStdout(chunk));
          child.stderr.on('data', (chunk: string) => {
            logger.warn('Swift metadata helper stderr', { diagnosticMessage: chunk.trim() });
          });
          child.once('error', (error) => this.handleProcessExit(error));
          child.once('exit', (code, signal) => {
            this.handleProcessExit(
              new Error(`Swift helper exited (${code ?? 'null'}, ${signal ?? 'none'}).`),
            );
          });
          this.helperProcess = child;
          logger.info('Swift metadata helper started', { helperPath });
          return child;
        })
        .catch((error: unknown) => {
          logger.warn('Swift metadata helper could not start', {
            diagnosticMessage: error instanceof Error ? error.message : String(error),
          });
          return null;
        });
    }

    const process = await this.startPromise;
    this.startPromise = null;
    return process;
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split('\n');
    this.stdoutBuffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        this.handleResponse(JSON.parse(line) as NativeProbeResponse);
      } catch (error) {
        logger.warn('Swift metadata helper returned invalid JSON', {
          diagnosticMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private handleResponse(response: NativeProbeResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(response.id);
    clearTimeout(pending.timer);

    if (!response.ok || !response.metadata) {
      pending.reject(
        new NativeHelperError(
          'native.failed',
          response.error ?? `Swift metadata request ${response.id} failed.`,
          'Native metadata is unavailable; continuing with the standard metadata reader.',
        ),
      );
      return;
    }

    pending.resolve(response.metadata);
  }

  private handleProcessExit(error: Error): void {
    if (this.helperProcess) {
      this.helperProcess = null;
    }
    this.startPromise = null;
    this.stdoutBuffer = '';
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(
        new NativeHelperError(
          'native.failed',
          `Swift metadata helper exited while handling ${id}: ${error.message}`,
          'Native metadata is unavailable; continuing with the standard metadata reader.',
          { cause: error },
        ),
      );
    }
    this.pendingRequests.clear();
  }
}
