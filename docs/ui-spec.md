# UI and Interaction Specification

## Product character

The player should feel calm, precise, and cinematic rather than crowded or utilitarian.

Design principles:

- Video is the primary visual element.
- Controls are discoverable but quiet when not needed.
- Every important action works with the keyboard.
- Motion communicates state and does not decorate unnecessarily.
- Native macOS behaviors should remain recognizable.
- The interface must remain usable at compact window sizes.

## Visual system

### Dark appearance

- Background: near-black charcoal rather than pure black.
- Video surface: black with no visible border when possible.
- Controls: translucent charcoal surfaces with subtle separation.
- Primary accent: one restrained accent color for progress and focus.
- Text: high-contrast primary text and muted secondary text.
- Shadows: soft, limited, and used to separate overlays from video.

### Light appearance

- Preserve the same hierarchy and spacing.
- Use warm neutral surfaces instead of stark white panels.
- Keep video canvas black.
- Maintain strong contrast for controls and progress indicators.

### Motion

- Control fade-in/fade-out: short opacity and translation transition.
- Timeline hover: immediate response.
- Loading state: subtle, low-cost animation.
- Reduced-motion mode: remove non-essential transitions.
- Avoid blur and large animated shadows over the video surface.

## Layout behavior

### Large window

- Video canvas fills the central region.
- Full control bar is available.
- Optional playlist/sidebar may be visible.
- Secondary media information can be shown without covering the video.

### Medium window

- Sidebar is collapsed by default.
- Control labels become compact.
- Secondary actions move into a More menu.

### Narrow window

- Preserve the video and primary play/pause action.
- Keep the timeline full width.
- Move speed, subtitles, tracks, and less-used actions into menus.
- Never allow controls to overlap in a way that makes them ambiguous.

## Player states

The player must have explicit visual states for:

- Empty.
- Dragging a file over the window.
- Loading metadata.
- Ready and paused.
- Playing.
- Buffering or waiting.
- Seeking.
- Ended.
- Unsupported media.
- Missing media.
- Playback error.

## Control behavior

- Controls appear when the pointer moves over the player.
- Controls remain visible while paused.
- Controls remain visible while the user is scrubbing.
- Controls fade after a short period during active playback.
- Keyboard focus keeps the relevant control visible.
- Clicking the video toggles play/pause unless the pointer is over a control.
- Double-clicking the video may toggle fullscreen if this remains consistent with the final interaction design.

## Keyboard shortcuts

- Space: play/pause.
- Left/right arrows: seek by a small interval.
- Shift + left/right arrows: seek by a larger interval.
- Up/down arrows: change volume.
- `M`: mute/unmute.
- `F`: fullscreen.
- `P`: Picture in Picture when available.
- `J/K/L`: reverse, pause, and forward when supported.
- `Cmd + O`: open file.
- `Cmd + ,`: open settings.
- `Cmd + W`: close the current window.

Shortcuts must not trigger while the user is typing into a text field or interacting with a native-like menu input.

## Accessibility requirements

- All controls have accessible names.
- Sliders expose current value and range.
- Focus indicators are visible in both appearances.
- Controls are reachable without a pointer.
- Loading, error, and playback-state changes are announced appropriately.
- Color is never the only way to communicate state.
- Reduced-motion preferences are respected.
- The player is tested with VoiceOver before release.
