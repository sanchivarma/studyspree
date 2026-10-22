# Solo study scenes

Nine desks and nine independent window choices are available in Study companions > Solo and Settings. Existing desks keep their full-width proportions and bottom offset. Controls retain the existing 25% opacity with blur.

Click the selected desk card a second time to remove the desk, including its light overlay. Click any desk to restore one. Settings also offers “No table”. This preference persists independently of the window and personal timer; migration 0069 enables the same choice for account profiles.

## Current selection - 19 October 2026

- Old Castle and Mountains retain their approved video files.
- Waterfall is the renamed Rivendell choice and keeps its approved waterfall footage.
- Castle Garden is original generated artwork: a broad English country estate garden with distant fictional adults in period gowns and suits. A new ivory Georgian window frames the view. The sky, falling water at the sides of the central fountain bowl and basin reflections receive photographed motion; people and architecture remain fixed.
- Magic Academy keeps its fixed castle and filmed clouds, with additional soft drifting clouds. Sixteen indoor windows glow on 8.8–12.1-second cycles; eleven existing entrance/terrace/approach fixtures flicker on 9.35–12.65-second cycles. The seven visible fixtures across the middle terrace include the small step and rail lights, with individual positions and sizes matched to the painted artwork.
- Sea uses a stationary turquoise-coast view, with a distant island and naturally moving water.
- Underwater is a broad open-ocean seabed with distant marine growth and blue depth, replacing the aquarium. Its eight-second source is retimed to a slow loop using temporal frame blending. Three small original fish cutouts visit at separate intervals, with isolated tail motion and pauses between passes.
- Sailing Ships keeps the fixed harbor. Its water matte excludes land. Two clean transparent ship layers move slowly through open water in the centre pane on separate 140/190-second cycles; the nearer ship is larger and lower. The original artwork's other ships remain fixed.
- Space uses NASA's galaxy fly-through visualization, without a rotating planet. This is an artist's concept, not telescope footage.

Green Nature, Moving Clouds, Black Hole and Sherlock's table are retired. Legacy local choices normalize to Sea / Modern without discarding other profile fields. New migrations 0066, 0067 and 0068 update stored account choices, defaults and constraints; existing sessions and saved dates are untouched.

## Playback and light layers

Outdoor video plays at 0.65x for slow movement, with Magic Academy at 0.8x. Visual media pauses in a hidden tab; reduced motion keeps a static poster and disables animated object/light layers. Missing media retains its poster fallback. Neither decorative changes nor preference edits write session timestamps.

The Medieval candle, Shakespearean candlestick and Pirate lantern have localized flicker. Each uses a separate 1.19–1.53-second rhythm, with small flame-scale and brightness changes anchored at the wick, plus a soft warm glow. The Shakespearean artwork had no lamp, so its existing small period candlestick supplies that candle. The overlays share the desk's image plane and bottom offset. Hidden tabs and reduced motion remove animated overlays; static candle artwork remains visible. Removing a desk also removes its candle overlay.

The initial additive overlay left the original painted flame at full brightness, making the effect difficult to see. A warm radial dimming layer now modulates that original flame, clipped to the artwork's alpha so it cannot darken the scenery around it. Its opacity varies inversely with the flame core and glow. The browser regression hides the additive layers and compares rendered bright/dim flame pixels with the scenery video paused, then restores normal playback. The preceding production build produces zero pixel difference in that isolated check.

Flame cores have a fixed 1.2-unit Gaussian feather in the 1600-wide desk plane, softening their edges without blurring the candle body or animating a filter. The Pirate flame/glow/dimming anchor is shifted four artwork units right to x=205. Academy windows and outdoor lanterns pair stronger soft glow with inverse dimming of the painted light. Their staggered cycles are now 10% longer for slightly slower flicker. Outdoor cores have a fixed 1.15-unit blur instead of a sharp source merge, and radial dimming fades to transparency at the boundary. Cloud overlays sit lower in the visible sky at higher opacity and drift over a wider range; a stationary feathered skyline mask keeps them off the castle and mountains. All motion still pauses when hidden and respects reduced motion.

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
