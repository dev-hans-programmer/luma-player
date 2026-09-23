# Decision 0002 — Initial Media Scope

Status: Proposed

## Decision

Version one is a local-file player built on the media capabilities available in the target Electron/Chromium runtime and supported macOS environment.

The initial target is MP4, MOV, M4V, and supported WebM content with common H.264, HEVC, VP8, VP9, AAC, and Opus combinations. Actual support will be verified with media fixtures rather than assumed from file extensions.

Remote URLs, HLS services, media servers, casting, transcoding, and broad third-party codec support are deferred.

## Rationale

A narrow, testable media scope lets the team optimize the local playback path and ship a dependable first release without introducing a second media backend prematurely.

## Consequence

The player needs a clear unsupported-media state and a documented compatibility matrix. A future dedicated backend can be added behind an application-level media port without changing the React UI.
