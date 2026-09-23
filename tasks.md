# Production macOS Video Player — End-to-End Task List

This file is the implementation backlog for the Electron + React + TypeScript macOS video player.

The work is intentionally broken into independently addressable tasks. Each task has a stable ID so it can be requested directly, for example:

> Implement T305 — PlaybackController.

## Status legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete and verified
- `[!]` Blocked or requires a product decision

## Implementation rules

- Follow the dependency order unless a task explicitly says it can be parallelized.
- Keep renderer code free of direct Electron and Node.js imports.
- Keep playback-critical work off the main-process event loop.
- Use strict TypeScript; avoid `any` except at narrowly documented external boundaries.
- Add comments for intent, security decisions, timing behavior, and non-obvious tradeoffs.
- Do not mark a task complete until its acceptance criteria and relevant tests pass.
- Update this file when a task is completed, split, deferred, or replaced.

## Initial technology baseline

- Electron 44.x
- React 19.3.x
- React DOM 19.3.x
- TypeScript 6.x
- Node.js 24.x for development tooling
- Vite for renderer bundling
- Electron Forge for packaging and release artifacts
- pnpm workspaces
- Vitest for unit tests
- Playwright for Electron end-to-end tests
- CSS Modules or a typed CSS design-token system

Pin exact versions in the lockfile after project initialization. Do not use an unreviewed floating `latest` dependency in production builds.

---

# Phase 0 — Product and repository decisions

## T001 — Confirm application identity

- [!] Choose product name and reverse-DNS bundle identifier.
- [!] Choose developer/publisher name.
- [x] Choose application data directory name.
- [x] Choose minimum supported macOS version.
- [x] Record provisional decisions in `docs/decisions/`.

Current provisional identity is documented and requires approval before packaging work begins.

Acceptance criteria:

- Bundle ID, product name, and macOS support policy are documented.
- The decisions are used consistently by development, packaging, and persistence code.

## T002 — Define supported media scope

- [x] Define supported containers for the first release.
- [x] Define supported video and audio codecs.
- [x] Define subtitle formats.
- [x] Define whether remote URLs are supported in version one.
- [x] Define expected behavior for unsupported or corrupted files.
- [x] Create `docs/media-support.md`.

Acceptance criteria:

- The UI can communicate supported and unsupported media clearly.
- Test fixtures cover every declared supported media category.

## T003 — Define product scope and non-goals

- [x] Confirm provisional version-one features.
- [x] Explicitly defer editing, transcoding, cloud sync, and media-server support unless required.
- [x] Define the first-release definition of done.
- [x] Record non-goals in `README.md` and `docs/architecture.md`.

## T004 — Define visual and interaction direction

- [x] Define dark-mode visual language.
- [x] Define light-mode behavior.
- [x] Define responsive window breakpoints.
- [x] Define control auto-hide behavior.
- [x] Define keyboard shortcuts.
- [x] Define accessibility requirements.
- [x] Create a lightweight UI specification in `docs/ui-spec.md`.

---

# Phase 1 — Workspace and developer tooling

## T101 — Create the pnpm workspace

- [x] Create root `package.json`.
- [x] Create `pnpm-workspace.yaml`.
- [x] Create `apps/desktop`.
- [x] Create `packages/contracts`, `packages/domain`, and `packages/config`.
- [x] Add workspace scripts for development, type checking, linting, testing, and building.

Acceptance criteria:

- `pnpm install` works from a clean checkout.
- Workspace packages can import only the layers they are allowed to import.

## T102 — Configure TypeScript

- [x] Add strict root TypeScript configuration.
- [x] Add separate configurations for the desktop app and shared packages.
- [x] Establish package boundaries without hiding layer ownership.
- [x] Configure resolver aliases for renderer tooling.
- [x] Add declaration output for shared contracts.

Acceptance criteria:

- `pnpm typecheck` passes with strict mode enabled.
- No production source file requires `any` without an explanation.

## T103 — Configure linting and formatting

- [x] Configure ESLint for TypeScript, React, Electron, and import boundaries.
- [x] Configure Prettier.
- [x] Add import-order rules.
- [x] Add unused-code detection.
- [x] Add pre-commit validation.

