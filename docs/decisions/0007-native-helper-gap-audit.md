# Decision 0007: No Swift helper for the current release

## Status

The audit conclusion remains valid for the production release. The optional
development bridge described in decision 0008 supersedes the original
implementation choice for demonstration and experimentation.

## Profile performed

The audit was run on the development Apple Silicon machine with:

- macOS Swift toolchain: Swift 6.2.3, arm64 macOS target.
- Electron 44.4.5, React 19.3.0, Vite 8.3.0.
- `ffprobe` 8.1.2 available at `/opt/homebrew/bin/ffprobe`.
- The existing H.264/AAC fixture is 16 KB, 320×180, and one second long.
- Five cold metadata probes completed in approximately 20–30 ms each.
- Metadata probing already runs asynchronously in the Electron main process;
  source attachment and browser playback do not wait for the probe to finish.

## Missing capability

No blocking capability was found. The current implementation provides local
range playback, metadata, chapters, audio/subtitle menus, protected WebVTT
sidecars, thumbnails, Picture in Picture, and keyboard/application-menu
controls without a native helper.

## Decision

Do not make Swift a mandatory production dependency. The existing
`NativeMacOSService` domain port remains reserved for a future capability gap.
The optional bridge added for demonstration is fail-soft and does not replace
the Electron playback path.
