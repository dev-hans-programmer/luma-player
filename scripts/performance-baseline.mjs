import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const fixturePath = path.join(repositoryRoot, 'apps/desktop/tests/fixtures/sample-av.mp4');

function measure(command, args, iterations = 1) {
  const durations = [];
  let lastResult = null;

  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    lastResult = spawnSync(command, args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    durations.push(performance.now() - startedAt);
  }

  if (lastResult?.status !== 0) {
    throw new Error(`${command} failed: ${lastResult?.stderr ?? 'unknown error'}`);
  }

  return {
    minimumMs: Math.round(Math.min(...durations)),
    averageMs: Math.round(durations.reduce((total, value) => total + value, 0) / durations.length),
    samples: durations.length,
  };
}

const ffprobePath = process.env.LUMA_FFPROBE_PATH ?? 'ffprobe';
const metadataProbe = measure(
  ffprobePath,
  ['-v', 'error', '-show_streams', '-show_format', '-show_chapters', '-of', 'json', fixturePath],
  5,
);
const fixtureStats = statSync(fixturePath);

console.log(`# Luma Player performance baseline`);
console.log(`\nCaptured: ${new Date().toISOString()}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Node: ${process.version}`);
console.log('Electron build: run `pnpm build` before comparing renderer artifacts');
console.log(`\n## Metadata probe`);
console.log(`Fixture: ${path.relative(repositoryRoot, fixturePath)} (${fixtureStats.size} bytes)`);
console.log(`Command: ${ffprobePath}`);
console.log(`Samples: ${metadataProbe.samples}`);
console.log(`Minimum: ${metadataProbe.minimumMs} ms`);
console.log(`Average: ${metadataProbe.averageMs} ms`);
console.log(`\n## Manual-only measurements`);
console.log(`- Cold startup and first frame: record with a packaged-like app launch.`);
console.log(
  `- Seek latency, CPU/GPU, memory, resize FPS, and dropped frames: record with Activity Monitor and DevTools performance tracing.`,
);
console.log(
  `- 4K/HEVC/HDR, external-drive, and sleep/wake behavior: record in the manual regression matrix.`,
);
