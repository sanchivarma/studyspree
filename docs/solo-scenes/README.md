# Solo study scenes

Ten independently selected desks and twelve window views are persisted in the
existing profile repository. The scene appears on Study and the running session
when companion mode is Solo. Settings disables the controls in other modes;
Study companions → Solo offers named still-image preview cards for both lists.
Changing visuals never changes the session ID, start time or banked history.

The foreground desks were rebuilt as version 2 after the user rejected stretched
artwork. They use full-canvas transparent foregrounds and `object-fit: cover`,
preserving their aspect ratio rather than squeezing them into a short rectangle.
Seven photographic window surrounds replace the rejected CSS divider: apartment,
medieval, castle, elven, spacecraft, submarine and nautical frames. They include
real material textures, perimeter depth and sills. The scene is seated POV.

All twelve outdoor views have 24-second silent local MP4 loops. The landscape
and foreground stay fixed while composited clouds, stars, underwater particles
or a small photographic ship move slowly. The ship scene was revised to look
photographic. These are layered environmental animations, not captured video.
Reduced motion uses static images, hidden tabs pause video, and unavailable
video retains the poster. Missing media never blocks Start or Finish.

Assets are in `public/solo/{desks,views,frames,motion}`. Built-in image_gen
generated the raster artwork; exact selected prompts are in `prompts.json`.
Generation-service terms apply. No third-party photography or footage was copied.
Rivendell is a user-requested generated fantasy portrayal; this record does not
assert rights in the source franchise. The Hogwarts generation was rejected by
the image tool; the user explicitly approved an **original magic academy** instead.
The app labels that replacement accurately. No image-to-video service or new
dependency was used. `scripts/prepare-solo-motion.mjs` makes the MP4s with the
existing FFmpeg. Each video is below 8 MB; still images below 1.5 MB.

Side and bottom session control backplates use the user's final requested
30% background opacity, with backdrop blur. They are pointer-transparent; the
interactive controls remain above them.
