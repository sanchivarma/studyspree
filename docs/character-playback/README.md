# Character playback

The active catalog contains 25 characters. Idris and Elin are retired from new
choices; historical sessions and their banked time remain readable.

Every remaining character has an immutable `study-playback-v1.mp4` (H.264,
faststart) and WebM fallback at 320 × 240, 30 fps. These files retain the existing
poses, reading holds and chronology. They improve decoding and delivery; they
do not create missing source motion or repair anatomical defects. The existing
GIF remains a fallback when neither video format is supported.

`audit.json` records source hashes, duration, frame rate, file size and the full
decode check for both formats. `scripts/prepare-character-playback.mjs` produces
the files using the existing local FFmpeg executable. No runtime dependency
was added.

The movie element pauses while hidden or offscreen and resumes at its previous
position. Reduced motion uses the poster. A session shows the theme poster
behind opaque participant tiles, avoiding a second full-screen video decoder;
hiding those tiles restores the theme movie.

`e2e/performance/character-playback.spec.ts` checks each character's actual browser
playback, the two-second Start deadline, painted frame delivery, dropped frames
and looping. DOM/network traces remain enabled; continuous trace screenshots
are disabled because recording them competes with video compositing. Passing
an encoding audit alone does not establish acceptable visual motion.
