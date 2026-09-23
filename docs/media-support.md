# Media Support Policy

## Version-one policy

Version one is a local-file player. Remote URLs, HLS services, media servers, cloud drives, and casting are not part of the initial scope.

The player will support formats that are reliably playable by the target Electron/Chromium runtime on supported macOS versions. File extensions alone are not treated as proof of compatibility; every advertised format must pass the project's media fixture tests.

## Initial target formats

### Primary video formats

- MP4
- MOV
- M4V
- WebM where supported by the target runtime

### Primary codec targets

- H.264 video
- HEVC/H.265 where supported by the target macOS and Electron runtime
- VP8/VP9 where supported by the target runtime
- AAC audio
- Opus audio where supported by the target runtime

### Subtitle targets

- WebVTT where supported by the playback pipeline
- Embedded subtitle tracks where exposed by the runtime

## Deferred formats and capabilities

The following are deferred until compatibility testing justifies adding a dedicated media backend:

- MKV
- AVI
- FLV
- DVD/Blu-ray structures
- Proprietary or unusual codecs
- Transcoding and format conversion
- External subtitle conversion
- Network streams and media-server protocols

The application should show a useful unsupported-media message and never silently fail.

## Required behavior

- Validate the selected path in the main process.
- Use byte-range access for large files.
- Do not load an entire media file into renderer memory.
- Preserve the original file; the player never modifies user media.
- Handle missing, moved, unreadable, corrupted, and unsupported files distinctly where possible.
- Log diagnostic details without displaying sensitive filesystem information unnecessarily.

## Test matrix

The fixture suite must eventually cover:

- Small 1080p H.264/AAC MP4.
- 4K H.264 file.
- HEVC file where the target machine supports it.
- MOV file.
- WebM file where supported.
- Audio-only file if audio playback is included.
- File with embedded subtitles.
- Very short media.
- Long-duration media.
- Corrupted or unsupported media.
- Media located on an external drive.
