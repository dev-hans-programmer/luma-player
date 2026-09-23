# Luma Player artifact guide

Phase 11 provides the macOS packaging path. Development uses Electron Vite;
downloadable artifacts use Electron Forge and are written to the ignored
`release/` directory.

## Versioning

The version in `apps/desktop/package.json` is the source of truth for the
desktop artifact. Update it together with the root workspace version when
preparing a versioned build.

The bundle identifier is `com.luma.player.desktop`. The product name is `Luma
Player`, and the application is registered as a video-category macOS app.

## Local artifacts

Use Node 24 for Electron Forge packaging. Forge 7 currently uses a packager
extractor that is not reliable under Node 26 on this macOS toolchain, while the
repository engine and CI target Node 24.

```sh
pnpm install --frozen-lockfile
pnpm make:mac:arm64
```

Available targets:

- `pnpm make:mac:arm64` — Apple Silicon app, DMG, and ZIP.
- `pnpm make:mac:x64` — Intel app, DMG, and ZIP when the Swift toolchain can
  build the x86_64 helper.
- `pnpm make:mac:universal` — universal app and artifacts; builds both Swift
  helper slices and combines them with `lipo`.

The packaging command stages the optional Swift metadata helper outside
`app.asar`, packages it as `Contents/Resources/luma-media-helper`, and runs
`pnpm validate:package` checks for the bundle identifier, version, ASAR,
document associations, and native helper.

Set `LUMA_SKIP_NATIVE_HELPER=1` only for a diagnostic package where Swift is
not available. Ordinary release artifacts should include the helper.

## Push artifacts

Every push runs the quality job and then builds an unsigned arm64 DMG and ZIP.
The workflow uploads both files plus `SHA256SUMS` as a GitHub Actions artifact
named `luma-player-macos-arm64-<commit-sha>`. Pull requests run the quality
checks but do not publish artifacts.

These artifacts are intended for direct testing and installation on the
developer's Mac. Because they are not distributed through a trusted installer
channel, macOS may show a first-launch security warning. The user can use
Finder's Open action or the Privacy & Security settings to approve an artifact
they trust.

## File associations

`apps/desktop/assets/info.plist` registers supported video and audio
extensions. A later release should add an `open-file` event flow if opening a
file by double-click must immediately replace the active renderer asset; the
current packaging metadata makes Luma Player the registered viewer.

## Checksums and update strategy

The CI artifact includes SHA-256 checksums. Do not commit anything from
`release/` to source control.

Automatic updates are deferred. The current delivery mechanism is an
on-demand GitHub Actions artifact for each push, which keeps installation and
rollback explicit while the product is still under active development.
