# Electron Security Model

## Renderer boundary

The renderer is an unprivileged React application. It runs with:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- A narrow `contextBridge` API

The renderer cannot import Node.js or Electron modules directly. Filesystem, window, menu, and diagnostic operations are delegated to the main process through explicit IPC methods.

## IPC rules

- Every privileged operation has a named channel.
- The preload layer exposes one method per operation.
- Main-process handlers validate the sender against the active window.
- Payloads are validated before they are logged or acted upon.
- Renderer error reports are bounded by shape and written through the structured logger.

## Content loading

- The renderer uses a restrictive Content Security Policy.
- Development navigation is limited to the Electron/Vite development origin.
- Packaged navigation is limited to local application files.
- Renderer-created windows are denied.
- Webview attachment is denied.
- Remote content is not loaded in version one.

## Diagnostics and privacy

Structured logs are retained in a bounded in-memory buffer. User home-directory prefixes and local `file://` paths are redacted before logs are written or exported. Diagnostics are exported only after an explicit user action.

## Media access

The media pipeline uses a controlled `media://` protocol. Raw filesystem paths
are never passed to React. The main process maps an opaque asset identifier to
a normalized, real filesystem path, validates the file before registration,
and rejects unknown identifiers. Range requests are streamed from the file and
never read wholesale into renderer memory.
