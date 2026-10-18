CURRENT: Einstein/Tesla use immutable v24. The original hand and pen are a single rigid cutout with a generated hidden clean plate, not blended/distorted source poses. They write left to right across a line, lift the pen, and return. Clothing/resting hands stay fixed. Einstein retains the approved v20 black-hole background. Tesla now has sharp, tower-anchored 200ms discharges at varied intervals, with no slow arc drift or full-screen flash. One fixed source palette prevents GIF colour flicker. See scripts/rig-scientist-hands.mjs and docs/historical-companions/hand-cleanplate-prompts.json.

CURRENT (18 October 2026): Einstein/Tesla use immutable v20, thirteen-second loops with 30fps muted video and 20fps GIF fallback. Writing uses localized temporal blending between native frames; no optical flow, spatial mirroring or anatomy generation. Tesla's blue arcs drift slowly with a gentle glow; cage geometry is held fixed. Einstein's black-hole halo moves gently. Existing native hand/pen poses still limit realism. Arun uses reversed native chronology v13, other realistic partners v12.

# Study motion and statuses

## Latest background and direction correction

Arun v13 reverses the native v3 action frame order (15 down to 0), changing the page movement from viewer-right-to-left to viewer-left-to-right. The person, lettering and room are not mirrored. The ten-second reading interval and thirteen-second cycle remain.

Einstein and Tesla use v14 GIF/WebM/MP4 files. Their first native frame supplies a stable background and face; a feathered hands/pen/book region retains original writing frames. The black hole and cage no longer deform or flash between inconsistent poses. This intentionally stabilizes those backgrounds rather than inventing new coherent motion. Einstein remains 12.72 seconds; Tesla remains 13 seconds. Scripts/stabilize-scientist-backgrounds.mjs reproduces the edit. Unit checks compare background pixels and confirm writing-area changes.


## Current correction: activity-specific timing

The latest user request supersedes v11�s long holds. All twelve realistic
partners plus Einstein now use v12. Writers have no artificial reading hold:
Lin 10.9s, Timur 11.66s, Leilani 12.72s, Valeria 13.78s, Andre 10.6s, Einstein
12.72s; Idris also writes continuously over 11.66s. Frame delays are uniform
100�130ms. Tesla uses a 13-second muted video/GIF derived from the previous
slow v5 source. His original matching poster is retained.

Realistic readers use 13�14.38-second loops. Their page-turn actions start
after distinct reading intervals: 10s, 10.23s, 10.46s, 10.69s, 10.92s, 11.15s,
11.38s. No mirror, crop, pose generation or optical-flow synthesis was added.
This is a playback-cadence correction, **not a claim of smooth source motion**.
The seven readers still contain only sixteen original poses, and source
anatomical defects remain. The user declined to supply/connect new motion
sources and asked to fix what is possible. Genuinely continuous natural
10�15-second motion cannot be recovered from these missing source poses.

Seventy-five unused assets were archived outside public; the rejected native
pose review script was also archived. Active assets, source GIFs, licence
history and regression fixtures remain. See docs/MEDIA_CLEANUP.md. The earlier
v11/review sections below are historical records; their retired public URLs
are no longer shipped.

## Previous animation review status — 18 October 2026

### Active timing correction

V11 is now active for the twelve realistic partners plus Idris, Elin and
Einstein. It **only retimes the preceding source GIF frames**. It does not
use the rejected v9/v10 poses, regenerate anatomy, interpolate, crop, mirror
or resize. Original files remain immutable. Each first frame holds a quiet
reading pose for a different 15–20-second interval; subsequent frame durations
are 1.5 times their old duration (rounded to GIF's 10 ms timebase). Full cycles
also differ, so the characters do not repeat together every five seconds.
The same pause recurs at every loop boundary.

| Partner | Reading pause | Full cycle |
| --- | --- | --- |
| Arun | 15.00s | 21.48s |
| Lin | 15.34s | 23.98s |
| Amina | 15.67s | 22.15s |
| Omar | 16.01s | 22.49s |
| Sofia | 16.35s | 22.83s |
| Matt | 16.69s | 23.17s |
| Minh | 17.02s | 23.50s |
| Samira | 17.36s | 23.84s |
| Timur | 17.70s | 26.10s |
| Leilani | 18.03s | 26.43s |
| Valeria | 18.37s | 26.77s |
| Andre | 18.71s | 27.11s |
| Idris | 19.04s | 27.44s |
| Elin | 19.38s | 27.78s |
| Einstein | 19.72s | 28.12s |

`scripts/retime-companion-gifs.mjs` reproduces this timing-only revision,
refuses existing outputs, preserves frame counts/dimensions and records each
source SHA256 and encoded frame delay in `mediaRevisions.json`. The registry
uses the new GIF URLs and retains the original matching posters. Tesla's
separate slow 20-second writing video is unchanged. The illustrated and
whimsical authored recordings are unchanged by this correction.

This fixes frequency/staggering. Existing pose quality and the broader natural
motion repair remain unresolved. The reading hold is a still source pose;
it is not newly generated continuous natural human motion.

Verification: typecheck/lint, 427 unit tests and the 27-file asset audit pass.
Nine focused browser cases pass across the final runs, including actual
painted GIF stability during the initial reading hold, staggered action
onsets for Arun/Matt/Elin, realistic/historical playback and refresh,
reduced motion, missing-media fallback, retained animation elements, cold
Start under twenty seconds and timestamp-derived Finish after refresh.
An initial cold-navigation test reached for its media before the session
route loaded; it now explicitly waits for the session screen. Missing-GIF
coverage was updated to abort the active v11 URL and verify interception.

### Previous experiments and quality findings

The user rejected the v5/v9 realistic replacements because they looked
glitchy. They are **not active**. The realistic registry has been restored to
the preceding v1/v3/v4 GIFs. Historical media has not been changed during this
rollback, and its visual-quality complaint remains unresolved.

Optical-flow interpolation between inconsistent generated poses can deform
hands, pages and anatomy even when frame rate, file decoding and timing pass.
The source sheets also vary in framing. The numeric audit below establishes
file integrity, not acceptable visual quality. Do not describe these assets
as visually approved or smooth on the strength of that audit.

The isolated Arun candidate is available as `action-v10-review.gif` and
`study-v10-review.gif` under `public/characters/realistic-01`. It displays
native generated poses without optical-flow or cross-dissolve synthesis,
with a fixed upper scene. The full cycle holds the initial reading pose for
17 seconds. The user reviewed it and rejected it as still jerky or distorted.
It is not selected in the registry. Do not propagate this technique to other
characters or present it as an acceptable repair. It is synthetic animation,
not recorded natural human motion.

The user confirmed both deformation and pauses/jumps. The preceding v3 GIFs
have 16 source poses and explicit frame delays of 180, 280 and 700 ms. Those
holds are part of the media, not evidence that React is restarting playback.
The browser regression checks that timer ticks and idle captions retain the
same animation element. Encoding these poses into a higher-frame-rate file
would not supply the missing coherent human motion.

Next asset production needs a continuous video/animation source rather than
another still-sheet/morphing attempt. An image-to-video connection was found
through Runway discovery, but it is not connected. No generation was run and
no credits were spent. After connection, inspect supported generation options,
credits/cost and terms before choosing the actual production settings.
The first source-motion candidate should preserve Arun's fictional identity,
show natural quiet reading and one page turn left to right from the viewer's
position, with a locked camera, consistent face/hands/book, no dialogue,
no cuts, no zoom or artificial strobing. Inspect the full action at normal
speed and the loop boundary before registering any replacement. The wider
cast, including historical partners, remains unresolved.

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
