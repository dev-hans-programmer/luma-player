# Decision 0005: Single player window with shared main-process persistence

## Status

Accepted for the first release.

## Decision

Luma Player runs one player window per application instance. Electron's single
instance lock focuses and restores the existing window when a second launch is
requested. Renderer state remains isolated to that window, while preferences,
recent files, resume positions, and playlists are owned by main-process
services under Electron's `userData` directory.

## Rationale

This keeps playback state predictable and avoids competing windows writing the
same resume record. It also preserves the macOS activation behavior expected
from a focused media application without preventing future multi-window work.
Persistence uses versioned JSON envelopes and atomic replacement. Invalid or
missing records fall back to safe defaults so a damaged preference file cannot
prevent playback.

## Consequences

- A second launch focuses the existing player instead of opening another queue.
- Playback state is local to the renderer window.
- Preferences and library records are safely shared through typed IPC.
- A future multi-window design must add window-scoped playback and explicit
  conflict handling before changing this policy.
