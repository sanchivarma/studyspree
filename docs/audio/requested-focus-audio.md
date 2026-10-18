CURRENT: Buddhist, OM and Tibetan chants were removed at the user's request. Migration 0059 and backward-compatible profile parsing remove their selections/levels without affecting other settings. Their URLs are no longer served. The following historical provenance does not describe the active catalog.

Medieval Warrior, Medieval Walk and Medieval Knight are exact local MP3 downloads in ignored .local/audio, with no external fetch during playback. They are local previews under the original CC BY-NC-ND 3.0 terms, not commercially cleared shipped assets.

# Requested focus audio — 18 October 2026

The user clarified that medieval means **music**, and requested a Buddhist
chant and an OM chant if commercially usable free audio could be found.
All three selected sources explicitly grant CC0 copying, modification and
commercial use on the creator's page (verified 18 October 2026):

| Option | Creator/source | Licence evidence |
| --- | --- | --- |
| Calm medieval music | RandomMind, Medieval: Exploration | https://opengameart.org/content/medieval-exploration |
| Buddhist chant | Lenguaverde, Buddhist Nun Chants | https://freesound.org/people/Lenguaverde/sounds/433920/ |
| OM chant | ApeironMedia, Om.wav | https://freesound.org/people/ApeironMedia/sounds/445246/ |

CC0 terms: https://creativecommons.org/publicdomain/zero/1.0/

Medieval music is the creator's instrumental composition, not the rejected
short instrument riffs or a village/monastery ambience replacement. Its tempo
is reduced to 85% without changing pitch. It is a modern medieval-inspired
composition, not a claim of an authentic period performance. The Buddhist
recording is a nunnery chant in Bangkok; the recording's language is not
asserted. OM is a separate meditative chant element, not relabelled as that
Buddhist performance. Sources are creator-published downloads/HQ previews;
no YouTube, radio or unlicensed streaming audio is used.

`scripts/ambience-sources.json` records source pages, downloads and filters.
`scripts/prepare-ambience.mjs` verifies the CC0 evidence before downloading,
extracts published Freesound preview URLs where necessary, refuses existing
immutable outputs, limits length to 180 seconds, and encodes 128 kbps stereo
MP3. Gentle filtering, a -23 LUFS / -4 dBTP target and a gradual entrance
avoid sharp starts. The existing two-second loop crossfade remains in use.
All outputs are below 3 MB, under the 8 MB budget. No dependency was added.

| File | Source SHA256 | Output SHA256 |
| --- | --- | --- |
| effect-medieval-calm-v1.mp3 | 7e412350d4f4a777981285ca36b1c1a30feb7e5e255d7774ce61480e99daa8d9 | 7d013bb8e8a2da187c317d30f682c7154001333f2336213682e0000dff11c231 |
| effect-buddhist-chant-v1.mp3 | 4f8647bcec8aa130a64d67ffec68e64dbf4bc3ec24f380239916033fe5e88ab5 | f0c7251079d2fd1a4563092950fb29a4fb623cc93c8216c6bad2453692a79a91 |
| effect-om-chant-v1.mp3 | 1c2c71cf4f6655ad445ee475590b9a9ef42433edef9b126191a314dd0346142e | 00bdc2381e4fd8548b86d602bd2d76474a516920bccd1ad90c5fcaef8c470e30 |

The unfinished garden/monastery downloads were moved out of public assets
into ignored `.tmp/unselected-audio`; they are not active catalog entries.
The prior three rejected instrument files remain immutable but unselected.

Migration 0054 enables the three selected keys without rewriting existing
mixes/levels. The old generic `medieval` key now selects the new composition;
retired flute/lyre keys are still removed on read. Five-language labels and
independent saved sliders are shared by Settings and session controls.
The master Background effects volume slider now sits above the effect list
in both locations, as the user allowed. It continues to affect live gain.

## User correction: replacements, 18 October 2026

The user rejected Exploration and the synthetic Om.wav element. Those files
remain immutable but are no longer selected by the active catalog.

- **Medieval** now plays RandomMind�s **Medieval: The Bard�s Tale**, the
  creator�s looping lute/flute arrangement. Source and CC0 permission:
  https://opengameart.org/content/medieval-the-bards-tale
  Download: https://opengameart.org/sites/default/files/Loop_The_Bards_Tale.wav
  This is medieval-inspired instrumental music, not an authenticated historical performance.
- **OM** now plays **Multiple Om Chant1 mp3**, a human vocal recording by
  **Gordon Rosenberg/Artrias (easy_thunder)**, recorded with a Yeti microphone.
  Source: https://freesound.org/people/easy_thunder/sounds/451536/
  Licence: https://creativecommons.org/licenses/by/4.0/
  Commercial redistribution/adaptation is permitted with attribution. The
  effect picker shows creator, source, licence and modification notice when
  selected, in both Settings and the session sound control.

Neither replacement is tempo/pitch shifted or has added reverb. Loudness
normalization (-23 LUFS, -4 dBTP, LRA 7) and MP3 conversion are the changes.
The creator-supplied medieval loop is used; Om retains the complete 51.78s
vocal recording. Existing effect selections and individual volumes persist.

| File | Source SHA256 | Output SHA256 | Bytes |
| --- | --- | --- | --- |
| effect-medieval-calm-v2.mp3 | 6d0852a758dc41a763cd33b0693fa878e36d7f1d0149f7674bc82241a7a90de1 | 834eb3bd1ebfad464b9a52305e5d55f24b77e2df20452b7edf7bbdcbc9e571e9 | 924568 |
| effect-om-chant-v2.mp3 | 1f479d1b1d2306032bde5acdbf4c05b4dc95dfe0653396c077aa3d80fb6d579d | 69aa7f6b39b9d1514450782d54bdf5660d09c5920758cc88af0a11956506b47b | 829692 |

## User-supplied OM replacement

The user overwrote effect-om-chant-v2.mp3 during this task. Its new SHA256 is 389c42319276ceed900d8c35a0c9bc828295eac82b0d7ac968be8ec9b844a4ec (205345 bytes). It is not the previously attributed Gordon Rosenberg recording. The application now selects an exact copy under effect-om-chant-v3.mp3 to bypass the immutable one-year browser cache. No pitch, tempo or normalization changes were made. Previous creator attribution was removed to avoid misattribution. The user was asked for the source/licence; commercial packaging is blocked by the audio licence gate until permission is established.

The user identified https://archive.org/details/OMChanting_201411 as the replacement source. Its public metadata endpoint https://archive.org/metadata/OMChanting_201411 was inspected on 18 October 2026: title OM Chanting, original MP3 22332681 bytes; creator, licenseurl and rights are absent. The local 205345-byte replacement is an excerpt/re-encode supplied by the user, not a byte-identical original. A download listing is not recorded commercial permission. Release clearance remains pending; do not reuse the previous CC BY creator attribution for these bytes.
