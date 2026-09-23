# Luma Player

Luma Player is a production-oriented macOS video player built with Electron, React, and TypeScript.

The product name and bundle identifier are provisional until Phase 0 is approved. The current working identity is documented in [`docs/decisions/0001-product-identity.md`](docs/decisions/0001-product-identity.md).

## Product goal

Provide a fast, polished, keyboard-friendly local video player with a calm macOS-native feel, responsive layouts, reliable file handling, and a secure Electron process boundary.

## Version-one scope

- Open local video files.
- Drag and drop supported media.
- Play, pause, seek, volume, mute, speed, and fullscreen.
- Keyboard shortcuts and native application menus.
- Recent files and resume position.
- Dark and light appearance support.
- Accessible controls and VoiceOver-friendly interaction.
- Signed, notarized macOS distribution.

## Deferred scope

Video editing, transcoding, cloud synchronization, media-server browsing, network streaming, casting integrations, and broad third-party codec support are intentionally deferred. See [`docs/decisions/0003-scope-and-non-goals.md`](docs/decisions/0003-scope-and-non-goals.md).

## Project status

Phase 4 is complete. The secure Electron application shell, typed preload bridge,
domain entities and ports, runtime-validated IPC contracts, isolated renderer
stores, secure local-file registration, range-capable `media://` streaming,
optional metadata probing, and the playback controller foundation are in place.
The polished player interface begins in Phase 5. Electron Forge packaging
remains intentionally deferred to Phase 11.

Run the development scaffold with:

```sh
pnpm install
pnpm dev
```

If this checkout is inside a Git repository, install the local quality gate with:

```sh
pnpm hooks:install
```

The development renderer uses port `5173`. If the command reports that the port
is already in use, stop the previous Luma Player/Vite process and run `pnpm dev`
again. A normal manual shutdown may still cause the shell to report a signal
exit from the Electron dev process; it does not indicate a playback or build
failure.

## Documentation

- [`tasks.md`](tasks.md) — implementation backlog and acceptance criteria.
- [`docs/architecture.md`](docs/architecture.md) — high-level application architecture.
- [`docs/media-support.md`](docs/media-support.md) — supported media policy.
- [`docs/ui-spec.md`](docs/ui-spec.md) — visual and interaction specification.
- [`docs/decisions/`](docs/decisions/) — product and architecture decisions.