## T104 — Configure testing foundation

- [x] Configure Vitest for unit and integration tests.
- [x] Configure Playwright for Electron end-to-end tests.
- [x] Add test scripts and coverage output.
- [x] Add deterministic test utilities.
- [x] Add media test fixture directories.

## T105 — Configure local development workflow

- [x] Add a single command to start Electron and Vite together.
- [x] Add hot reload for renderer changes.
- [x] Add main/preload rebuild behavior.
- [x] Add development logging through the Electron/Vite process.
- [x] Document setup in `README.md`.

## T106 — Configure source control hygiene

- [x] Add `.gitignore`.
- [x] Add `.editorconfig`.
- [x] Add `.nvmrc` or equivalent Node version policy.
- [x] Add lockfile.
- [ ] Add GitHub issue and pull request templates if the project will be shared.

---

# Phase 2 — Electron application shell

## T201 — Create the Electron main process

- [x] Create `apps/desktop/src/main/main.ts`.
- [x] Handle `app.whenReady()`.
- [x] Handle macOS activation.
- [x] Handle `window-all-closed` correctly for macOS.
- [x] Prevent duplicate application initialization.
- [x] Add graceful shutdown behavior.

## T202 — Create the main BrowserWindow

- [x] Create `main-window.ts`.
- [x] Configure initial size and minimum size.
- [x] Configure titlebar behavior.
- [x] Configure background color.
- [x] Configure preload path.
- [x] Configure secure `webPreferences`.
- [x] Restore and persist window bounds safely.

Acceptance criteria:

- The window opens reliably in development and packaged builds.
- Window state cannot create an off-screen or unusably small window.

## T203 — Implement secure preload

- [x] Create `preload.ts`.
- [x] Enable context isolation.
- [x] Keep Node integration disabled in the renderer.
- [x] Expose only explicit, typed methods through `contextBridge`.
- [x] Add `window-api.d.ts` typings.
- [x] Add cleanup support for event listeners.

## T204 — Add renderer bootstrap

- [x] Create React root entry point.
- [x] Add global error boundary.
- [x] Add application providers.
- [x] Add loading shell.
- [x] Add fallback error screen.
- [x] Verify the renderer does not access Node or Electron directly.

## T205 — Add application menu and command model

- [x] Add File menu.
- [x] Add Playback menu.
- [x] Add View menu.
- [x] Add Window menu.
- [x] Add Help menu.
- [x] Define commands independently from menu presentation.
- [x] Connect commands to the typed preload API.

## T206 — Add secure content loading

- [x] Define a restrictive Content Security Policy.
- [x] Prevent unexpected navigation.
- [x] Prevent unexpected new-window creation.
- [x] Reject untrusted external content.
- [~] Prefer custom protocols over unrestricted `file://` loading; media protocol work is scheduled for Phase 4.
- [x] Add security documentation.

## T207 — Add application logging and diagnostics

- [x] Add structured logs for main-process failures.
- [x] Add renderer error reporting to the main process.
- [x] Redact sensitive paths where appropriate.
- [x] Add a debug log export option.
- [x] Ensure logs do not affect playback performance.

---

# Phase 3 — Shared contracts and clean architecture

## T301 — Define domain entities

- [x] Define `MediaAsset`.
- [x] Define `MediaMetadata`.
- [x] Define `PlaybackPosition`.
- [x] Define `Playlist` and `PlaylistItem`.
- [x] Define `AudioTrack` and `SubtitleTrack`.
- [x] Define `PlaybackState`.

## T302 — Define domain errors

- [x] Define typed media errors.
- [x] Define file-access errors.
- [x] Define validation errors.
- [x] Define persistence errors.
- [x] Define native-helper errors.
- [x] Define user-safe error messages separately from diagnostic details.

## T303 — Define ports and interfaces

- [x] Define media repository port.
- [x] Define preferences repository port.
- [x] Define recent-files repository port.
- [x] Define native macOS service port.
- [x] Define window-control port.
- [x] Define playback event port.

