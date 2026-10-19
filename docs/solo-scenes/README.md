# Solo study scenes

Nine desks and nine independent window choices are available in Study companions > Solo and Settings. Existing desks keep their full-width proportions and bottom offset. Controls retain the existing 25% opacity with blur.

Click the selected desk card a second time to remove the desk, including its light overlay. Click any desk to restore one. Settings also offers “No table”. This preference persists independently of the window and personal timer; migration 0069 enables the same choice for account profiles.

## Current selection - 19 October 2026

- Old Castle and Mountains retain their approved video files.
- Waterfall is the renamed Rivendell choice and keeps its approved waterfall footage.
- Castle Garden is original generated artwork: a broad English country estate garden with distant fictional adults in period gowns and suits. A new ivory Georgian window frames the view. The sky, falling water at the sides of the central fountain bowl and basin reflections receive photographed motion; people and architecture remain fixed.
- Magic Academy keeps its fixed castle and slow filmed clouds. Sixteen indoor windows glow on 10–14-second cycles; eight existing entrance/approach lanterns have small, dim flicker on 11–14-second cycles.
- Sea uses a stationary turquoise-coast view, with a distant island and naturally moving water.
- Underwater is a broad open-ocean seabed with distant marine growth and blue depth, replacing the aquarium. Its eight-second source is retimed to a slow loop using temporal frame blending. Three small original fish cutouts visit at separate intervals, with isolated tail motion and pauses between passes.
- Sailing Ships keeps the fixed harbor. Its water matte excludes land. Two clean transparent ship layers move slowly through open water in the centre pane on separate 140/190-second cycles; the nearer ship is larger and lower. The original artwork's other ships remain fixed.
- Space uses NASA's galaxy fly-through visualization, without a rotating planet. This is an artist's concept, not telescope footage.

Green Nature, Moving Clouds, Black Hole and Sherlock's table are retired. Legacy local choices normalize to Sea / Modern without discarding other profile fields. New migrations 0066, 0067 and 0068 update stored account choices, defaults and constraints; existing sessions and saved dates are untouched.

## Playback and light layers

All outdoor video plays at 0.65x for slow movement. Visual media pauses in a hidden tab; reduced motion keeps a static poster and disables animated object/light layers. Missing media retains its poster fallback. Neither decorative changes nor preference edits write session timestamps.

The Pirate lantern has localized candlelight flicker. The Shakespearean artwork had no lamp, so an original small period candlestick provides its requested flickering light without replacing the desk. The flame overlays use opacity only and align with the desk's own image plane.

No whole-view camera transform, UV shader or optical-flow displacement is used. Architecture stays fixed. Native filmed clips use a short seam dissolve and a playback boundary inside continuous footage where appropriate. Natural footage is not claimed to repeat perfectly.

## Sources and reproduction

Exact source URLs, creators, licences, modifications and SHA-256 checksums are in `filmed-sources.json` and `public/solo/LICENCES.md`. Original artwork was generated with the built-in image_gen tool; the exact prompts are saved in `revision-prompts.json`. No paid stock or new dependency was added.

Cache the files at the `sourceFile` paths in the source ledger. Retain the original generated assets in public/solo/. To reconstruct the extra masks, run:

```
node scripts/prepare-solo-layers.mjs
node scripts/prepare-solo-revision-layers.mjs
node scripts/prepare-filmed-solo.mjs <ffmpeg> docs/solo-scenes/render-presets.json
```

Existing immutable files are retained. New edits need a new filename. The encoder checks the 8 MB limit and actual output duration before publishing, preventing a source shorter than the requested loop from silently producing a broken seam. Loop rotation uses independently decoded file inputs to avoid buffering half a long RGB clip.

Black Hole video/poster/artwork files have been removed from public delivery. Legacy saved choices upgrade to Sea while preserving the selected desk and all other profile fields. Fish and light animations use transform/opacity only and respect reduced motion and hidden-tab pause.
