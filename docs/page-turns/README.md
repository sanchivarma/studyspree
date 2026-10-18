# Study motion and statuses

## Current animation review status — 18 October 2026

The user rejected the v5/v9 realistic replacements because they looked
glitchy. They are **not active**. The realistic registry has been restored to
the preceding v1/v3/v4 GIFs. Historical media has not been changed during this
rollback, and its visual-quality complaint remains unresolved.

Optical-flow interpolation between inconsistent generated poses can deform
hands, pages and anatomy even when frame rate, file decoding and timing pass.
The source sheets also vary in framing. The numeric audit below establishes
file integrity, not acceptable visual quality. Do not describe these assets
as visually approved or smooth on the strength of that audit.

One isolated Arun candidate is available as `action-v10-review.gif` and
`study-v10-review.gif` under `public/characters/realistic-01`. It displays
native generated poses without optical-flow or cross-dissolve synthesis,
with a fixed upper scene. The full cycle holds the initial reading pose for
17 seconds. This candidate is not selected in the registry; user review is
pending before propagating this technique to other characters. It is still
synthetic animation, not recorded natural human motion.

The following v9 production notes document the rejected experiment, not
the active realistic media. Source prompts/sheets remain for provenance.
Rejected render scripts and 84 intermediate media files were archived under
the ignored `.tmp/animation-rejected` directory; they are not shipped.
`scripts/prepare-native-page-review.mjs` reproduces the isolated review clip
and refuses to overwrite existing immutable output.

The user's final direction is **left to right from the viewer's position**.
Arun, Minh, Sofia, Samira and Matt use new generated page-turn poses in that
direction. Matt retains the existing `realistic-06` ID, previously named Elias,
so saved selections and history continue to work.

The final source sheets were created with the built-in imagegen tool using
the project's existing fictional portraits as identity references. Exact
prompts and reference paths are in [prompts.json](prompts.json). No real human
camera feed, third-party photograph, or new application dependency is involved.
Generated project assets remain subject to the generation-service terms and
are recorded in `public/characters/LICENCES.md`.

The generator supplies uneven grids and sometimes clips a final row or column.
The rejected dense-page experiment recorded the observed complete cells,
excludes clipped cells, fixes the upper scene, and interpolates nearby hand/book
poses. These are synthetic short study loops, not continuous real-person video.

| Partner | Complete source cells | Initial still-reading pause | Full cycle |
| --- | --- | --- | --- |
| Arun | 6 × 7 | 14.5s | 29s |
| Minh | 7 × 8 | 16s | 31s |
| Sofia | 6 × 7 | 16.5s | 33s |
| Samira | 7 × 7 | 17s | 35s |
| Matt | 4 × 6 | 17.5s | 37s |

The animation itself starts with more reading poses, so page lifting begins
approximately 15–20 seconds after mounting. Different pause lengths and cycle
periods prevent the cast from turning pages together. Still/video/still
concatenation retains the pauses in the actual output timeline. Runtime MP4
and WebM are muted, 320×240, 30fps. GIF previews are 240×180 at 20fps. V9
filenames are immutable; revisions require a new version.

The rejected study-motion experiment interpolated Amina/Omar.
`smooth-illustrated-companions.mjs` interpolates the eleven
illustrated/whimsical 150-second recordings and their previews. Existing Lin,
Timur, Leilani, Valeria, Andre and historical GIFs already use 20fps.
Tesla's separate calmer loop remains unchanged.

`src/lib/characters/mediaRevisions.json` records the active media versions,
durations and preview dimensions. `npm run check:character-assets` audits all
27 partners for infinite looping, cadence, sampled movement/frame steps,
distinct files, posters, budgets and provenance. Its reproducible results are
in [animation-audit.json](animation-audit.json). Browser tests also decode both
runtime formats and verify the real reading pauses and varied periods.
The numeric checks detect timing/jump regressions; they do not guarantee
photorealistic human anatomy in interpolated frames.

## Session statuses

Fifty translated general statuses mix encouragement, study tasks and gentle
deadlines. Einstein, Tesla, Idris and Elin each have ten separate themed
statuses. The whimsical partners have their own suitable smaller pools.
These are fictional virtual-partner statuses, not real people or reminders.

Each new session receives a repository/server-owned `companionStatusCycle`.
Each character advances through its pool without a repeat until the pool
wraps; refresh, theme changes and companion changes keep the same cycle.
Migration 0053 stores the ordinal for server accounts; its insert trigger
serializes assignment and its update trigger protects the snapshot. Legacy
sessions without an ordinal retain deterministic ID-based statuses.

The pencil icon opens My status. It reuses the existing personal-tile
repository, validation, owner access and history. The user's status is
remembered across sessions by explicit choice. Shared-room edits also publish
through the existing membership-checked room status command, with visible
feedback if publication is unavailable.

After five seconds, tile names/statuses fade with tile controls. Session
navigation icons stay visible and keyboard accessible. Any input restores
the labels. Timer accounting, Finish/Escape and local-camera privacy are
unchanged.
