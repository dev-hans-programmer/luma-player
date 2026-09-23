/* eslint-disable @typescript-eslint/no-require-imports, no-undef */

const path = require('node:path');

const appDirectory = __dirname;
const workspaceDirectory = path.resolve(appDirectory, '../..');
const nativeHelperPath = path.join(workspaceDirectory, 'native/macos/luma-media-helper');
const packagerConfig = {
  asar: true,
  appBundleId: 'com.luma.player.desktop',
  appCategoryType: 'public.app-category.video',
  appCopyright: 'Copyright © 2026 Luma Player',
  darwinDarkModeSupport: true,
  icon: path.join(appDirectory, 'assets/icon'),
  overwrite: true,
  // Avoid a second temporary extraction tree on macOS CI and keep the package
  // operation deterministic inside the configured release directory.
  tmpdir: false,
  // Forge packages the built Electron output only. Source, fixtures, and the
  // Swift package remain outside the shipped ASAR to keep the artifact small.
  ignore: [
    /^\/src(?:\/|$)/,
    /^\/tests(?:\/|$)/,
    /^\/native(?:\/|$)/,
    /^\/scripts(?:\/|$)/,
    /^\/\.git(?:\/|$)/,
    /^\/\.build(?:\/|$)/,
    /^\/node_modules(?:\/|$)/,
  ],
  extendInfo: path.join(appDirectory, 'assets/info.plist'),
  osxUniversal: {
    mergeASARs: true,
  },
};

const fs = require('node:fs');

if (fs.existsSync(nativeHelperPath)) {
  packagerConfig.extraResource = [nativeHelperPath];
}

module.exports = {
  outDir: path.join(workspaceDirectory, 'release'),
  packagerConfig,
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        overwrite: true,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
};
