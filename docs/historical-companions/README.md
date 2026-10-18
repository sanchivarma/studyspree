CURRENT WRITING REVISION: v30 keeps a continuous native cuff/wrist/hand mesh. Its displacement blends from a fixed sleeve anchor to the moving hand, preserving the original wrist width, contour and shading. It replaces the detached hand and rejected narrow/flat connector candidates. Both 13-second loops retain their existing writing travel and backgrounds. Four enlarged sweep positions were visually inspected for each character; automated tests check wrist continuity throughout all 260 GIF frames. This remains a 2D animation rig, not new source footage.

# Historical study companions

Four assets generated with the built-in imagegen tool on 18 October 2026.
Exact generation prompts are in [prompts.json](prompts.json); source sheets
are preserved alongside this file. Each sheet contains sixteen nearby study
poses in a 4-by-4 grid, cropped and motion-interpolated locally with
`scripts/prepare-historical-gifs.mjs` and the existing FFmpeg installation.

- Idris: original fictional medieval adult male scholar writing with a quill
  on parchment in a candlelit scriptorium.
- Elin: original fictional medieval adult female scribe reading an illuminated
  manuscript and following its lines with a finger.
- Albert Einstein: user-requested stylized historical portrayal, working on
  paper while a playful black hole behind him attracts a loose sheet.
- Nikola Tesla: user-requested stylized historical portrayal, writing inside
  a cage with small electrical arcs outside it.

Einstein and Tesla are animated artistic portrayals, not authentic footage,
endorsements, or historically accurate scenes. No third-party photographs,
film clips, voices or licensed fictional characters were used as source media.
The user's explicit request for these two historical likenesses supersedes
AGENTS.md's default fictional-person asset restriction for these assets.
Generation-service terms apply to generated project assets; this provenance
record does not claim exclusive ownership of historical figures' identities.

Runtime assets are `public/characters/{slug}/study-v1.gif` and
`poster-v1.webp`, recorded in the character licence ledger. Each GIF has 106
frames at 20fps, loops indefinitely over 5.3 seconds, and is under 2 MiB.
These are short interpolated animation loops, not natural multi-minute video.
Tesla uses a reduced 32-colour palette to stay within the budget; other loops
use 96 colours. Posters are static WebP under 256 KiB.

Use `FFMPEG_PATH` to point to an existing FFmpeg binary, then run
`node scripts/prepare-historical-gifs.mjs <slug>`. Existing immutable outputs
are refused; revisions must use a new filename and corresponding registry entry.
Reduced motion, offscreen and hidden-tab states use posters via CharacterLoop.

## Tesla calmer revision

The user requested slower, less glitchy motion. Active Tesla assets now use
immutable v5 filenames. The original v1 and intermediate v2/v3/v4 files remain for cached clients.
`prepare-tesla-calm.mjs` selects nearby writing poses from the first source row,
removes all head-turn poses, and keeps the original face, cage, background and
lighting fixed. A feathered hand/pen region carries the restrained writing
motion. Motion interpolation plays the writing cycle over 20 seconds rather
than 5.3 seconds. Muted WebM/MP4 runtime video uses 30fps; the GIF is 20fps,
400 frames, and retains the 2 MiB budget. No artificial strobing was added.

The v3 cycle includes an initial duplicate pose for interpolation lookahead,
so its first and last displayed writing poses agree at the loop seam.

The final v4 animation mirrors a ten-second writing movement to produce a
twenty-second cycle whose opening and closing poses match exactly. This avoids
interpolation lookahead changing the loop boundary.

The active v5 runtime encodings are lossless to avoid compression shimmer in
the stationary scene. Earlier revisions remain immutable for cached clients.