## T304 — Define IPC contracts

- [x] Define request and response types.
- [x] Define event payloads.
- [x] Define IPC channel names as constants.
- [x] Define error serialization.
- [x] Define runtime validation schemas.
- [x] Add tests for valid and invalid payloads.

## T305 — Implement IPC registration

- [x] Register IPC handlers in one controlled location.
- [x] Validate every request before use.
- [x] Validate the sender for every privileged request.
- [x] Prevent duplicate handler registration.
- [x] Keep handlers thin and delegate to application services.

## T306 — Define renderer state boundaries

- [x] Define application state.
- [x] Define playback state.
- [x] Define UI state.
- [x] Define settings state.
- [x] Define event subscription cleanup.
- [x] Prevent high-frequency playback events from rerendering unrelated UI.

## T307 — Write architecture documentation

- [x] Document process boundaries.
- [x] Document dependency direction.
- [x] Document IPC flow.
- [x] Document media loading flow.
- [x] Document error flow.
- [x] Document how to add a new feature safely.

---

# Phase 4 — Media access and playback foundation

## T401 — Implement file selection

- [x] Implement native Open File dialog.
- [x] Restrict selectable file types where appropriate.
- [x] Return opaque media identifiers rather than raw paths to the renderer.
- [x] Handle cancellation cleanly.
- [x] Handle inaccessible files.

## T402 — Implement drag and drop

- [x] Add drop target to the empty state.
- [x] Validate dropped files.
- [x] Support multiple files if playlists are supported.
- [x] Reject directories unless folder import is implemented.
- [x] Show clear drag-over feedback.

## T403 — Implement secure file access

- [x] Normalize and validate selected paths in the main process.
- [x] Prevent path traversal.
- [x] Handle external drives.
- [x] Handle files moved or deleted after selection.
- [x] Bookmark persistence is not required until an App Sandbox distribution target is enabled.

## T404 — Implement the custom media protocol

- [x] Register a controlled `media://` protocol.
- [x] Map opaque asset IDs to validated filesystem locations.
- [x] Support byte-range requests.
- [x] Return correct MIME types.
- [x] Support large files without buffering the complete file.
- [x] Close streams on cancellation.
- [x] Add protocol security tests.

Acceptance criteria:

- Large local files begin playback without being fully loaded into memory.
- Invalid asset IDs cannot access arbitrary filesystem paths.

## T405 — Implement media metadata loading

- [x] Load duration.
- [x] Load natural dimensions.
- [x] Detect audio presence.
- [x] Detect subtitle tracks where available.
- [x] Detect chapters where available.
- [x] Return useful metadata errors.
- [x] Keep metadata loading off the playback-critical path.

## T406 — Implement `PlaybackController`

- [x] Create the controller abstraction.
- [x] Attach and detach an HTML video element.
- [x] Load and replace media sources.
- [x] Implement play and pause.
- [x] Implement seek.
- [x] Implement volume and mute.
- [x] Implement playback rate.
- [x] Implement looping.
- [x] Implement fullscreen requests.
- [x] Implement ended behavior.
- [x] Implement cleanup when media changes.

## T407 — Implement playback event translation

- [x] Translate native video events to typed application events.
- [x] Handle `loadedmetadata`.
- [x] Handle `canplay`.
- [x] Handle `waiting` and `stalled`.
- [x] Handle `playing`.
- [x] Handle `timeupdate`.
- [x] Handle `progress`.
- [x] Handle `ended`.
- [x] Handle `error`.
- [x] Throttle high-frequency events before updating React state.

## T408 — Implement playback error handling

- [x] Distinguish unsupported media from missing files.
- [x] Display user-safe messages.
- [x] Preserve diagnostic details in logs.
- [x] Offer retry.
- [x] Offer to choose another file.
- [x] Ensure the UI never becomes permanently stuck in loading state.

## T409 — Add media test fixtures

- [x] Add small supported video fixture.
- [x] Add audio-only fixture if supported.
- [x] Add subtitle fixture.
- [x] Add malformed or unsupported fixture.
- [x] Add long-duration fixture strategy.
- [x] Document fixture licensing and provenance.

