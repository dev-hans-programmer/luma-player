import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

/**
 * Versioned JSON persistence with atomic replacement. A corrupt or partially
 * written file is treated as missing; playback must never depend on it.
 */
export class JsonFileStore<T> {
  private readonly filePath: string;
  private pendingWrite: Promise<void> = Promise.resolve();

  public constructor(fileName: string) {
    this.filePath = path.join(app.getPath('userData'), fileName);
  }

  public async read(): Promise<T | null> {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      return JSON.parse(contents) as T;
    } catch {
      return null;
    }
  }

  public async write(value: T): Promise<void> {
    // Serialize writes because several preference/playback events can arrive
    // close together and must not compete for the same temporary file.
    const writeOperation = this.pendingWrite
      .catch(() => undefined)
      .then(async () => {
        const directory = path.dirname(this.filePath);
        await mkdir(directory, { recursive: true });
        const temporaryPath = `${this.filePath}.tmp`;
        await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await rename(temporaryPath, this.filePath);
      });
    this.pendingWrite = writeOperation;
    await writeOperation;
  }
}
