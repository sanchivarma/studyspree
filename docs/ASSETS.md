# Theme assets

Run the helper from Git Bash, WSL, macOS, or Linux with `ffmpeg` available on
`PATH`. Its ffmpeg build needs the `libx264` and `libvpx-vp9` encoders. On Windows,
open **Git Bash** to run the `.sh` file; PowerShell cannot execute it directly.

```bash
./scripts/prepare-theme.sh ~/Downloads/rain-desk.mp4 rain-desk
# A source path containing spaces must be quoted:
./scripts/prepare-theme.sh "$HOME/Downloads/Rainy Desk.mp4" rain-desk
```

For a quoted home-directory path, use `"$HOME/Downloads/Rainy Desk.mp4"` rather
than quoting `~`, which Bash does not expand inside quotes.

The script locates the repository through its own path, so output does not depend
on your current directory. Slugs contain lowercase letters, digits, and single
hyphens. Generated assets go in `public/themes/{slug}/`:

| Required filename | Output |
| --- | --- |
| `loop.mp4` | H.264, CRF 26, no audio, `yuv420p`, faststart |
| `loop.webm` | VP9, CRF 34, unconstrained quality (`-b:v 0`), no audio |
| `poster.jpg` | First decoded frame, JPEG quality 2 |

All outputs preserve the source aspect ratio, cap width at 1920 pixels without
upscaling, and use even dimensions. Faststart puts MP4 metadata at the beginning
so playback can start before the full download. The script stages all encodes
before publishing them, refuses to overwrite existing assets, and removes its
temporary files when it exits.

The helper produces these conventional names. The shipped original scenes use
versioned `scene-v1.mp4`, `scene-v1.webm` and `poster-v1.jpg` URLs in the registry
for `rain-desk`, `night-shift`, `balcony-dusk`, and `dorm-bunk`. A different output slug
must be connected through the registry's media paths. Development discovers
available assets when rendering a page; restart the dev server after adding files
if needed. Production records availability at build time, so add assets **before**
running `npm run build`.

## Immutable URLs

`/themes/:path*` and `/audio/:path*` send:

```text
Cache-Control: public, max-age=31536000, immutable
```

Browsers and CDNs can reuse each URL for one year without checking for changes.
Replacing bytes at an existing URL can leave people watching an older scene.
Every new asset version must use a new URL, and published files must remain
unchanged.

For a replacement, prepare into a fresh directory, for example `rain-desk-v2`,
and update the theme's `mp4`, `webm`, and `poster` paths in the registry to
`/themes/rain-desk-v2/loop.mp4`, `/themes/rain-desk-v2/loop.webm`, and
`/themes/rain-desk-v2/poster.jpg`. Keep the logical theme slug `rain-desk`
so saved selections still work. Alternatively, publish new filenames such as
`loop-v2.mp4`, `loop-v2.webm`, and `poster-v2.jpg`, then update the registry paths.
Retain the old published assets for existing cached pages.

## File budget

Each video must be at most **8 MB (8,000,000 bytes)**. The helper prints the exact
size of all three files and warns if any file, including the poster, exceeds
that threshold. A warning does not turn a successful encode into an error; review
the sizes before shipping. CRF is a quality setting, not a size guarantee. If a
file exceeds the budget, reduce the source resolution or loop length and prepare
a fresh version.

## Check the loop seam

The four original scenes target 12-second loops. Nature Day, Nature Night,
Sci-Fi Observatory and Deep Space target 8-second loops. Browser tests check
each theme against its generator's duration and compare the opening frame to
the actual final frame, rather than assuming every clip is 12 seconds long.
Room-sound mappings may share a recording across themes; the audio decoding
test checks each unique asset URL and rejects duplicate bytes across distinct URLs.

Play **each encoded video** with looping enabled for **three minutes**. Watch
the transition from the last frame back to the first: the theme's pose,
lighting, camera position, and background movement should continue smoothly.
Look for flashes, sudden jumps, pauses, or a visibly duplicated frame at the seam.
Encoding does not create a seamless loop; fix the source and prepare a new
version if the transition is noticeable.

With `ffplay` installed, these commands loop each file until you close its window:

```bash
ffplay -stream_loop -1 -an public/themes/rain-desk/loop.mp4
ffplay -stream_loop -1 -an public/themes/rain-desk/loop.webm
```

Check the poster matches the opening scene, then check the scene in StudySpree
on desktop and mobile. Use artwork you own or have permission to distribute.
