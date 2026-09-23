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

## Future media access

The media pipeline will use a controlled custom protocol. Raw filesystem paths will not be passed to React, and media requests will be validated in the main process.
