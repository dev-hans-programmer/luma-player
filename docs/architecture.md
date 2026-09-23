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

## Native macOS boundary

Swift is not part of the initial playback implementation. It may be added later for capabilities that cannot be implemented reliably in Electron, such as specialized metadata extraction or macOS media integrations. Any helper will communicate through a narrow, typed service boundary and must not be required for ordinary video playback.

## Security principles

- `nodeIntegration: false`.
- `contextIsolation: true`.
- Renderer sandbox enabled.
- Explicit preload methods only.
- Runtime validation for IPC payloads.
- Sender validation for privileged IPC handlers.
- Restrictive Content Security Policy.
- Controlled custom protocols instead of exposing arbitrary filesystem paths.

This document will be expanded during Phase 3 when the concrete contracts and dependency graph are implemented.
