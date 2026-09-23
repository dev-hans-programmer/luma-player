# Decision 0004 — Visual and Interaction Direction

Status: Proposed

## Decision

Use a dark-first cinematic interface with restrained translucency, a single accent color, automatic control hiding, responsive layouts, and full keyboard accessibility. Light appearance will preserve the same visual hierarchy with warm neutral surfaces.

The video surface remains the dominant element. The interface should not resemble a dense media-management dashboard during ordinary playback.

## Rationale

The product is primarily a player, so reducing visual noise improves focus and makes the control layer feel intentional. Responsive behavior and keyboard support keep the design useful across window sizes and usage styles.

## Consequence

The UI implementation must separate persistent controls from transient pointer state and must avoid expensive effects over the video surface. Detailed behavior is captured in `docs/ui-spec.md`.
