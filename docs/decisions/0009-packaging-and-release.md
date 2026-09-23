# Decision 0009: Electron Forge macOS packaging

## Status

Accepted for Phase 11.

## Decision

Use Electron Forge 7.11.2 with the DMG and ZIP makers. Electron Vite remains
the compiler for the main, preload, and renderer bundles; Forge owns macOS app
assembly and distributable creation.

The packaging boundary is:

```text
electron-vite build
        ↓
Swift helper staging (outside ASAR)
        ↓
Electron Forge package
        ↓
DMG + ZIP makers
        ↓
GitHub Actions artifact upload on push
```

The native Swift metadata helper is copied as an extra resource instead of
being placed inside `app.asar`, because the main process must execute it. The
main-process resolver checks the packaged resource path and retains its
fail-soft fallback behavior.

## Supply-chain and package-manager constraints

The workspace pins Electron's official `@electron/node-gyp` tarball through a
pnpm override instead of allowing Forge's historical git subdependency. Forge
also requires a public hoist pattern so it can inspect and prune workspace
dependencies. The production bundles do not ship the workspace `node_modules`
tree because Electron Vite bundles all runtime code used by the app.

## Distribution and update policy

Pushes to the repository build unsigned arm64 DMG and ZIP artifacts and upload
them with `actions/upload-artifact@v4`, together with SHA-256 checksums. Pull
requests run quality checks without publishing an artifact. No distribution
credentials are required by CI.

Automatic update installation is deliberately deferred. During development,
users download the artifact for a specific commit so rollback remains explicit
and easy to understand.
