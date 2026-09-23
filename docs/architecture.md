# High-Level Architecture

## Process model

```text
React renderer
    │ typed preload API
    ▼
Preload bridge
    │ validated IPC
    ▼
Electron main process
    ├── windows and menus
    ├── file dialogs and filesystem access
    ├── media:// protocol
    ├── persistence services
    └── optional native macOS helper
```

The renderer is treated as an unprivileged web application. It must not import Electron, Node.js, or filesystem modules directly.

## Clean architecture boundaries

- **Domain:** media, playback, playlist, preference, and error models.
- **Application:** use cases such as opening media, seeking, saving a resume position, and loading recents.
- **Infrastructure:** Electron APIs, filesystem access, media protocol, persistence, and optional Swift integration.
- **Presentation:** React components, hooks, stores, styling, and accessibility behavior.

Dependencies point inward. Domain code must not depend on Electron or React.

## Playback path

The initial playback path is an HTML video element in the renderer backed by a controlled `media://` protocol. The main process validates the asset and serves byte-range requests. React controls the video through a `PlaybackController`; it does not render video frames through React or Canvas.

The playback-critical path must avoid synchronous filesystem work, full-file buffering, and high-frequency whole-tree React updates.

Advanced playback stays on the same controller boundary. Speed and repeat
changes mutate the media element directly, while track selection uses browser
native audio/text tracks when available. External WebVTT sidecars are exposed
through validated `media://` URLs; filesystem paths never cross into React.
Chapter seeking comes from metadata, and timeline thumbnails use a separate
muted media element with quantized in-memory caching so scrubbing does not
disturb the active playback element.

## Native macOS boundary

Swift is not part of the initial playback implementation. It may be added later for capabilities that cannot be implemented reliably in Electron, such as specialized metadata extraction or macOS media integrations. Any helper will communicate through a narrow, typed service boundary and must not be required for ordinary video playback.

The Phase 8 audit found no mandatory capability gap, but an opt-in Swift
demonstration now exists for AVFoundation metadata probing. It is spawned only
from the main process, uses request-id JSONL messages, has bounded timeouts,
and falls back to ffprobe when unavailable. See [decision 0008](decisions/0008-swift-metadata-bridge.md).

## Security principles

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Renderer sandbox enabled.
- Explicit preload methods only.
- Runtime validation for IPC payloads.
- Sender validation for privileged IPC handlers.
- Restrictive Content Security Policy.
- Controlled custom protocols instead of exposing arbitrary filesystem paths.

## Concrete dependency graph

```text
packages/domain
    ▲
    │ types and ports only
    ├── packages/contracts       IPC names, payload types, validators
    ├── main application services Electron adapters and IPC handlers
    └── renderer state           React-facing stores and presentation state
```

The dependency rule is intentionally one-way:

- Domain entities, errors, and ports do not import Electron, Node.js, or React.
- Contracts do not import Electron. They are safe to share with preload and
  renderer code.
- Main-process adapters implement domain ports and are the only layer allowed
  to access filesystem, dialogs, BrowserWindow, or native helpers.
- Renderer code consumes contracts and domain state, but never imports main
  services or infrastructure adapters.

## IPC flow

1. A renderer feature calls one explicit method on `window.electronAPI`.
2. The preload bridge forwards only the named channel and typed payload.
3. The main IPC registry validates the request and the sender window.
4. A thin handler delegates to an application service or domain port.
5. Responses contain contract-safe data. Errors are serialized to a stable
   code and user message; paths, stacks, and diagnostic details remain in the
   main-process logger.

Every invoke channel has a request and response entry in
`packages/contracts/src/index.ts`. Empty requests are still validated so a
renderer cannot smuggle unexpected data into a privileged handler.

## Media loading flow

The renderer requests an asset through the typed preload API. The main process
normalizes and validates the selected file, stores an opaque `MediaAssetId`,
and serves the validated file through the controlled `media://` protocol. The
renderer receives the opaque identifier and never receives a filesystem path.
The protocol supports HTTP-style byte ranges and creates a filesystem stream
for each request, so large files are not buffered into renderer memory.

Metadata probing runs independently of source attachment. When `ffprobe` is
available, duration, dimensions, audio/subtitle tracks, and chapters are
returned. If it is unavailable, playback can still start and the browser
provides basic duration and dimension events through `PlaybackController`.

## Renderer state boundaries

The renderer has separate external stores for application, playback, UI, and
settings, and playlist state. Components subscribe only to the store they render. Playback
time/progress updates therefore notify playback subscribers without rerendering
the shell, settings, or sidebar. Event subscriptions are created at the
provider boundary and always return their cleanup function.

## Persistence flow

Preferences, recent files, resume positions, and playlists are stored by
versioned main-process services. The JSON store writes a temporary file and
atomically renames it into place. Renderer calls cross the preload bridge and
are runtime validated in IPC. Resume updates are throttled in the service and
the renderer so high-frequency playback events never become synchronous disk
work. See [decision 0005](decisions/0005-single-window-persistence.md) for
the single-window policy.

## Error flow

Infrastructure errors become typed domain errors with a diagnostic message and
a user-safe message. Main-process logs retain diagnostic context after path
redaction. IPC exposes only the error code and safe message. Renderer error
boundaries report failures through the same validated channel and render a
recoverable fallback state.

## Adding a feature safely

1. Define or extend a domain entity, error, or port if the behavior is a
   business concept.
2. Add an IPC request/response/event contract and runtime validator when a
   process boundary is involved.
3. Implement the use case or adapter in the main process, keeping the IPC
   handler thin.
4. Add a focused renderer store or selector instead of placing fast-changing
   state in a global React provider.
5. Add unit tests for validation and domain behavior, then run the complete
   typecheck, lint, test, and build gates.
