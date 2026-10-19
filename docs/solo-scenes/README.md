# Solo study scenes

Nine desks and ten independent window choices are available in Study companions > Solo and Settings. Existing desks keep their full-width proportions and bottom offset. Controls retain the existing 25% opacity with blur.

## Current selection - 19 October 2026

- Old Castle and Mountains retain their approved video files.
- Waterfall is the renamed Rivendell choice and keeps its approved waterfall footage.
- Castle Garden is original generated artwork: a broad English country estate garden with distant fictional adults in period gowns and suits. A new ivory Georgian window frames the view. Only the sky and fountain-light regions receive photographed motion; people and architecture remain fixed.
- Magic Academy keeps its fixed castle, with a slower filmed cloud layer and five gently flickering illuminated windows.
- Sea uses a stationary turquoise-coast view, with a distant island and naturally moving water.
- Underwater is a broad open-ocean seabed with distant marine growth and blue depth, replacing the aquarium. Its eight-second source is retimed to a slow loop using temporal frame blending.
- Sailing Ships keeps the fixed harbor. Its water matte excludes land. Two clean transparent ship layers move slowly through open water in the centre pane on separate 140/190-second cycles; the nearer ship is larger and lower. The original artwork's other ships remain fixed.
- Space uses NASA's galaxy fly-through visualization, without a rotating planet. This is an artist's concept, not telescope footage.
- Black Hole uses the first frame of the user-preferred `blackhole-motion-v1.mp4` as its fixed original composition. Native NASA gas luminosity is softly masked into the warm disk material; its geometry, black shadow and surrounding galaxies remain fixed. The window frame is removed. This is artistic light animation, not a complete physical simulation.

Green Nature, Moving Clouds and Sherlock's table are retired. Legacy local choices normalize to Sea / Modern without discarding other profile fields. New migrations 0066 and 0067 update stored account choices, defaults and constraints; existing sessions and saved dates are untouched.

## Playback and light layers

All outdoor video plays at 0.65x for slow movement. Visual media pauses in a hidden tab; reduced motion keeps a static poster and disables animated object/light layers. Missing media retains its poster fallback. Neither decorative changes nor preference edits write session timestamps.

The Pirate lantern has localized candlelight flicker. The Shakespearean artwork had no lamp, so an original small period candlestick provides its requested flickering light without replacing the desk. The flame overlays use opacity only and align with the desk's own image plane.

No whole-view camera transform, UV shader or optical-flow displacement is used. Architecture stays fixed. Native filmed clips use a short seam dissolve and a playback boundary inside continuous footage where appropriate. Natural footage is not claimed to repeat perfectly.

## Sources and reproduction

Exact source URLs, creators, licences, modifications and SHA-256 checksums are in `filmed-sources.json` and `public/solo/LICENCES.md`. Original artwork was generated with the built-in image_gen tool; the exact prompts are saved in `revision-prompts.json`. No paid stock or new dependency was added.

Cache the files at the `sourceFile` paths in the source ledger. Retain the original generated assets in public/solo/. To reconstruct the extra masks, extract the first frame of `public/solo/views/blackhole-motion-v1.mp4` to `.tmp/solo-revisions/blackhole-original.png`, then run:

```
node scripts/prepare-solo-layers.mjs
node scripts/prepare-solo-revision-layers.mjs
node scripts/prepare-filmed-solo.mjs <ffmpeg> docs/solo-scenes/render-presets.json
```

Existing immutable files are retained. New edits need a new filename. The encoder checks the 8 MB limit and actual output duration before publishing, preventing a source shorter than the requested loop from silently producing a broken seam. Loop rotation uses independently decoded file inputs to avoid buffering half a long RGB clip.
