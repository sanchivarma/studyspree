# Solo study scenes

Ten original desks and twelve independent window choices are persisted through
profile repositories. Study companions ? Solo contains named preview cards.
Visual changes never write session timestamps or banked history.

Desks use original-design `*-wide-v3.webp` artwork, width 100%, height auto.
Seven `frames/*-v2.webp` assemblies remain fixed above the outdoor media. Control
bars retain 25% background opacity with blur; the desk remains above that blur.

## Outdoor motion ? 19 October 2026

The rejected WebGL displacement shader and moving still-image overlays have
been removed completely. No runtime canvas, zoom, pan or video transform is
used. The user approved Mountains and Old Castle; those `filmed-v2` files stay
unchanged. Other choices use new immutable `filmed-v3` / `filmed-v4` / `filmed-v5` filenames and matching
first-frame posters, preventing stale cached animations.

Selected filmed views show distant scenery from steady viewpoints. Castle
Gardens uses the Alhambra and its surrounding vegetation; Nature uses a forest
lake; Clouds uses countryside beneath moving clouds; Sea uses a coastal vista;
Underwater uses a broad aquarium view, slowed twice with temporal frame blending;
the Rivendell-inspired choice uses a
forest waterfall behind the retained elven window. These are not recordings of
fictional places. Other filmed source timing is retained, with no optical-flow interpolation.

Two views combine original fixed artwork with real photographed motion:
Magic Academy has a conservative sky matte containing cloud footage; the
castle and mountains do not move. Sailing Ships has a feathered wave-light layer;
ships and coastline remain stationary. It does NOT yet depict ships travelling
across the bay. These are layered scenes, not fully photographed footage.

Space uses NASA's slow Blue Marble rotation at a smaller constant size. Black
Hole uses NASA's stationary accretion-disk visualization slowed four times,
with temporal frame blending rather than geometric warping. Both include a
stationary credited Hubble deep-field background. They are artistic scientific
visualization composites, not photographs of those objects, and do not claim
a physically complete model of lensing the added background galaxies.

`scripts/prepare-filmed-solo.mjs` encodes silent local H.264 media under 8 MB.
Natural shots have a 600 ms end-to-start dissolve; astronomy uses source loops.
A selection of loops rotates its start point into uninterrupted footage so the
playback boundary does not coincide with the source-end dissolve.
A dissolve reduces a seam; it is not a claim of perfectly repeated natural
motion. Video files are atomically published after encoding. Hidden tabs pause
visuals; reduced motion mounts no video; missing video retains its poster.

Source, creator, licence, modifications and checksums are recorded in
`filmed-sources.json` and `public/solo/LICENCES.md`. Only commercially permitted
sources are selected. Mixkit Restricted License candidates are excluded. The
Pixabay download attempt was cancelled by the user and its clip is not bundled.
Retained original image-generation prompts remain in `prompts.json`.

## Reproducing the selected encodes

Download the exact source URLs in `filmed-sources.json` to their `sourceFile`
paths; cache the credited Hubble JPEG as `.tmp/solo-nasa/deep-field.jpg`.
Run `node scripts/prepare-solo-layers.mjs`, then
`node scripts/prepare-filmed-solo.mjs <ffmpeg> docs/solo-scenes/render-presets.json`.
The encoder retains existing immutable files. Choose a new version when changing
a preset. The two user-approved v2 clips are deliberately absent from this
replacement manifest.