---

# Phase 5 — Player interface

## T501 — Create design tokens

- [x] Define colors.
- [x] Define typography.
- [x] Define spacing.
- [x] Define radii.
- [x] Define shadows.
- [x] Define animation durations.
- [x] Define focus-ring styles.
- [x] Define reduced-motion behavior.

## T502 — Build the application shell layout

- [x] Build main player layout.
- [x] Build optional sidebar layout.
- [x] Build titlebar/header region.
- [x] Build content region.
- [x] Build overlay layer.
- [x] Ensure the video surface remains the dominant visual element.

## T503 — Build the empty state

- [x] Add drag-and-drop target.
- [x] Add Open File action.
- [x] Add recent files section.
- [x] Add supported-format guidance.
- [x] Add empty-state loading and error variants.

## T504 — Build the video surface

- [x] Mount the video element once per player screen.
- [x] Implement contain/cover behavior.
- [x] Implement background treatment.
- [x] Handle aspect-ratio changes.
- [x] Prevent accidental text selection over the player.
- [x] Add accessible media labeling.

## T505 — Build playback controls

- [x] Play/pause button.
- [x] Previous/next buttons where playlist exists.
- [x] Skip backward/forward actions.
- [x] Current time display.
- [x] Duration display.
- [x] Volume button and slider.
- [x] Mute action.
- [x] Playback speed menu.
- [x] Fullscreen action.
- [x] Picture in Picture action placeholder.
- [x] More-actions menu.

## T506 — Build the timeline

- [x] Add seek track.
- [x] Add progress indicator.
- [x] Add buffered indicator.
- [x] Add keyboard-accessible seeking.
- [x] Add pointer and mouse support.
- [x] Add scrubbing state.
- [x] Show preview time while scrubbing.
- [x] Avoid excessive React rerenders.

## T507 — Implement control visibility

- [x] Show controls on pointer movement.
- [x] Hide controls after inactivity.
- [x] Keep controls visible while scrubbing.
- [x] Keep controls visible while paused.
- [x] Keep controls accessible through keyboard focus.
- [x] Support reduced motion.

## T508 — Implement responsive layouts

- [x] Define large-window layout.
- [x] Define medium-window layout.
- [x] Define narrow-window layout.
- [x] Collapse secondary controls into menus.
- [x] Verify resizing does not interrupt playback.
- [x] Verify fullscreen layout.

## T509 — Implement keyboard shortcuts

- [x] Space: play/pause.
- [x] Left/right arrows: seek.
- [x] Shift + arrows: larger seek.
- [x] Up/down arrows: volume.
- [x] `M`: mute.
- [x] `F`: fullscreen.
- [x] `P`: Picture in Picture.
- [x] `J/K/L`: reverse, pause, forward where supported.
- [x] `Cmd + O`: open file.
- [x] `Cmd + ,`: settings.
- [x] Ensure shortcuts do not interfere with text inputs.

## T510 — Implement accessibility

- [x] Add semantic buttons and labels.
- [x] Add keyboard focus states.
- [x] Add screen-reader names.
- [x] Add slider values and orientation.
- [x] Add live-region messages for errors and state changes.
- [~] Test with VoiceOver manually on macOS.
- [x] Testable increased-contrast and reduced-motion styles are defined.

## T511 — Add loading and error visuals

- [x] Loading indicator.
- [x] Buffering indicator.
- [x] Unsupported media state.
- [x] Missing file state.
- [x] Playback failure state.
- [x] Retry and replace-file actions.

---

# Phase 6 — Persistence and media library

## T601 — Implement preferences storage

- [x] Define preferences schema.
- [x] Persist volume.
- [x] Persist playback rate.
- [x] Persist theme.
- [x] Persist control preferences.
- [x] Version the preferences schema.
- [x] Handle migration and corrupted preferences.

## T602 — Implement recent files

- [x] Store recent media entries.
- [x] Limit list size.
- [x] Remove missing files.
- [x] Add clear-history action.
- [x] Add recent-file UI.

## T603 — Implement resume playback

