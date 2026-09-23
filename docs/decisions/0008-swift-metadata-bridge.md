# Decision 0008: Optional Swift AVFoundation metadata bridge

## Status

Accepted as an opt-in Phase 8 demonstration.

## Decision

Add `native/macos/MediaMetadataKit` as a small Swift Package executable using
AVFoundation. Electron's main process can spawn `luma-media-helper` and send
line-delimited JSON requests over stdin. Responses return on stdout with the
same request ID. The bridge is used only as an optional metadata fallback;
Chromium still owns playback and ffprobe remains the normal metadata path.

The helper is discovered from `LUMA_NATIVE_HELPER_PATH` or local Swift build
outputs. Every request has a timeout, helper crashes reject pending requests,
and missing helpers fall back silently. Filesystem paths stay in the main
process and are never exposed to React or the preload bridge.

## Why this boundary

The process boundary makes the binding easy to inspect and keeps Swift
independent from React. JSONL is sufficient for low-frequency metadata
requests, while request IDs permit concurrent work and future commands. The
helper is not yet packaged, signed, or notarized; those concerns belong in the
release packaging phase after the native contract stabilizes.
