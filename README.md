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

Phase 1 is complete. The Electron/Vite development foundation, strict TypeScript setup, linting, formatting, testing, and workspace structure are in place. Electron Forge packaging remains intentionally deferred to Phase 11.

Run the development scaffold with:

```sh
pnpm install
pnpm dev
```

If this checkout is inside a Git repository, install the local quality gate with:

```sh
pnpm hooks:install
```

## Documentation

- [`tasks.md`](tasks.md) — implementation backlog and acceptance criteria.
- [`docs/architecture.md`](docs/architecture.md) — high-level application architecture.
- [`docs/media-support.md`](docs/media-support.md) — supported media policy.
- [`docs/ui-spec.md`](docs/ui-spec.md) — visual and interaction specification.
- [`docs/decisions/`](docs/decisions/) — product and architecture decisions.