- [x] Save playback position periodically.
- [x] Avoid excessive disk writes.
- [x] Save final position on close when possible.
- [x] Restore position after reopening.
- [x] Skip resume for media near completion.

## T604 — Implement playlists

- [x] Define playlist persistence model.
- [x] Add and remove playlist items.
- [x] Reorder items.
- [x] Play next and previous.
- [x] Handle missing playlist items.
- [x] Persist active item and position.

## T605 — Implement folder import

- [x] Add folder selection.
- [x] Scan supported media types.
- [x] Avoid blocking the main process.
- [x] Report scan progress.
- [x] Support cancellation.
- [x] Avoid duplicate assets.

## T606 — Implement multiple-window behavior

- [x] Define whether multiple player windows are supported.
- [x] Keep player state isolated per window.
- [x] Share preferences safely.
- [x] Handle app activation and window restoration.

---

# Phase 7 — Advanced playback features

## T701 — Playback speed and looping

- [ ] Add speed presets.
- [ ] Add custom speed if desired.
- [ ] Add repeat-one.
- [ ] Add repeat-playlist.
- [ ] Add AB loop only if confirmed in scope.

## T702 — Subtitle support

- [ ] Detect subtitle tracks.
- [ ] Display subtitle menu.
- [ ] Select and disable tracks.
- [ ] Add subtitle styling preferences if supported.
- [ ] Handle missing subtitle resources.

## T703 — Audio track support

- [ ] Detect audio tracks.
- [ ] Display audio track menu.
- [ ] Change active track.
- [ ] Handle unsupported track changes.

## T704 — Chapter support

- [ ] Detect chapters.
- [ ] Display chapter list.
- [ ] Seek to chapter.
- [ ] Display current chapter.

## T705 — Thumbnail timeline previews

- [ ] Define thumbnail generation strategy.
- [ ] Generate thumbnails off the playback path.
- [ ] Cache thumbnails.
- [ ] Cancel obsolete thumbnail requests.
- [ ] Display thumbnails while scrubbing.

## T706 — Picture in Picture

- [ ] Implement capability detection.
- [ ] Add Picture in Picture action.
- [ ] Handle unsupported media gracefully.
- [ ] Test entering and leaving Picture in Picture.

## T707 — macOS media controls

- [ ] Decide whether media-key support is required.
- [ ] Decide whether Now Playing integration is required.
- [ ] Implement only after the core player is stable.
- [ ] Add integration tests where possible.

---

# Phase 8 — Optional Swift/macOS native helper

## T801 — Confirm native gap before adding Swift

- [ ] Profile the Electron implementation first.
- [ ] Record the exact missing capability.
- [ ] Confirm it cannot be implemented reliably in Electron.
- [ ] Create an architecture decision record before proceeding.

## T802 — Create the Swift helper package

- [ ] Create `native/macos/MediaMetadataKit`.
- [ ] Define a small command/response protocol.
- [ ] Keep the helper independent from React.
- [ ] Add arm64 and x64 build targets.
- [ ] Add unit tests for native operations.

## T803 — Implement Electron-to-Swift bridge

- [ ] Add `NativeMacOSService` port.
- [ ] Implement helper process startup.
- [ ] Use JSON messages over stdin/stdout or a Unix socket.
- [ ] Add request IDs and timeouts.
- [ ] Restart or fail gracefully if the helper exits.
- [ ] Never block the main process waiting indefinitely.

## T804 — Package and validate the native helper

- [ ] Include helper binaries in packaged resources.
- [ ] Validate architecture at runtime.
- [ ] Sign helper binaries.
- [ ] Include helper in notarization workflow.
- [ ] Test missing-helper behavior.

---

# Phase 9 — Performance and reliability

## T901 — Establish performance baselines

- [ ] Measure cold startup.
- [ ] Measure first-frame time.
- [ ] Measure seek latency.
- [ ] Measure idle CPU usage.
- [ ] Measure playback CPU/GPU usage.
- [ ] Measure memory over long playback.
- [ ] Measure renderer frame rate during resize.
- [ ] Document target hardware and media fixtures.

## T902 — Optimize renderer updates

