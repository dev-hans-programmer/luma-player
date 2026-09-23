# Media test fixtures

The committed media fixtures are synthetic files generated locally with
FFmpeg. They contain no third-party copyrighted content and are used only for
playback and protocol tests.

- `sample-av.mp4` — one-second H.264/AAC video.
- `sample-tone.wav` — short PCM audio-only fixture.
- `sample-subtitles.vtt` — WebVTT subtitle sidecar.
- `malformed-media.bin` — deliberately invalid media input.

For long-duration or large-file tests, generate a temporary fixture outside
version control rather than committing a large binary:

```sh
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 -t 3600 /tmp/luma-long.mp4
```

Fixture provenance is synthetic generation, so no external media license is
required.
