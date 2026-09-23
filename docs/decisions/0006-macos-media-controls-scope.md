# Decision 0006: Defer macOS media-key and Now Playing integration

## Status

Deferred until the core playback and packaging validation are complete.

## Decision

Phase 7 does not add a Swift helper or macOS Now Playing integration. Luma
Player keeps the current native application menu and keyboard command surface
as the supported control path. A native bridge will be introduced only if
profiling or user validation demonstrates that Electron cannot provide the
required media-key behavior reliably.

## Rationale

Adding a native media-control helper would create another packaged, signed,
architecture-specific binary and would expand the release failure surface. It
does not improve ordinary playback, track selection, chapters, thumbnails, or
Picture in Picture. The decision can be revisited in Phase 8 with a measured
capability gap and an explicit helper protocol.