- [ ] Profile React renders.
- [ ] Add selector-based subscriptions.
- [ ] Throttle timeline updates.
- [ ] Keep transient pointer state local where possible.
- [ ] Remove unnecessary context updates.
- [ ] Lazy-load non-player features.

## T903 — Optimize media delivery

- [ ] Verify byte-range support.
- [ ] Verify large-file behavior.
- [ ] Verify stream cancellation.
- [ ] Verify no complete-file buffering.
- [ ] Verify external-drive playback.

## T904 — Optimize window and animation behavior

- [ ] Profile fullscreen transitions.
- [ ] Profile resizing.
- [ ] Avoid expensive backdrop effects over video.
- [ ] Use compositor-friendly transforms and opacity.
- [ ] Respect reduced-motion settings.

## T905 — Test 4K and long-duration playback

- [ ] Test 1080p H.264.
- [ ] Test 4K H.264.
- [ ] Test HEVC where supported.
- [ ] Test HDR behavior where supported.
- [ ] Test long-duration playback.
- [ ] Test pause/resume after sleep and wake.
- [ ] Record dropped-frame observations.

## T906 — Add crash and failure recovery

- [ ] Handle renderer crash.
- [ ] Handle main-process exception.
- [ ] Handle media stream failure.
- [ ] Handle external-drive removal.
- [ ] Handle corrupted persistence data.
- [ ] Preserve useful diagnostics without exposing private content.

---

# Phase 10 — Testing and quality gates

## T1001 — Unit-test domain logic

- [ ] Test playback state transitions.
- [ ] Test playlist operations.
- [ ] Test preference migrations.
- [ ] Test resume-position rules.
- [ ] Test error mapping.

## T1002 — Test IPC contracts

- [ ] Test valid requests.
- [ ] Test invalid requests.
- [ ] Test malformed payloads.
- [ ] Test unauthorized sender behavior.
- [ ] Test serialized errors.

## T1003 — Test main-process services

- [ ] Test file validation.
- [ ] Test media protocol path handling.
- [ ] Test range requests.
- [ ] Test recent-file persistence.
- [ ] Test window-state persistence.

## T1004 — Test React components

- [ ] Test empty state.
- [ ] Test controls.
- [ ] Test timeline.
- [ ] Test loading state.
- [ ] Test error state.
- [ ] Test responsive visibility rules.
- [ ] Test keyboard interactions.

## T1005 — Add Electron end-to-end tests

- [ ] Launch packaged-like development app.
- [ ] Open a fixture video.
- [ ] Play and pause.
- [ ] Seek.
- [ ] Change volume.
- [ ] Enter and exit fullscreen.
- [ ] Drag and drop a file.
- [ ] Reopen a recent file.
- [ ] Restore resume position.
- [ ] Verify unsupported-file behavior.

## T1006 — Add accessibility tests

- [ ] Run automated accessibility checks.
- [ ] Verify keyboard-only navigation.
- [ ] Verify focus visibility.
- [ ] Verify VoiceOver labels.
- [ ] Verify reduced-motion behavior.

## T1007 — Add security tests

- [ ] Verify renderer cannot access Node APIs.
- [ ] Verify preload exposes only intended methods.
- [ ] Verify CSP.
- [ ] Verify navigation restrictions.
- [ ] Verify path traversal protection.
- [ ] Verify IPC sender validation.
- [ ] Verify untrusted URLs are rejected.

## T1008 — Create manual regression matrix

- [ ] Apple Silicon machine.
- [ ] Intel Mac if supported.
- [ ] Multiple macOS versions.
- [ ] Retina and non-Retina displays.
- [ ] External monitor.
- [ ] Fullscreen and windowed playback.
- [ ] Sleep/wake.
- [ ] External drive.
- [ ] AirPods or external audio device.
- [ ] Dark and light appearance.

---

# Phase 11 — Packaging and deployment

## T1101 — Configure application metadata

- [ ] Add application icon.
- [ ] Add bundle identifier.
- [ ] Add versioning strategy.
- [ ] Add copyright metadata.
- [ ] Add file associations.
- [ ] Add URL schemes only if required.

