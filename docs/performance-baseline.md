# Performance baseline

Run the repeatable metadata baseline with:

```sh
pnpm performance:baseline
```

The script measures five cold `ffprobe` processes against
`apps/desktop/tests/fixtures/sample-av.mp4`. It intentionally does not claim
to measure first-frame time, GPU decode, or renderer frame rate; those require
an actual Electron window and platform media hardware.

## Reference capture

Captured on the development Apple Silicon Mac on 2026-09-24:

- Node `v26.5.0`
- Electron `44.4.5`
- ffprobe `8.1.2`
- Fixture: H.264/AAC, 320×180, one second, 16 KB
- Five metadata probes: 29 ms minimum, 37 ms average

## Targets for the manual matrix

- First frame: record p50 and p95 for 1080p H.264 and 4K H.264.
- Seek: record p50 and p95 for a 10-second seek on local and external media.
- Playback: no sustained renderer long tasks during ordinary playback or
  resize; playback clock updates remain throttled to 50 ms.
- Memory: no unbounded growth during a 60-minute playback session.
- Delivery: no complete-file buffering; media requests remain byte-ranged.
- Recovery: remove a source drive, corrupt persistence JSON, and crash the
  renderer, then verify the safe recovery path and diagnostics.

The remaining hardware-dependent measurements are intentionally manual and are
tracked in `tasks.md` rather than being represented as fabricated automated
numbers.
