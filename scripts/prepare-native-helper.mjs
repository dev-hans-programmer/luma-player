import { chmod, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const workspaceDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.join(workspaceDirectory, '../native/macos/MediaMetadataKit');
const stagedDirectory = path.join(workspaceDirectory, '../native/macos');
const stagedHelperPath = path.join(stagedDirectory, 'luma-media-helper');
const requestedArchitecture = process.env.LUMA_NATIVE_ARCH ?? process.arch;

const architectureTargets = {
  arm64: 'arm64-apple-macosx',
  x64: 'x86_64-apple-macosx',
};

function runSwiftBuild(targetArchitecture) {
  const triple = architectureTargets[targetArchitecture];
  if (!triple) {
    throw new Error(`Unsupported native helper architecture: ${targetArchitecture}`);
  }

  const result = spawnSync(
    'swift',
    [
      'build',
      '--package-path',
      packageDirectory,
      '--configuration',
      'release',
      '--product',
      'luma-media-helper',
      '--triple',
      triple,
    ],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error(`Swift helper build failed for ${targetArchitecture}.`);
  }

  return path.join(packageDirectory, '.build', triple, 'release/luma-media-helper');
}

async function stageSingleArchitecture(targetArchitecture) {
  const helperPath = runSwiftBuild(targetArchitecture);
  await copyFile(helperPath, stagedHelperPath);
  await chmod(stagedHelperPath, 0o755);
}

async function stageUniversalArchitecture() {
  const arm64Path = runSwiftBuild('arm64');
  const x64Path = runSwiftBuild('x64');
  const result = spawnSync('lipo', ['-create', arm64Path, x64Path, '-output', stagedHelperPath], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Could not combine the Swift helper into a universal binary.');
  }

  await chmod(stagedHelperPath, 0o755);
}

if (process.platform !== 'darwin') {
  console.log('Skipping Swift helper staging: macOS is required.');
} else if (process.env.LUMA_SKIP_NATIVE_HELPER === '1') {
  console.log('Skipping Swift helper staging because LUMA_SKIP_NATIVE_HELPER=1.');
} else {
  await mkdir(stagedDirectory, { recursive: true });
  await rm(stagedHelperPath, { force: true });

  if (requestedArchitecture === 'universal') {
    await stageUniversalArchitecture();
  } else {
    await stageSingleArchitecture(requestedArchitecture === 'x64' ? 'x64' : 'arm64');
  }

  console.log(`Staged Swift metadata helper for ${requestedArchitecture}: ${stagedHelperPath}`);
}