## T1102 — Configure macOS packaging

- [ ] Configure Electron Forge.
- [ ] Build arm64 artifact.
- [ ] Build x64 artifact if supported.
- [ ] Build universal artifact if practical.
- [ ] Produce DMG.
- [ ] Produce ZIP.
- [ ] Verify packaged resource paths.

## T1103 — Configure code signing

- [ ] Configure Developer ID Application certificate.
- [ ] Configure hardened runtime.
- [ ] Define minimal entitlements.
- [ ] Sign the application.
- [ ] Sign native helper binaries.
- [ ] Verify signatures in CI.

## T1104 — Configure notarization

- [ ] Configure Apple notarization credentials securely.
- [ ] Submit packaged artifacts.
- [ ] Staple notarization tickets.
- [ ] Verify Gatekeeper behavior on a clean Mac.
- [ ] Document release credentials and rotation process.

## T1105 — Configure CI/CD

- [ ] Run type checking on pull requests.
- [ ] Run linting on pull requests.
- [ ] Run unit tests on pull requests.
- [ ] Run build validation on pull requests.
- [ ] Run end-to-end tests on release branches.
- [ ] Build macOS release artifacts.
- [ ] Sign and notarize from protected CI secrets.
- [ ] Publish checksums.

## T1106 — Implement update strategy

- [ ] Choose update provider.
- [ ] Define update channels.
- [ ] Add update availability check.
- [ ] Add download and install flow.
- [ ] Handle failed updates safely.
- [ ] Test rollback or recovery procedure.

## T1107 — Prepare release documentation

- [ ] Installation instructions.
- [ ] Supported media documentation.
- [ ] Keyboard shortcut reference.
- [ ] Troubleshooting guide.
- [ ] Privacy statement.
- [ ] Release notes template.
- [ ] Known limitations.

---

# Phase 12 — Final release gate

## T1201 — Complete definition-of-done review

- [ ] All version-one features are complete.
- [ ] No critical or high-severity bugs remain.
- [ ] All quality gates pass.
- [ ] Performance targets are documented and acceptable.
- [ ] Accessibility checks pass.
- [ ] Security review passes.
- [ ] Signed and notarized artifact installs on a clean Mac.
- [ ] Uninstall and reinstall behavior is verified.

## T1202 — Create release candidate

- [ ] Freeze dependencies.
- [ ] Generate changelog.
- [ ] Build release candidate.
- [ ] Run complete regression matrix.
- [ ] Test update flow.
- [ ] Collect final diagnostics.

## T1203 — Publish stable release

- [ ] Tag release.
- [ ] Publish signed artifacts.
- [ ] Publish checksums.
- [ ] Publish release notes.
- [ ] Monitor crash reports and user feedback.
- [ ] Create follow-up backlog for deferred features.

---

# Recommended implementation order

Implement in this order for the fastest path to a working product:

1. `T001`–`T004` — product decisions
2. `T101`–`T106` — workspace and tooling
3. `T201`–`T207` — Electron shell
4. `T301`–`T307` — architecture and contracts
5. `T401`–`T409` — media playback foundation
6. `T501`–`T511` — player interface
7. `T601`–`T606` — persistence and library
8. `T901`–`T906` — performance and reliability
9. `T1001`–`T1008` — testing and quality gates
10. `T1101`–`T1107` — deployment
11. `T1201`–`T1203` — release

Advanced playback tasks `T701`–`T707` and native tasks `T801`–`T804` should be added after the core player is stable.

# Definition of a production-ready player

The project is ready for its first stable release when:

- A user can open or drop a supported local video.
- Playback starts reliably and remains smooth during normal interaction.
- Controls work with mouse, keyboard, and VoiceOver.
- Large files use streaming/range access rather than full-memory loading.
- Renderer, preload, and main-process boundaries are secure and typed.
- Playback state survives normal close/reopen flows.
- The app handles unsupported, missing, and corrupted files gracefully.
- The app passes unit, integration, end-to-end, accessibility, and security checks.
- A signed and notarized macOS artifact installs successfully on a clean machine.
