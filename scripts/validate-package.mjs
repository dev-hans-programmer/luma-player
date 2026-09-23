import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const releaseDirectory = path.resolve('release');
const requestedArchitecture = process.env.LUMA_PACKAGE_ARCH ?? process.arch;
const architectureName = ['arm64', 'x64', 'universal'].includes(requestedArchitecture)
  ? requestedArchitecture
  : 'x64';
const appPath = path.join(
  releaseDirectory,
  `Luma Player-darwin-${architectureName}`,
  'Luma Player.app',
);
const infoPlistPath = path.join(appPath, 'Contents/Info.plist');
const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
const nativeHelperPath = path.join(appPath, 'Contents/Resources/luma-media-helper');

async function assertFile(filePath, description) {
  try {
    const details = await stat(filePath);
    if (!details.isFile()) {
      throw new Error(`${description} is not a file: ${filePath}`);
    }
  } catch {
    throw new Error(`Missing ${description}: ${filePath}`);
  }
}

await access(appPath);
await assertFile(infoPlistPath, 'application Info.plist');
await assertFile(asarPath, 'application ASAR');

const { stdout: bundleId } = await execFileAsync('/usr/libexec/PlistBuddy', [
  '-c',
  'Print :CFBundleIdentifier',
  infoPlistPath,
]);
const { stdout: version } = await execFileAsync('/usr/libexec/PlistBuddy', [
  '-c',
  'Print :CFBundleShortVersionString',
  infoPlistPath,
]);
const { stdout: documentTypes } = await execFileAsync('plutil', ['-p', infoPlistPath]);

if (bundleId.trim() !== 'com.luma.player.desktop') {
  throw new Error(`Unexpected bundle identifier: ${bundleId.trim()}`);
}

if (!documentTypes.includes('CFBundleDocumentTypes')) {
  throw new Error('Packaged application is missing media file associations.');
}

if (process.env.LUMA_SKIP_NATIVE_HELPER !== '1') {
  await assertFile(nativeHelperPath, 'packaged Swift metadata helper');
}

console.log(`Validated ${appPath}`);
console.log(`Bundle identifier: ${bundleId.trim()}`);
console.log(`Version: ${version.trim()}`);
console.log(`ASAR: ${asarPath}`);
console.log(`File associations: present`);
console.log(
  `Swift helper: ${process.env.LUMA_SKIP_NATIVE_HELPER === '1' ? 'skipped' : nativeHelperPath}`,
);
