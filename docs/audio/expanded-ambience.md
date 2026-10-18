# Expanded ambience: source, permission and processing

Verified 18 October 2026 against the creators' Freesound pages. All recordings
below explicitly use **Creative Commons 0**, permitting modification,
redistribution and commercial use. Supporting licence text:
https://creativecommons.org/publicdomain/zero/1.0/

| Asset | Creator | Original source / permission |
| --- | --- | --- |
| effect-cafe-v3.mp3 | oliverbrotzman | https://freesound.org/people/oliverbrotzman/sounds/125247/ |
| effect-medieval-v1.mp3 | f-r-a-g-i-l-e | https://freesound.org/people/f-r-a-g-i-l-e/sounds/506266/ |
| effect-medieval-v2.mp3 | Lukaszzz123 | https://freesound.org/people/Lukaszzz123/sounds/807187/ |
| effect-library-v2.mp3 | xkeril | https://freesound.org/people/xkeril/sounds/620683/ |
| effect-castle-v1.mp3 | tripjazz | https://freesound.org/people/tripjazz/sounds/394754/ |

The café contains public coffee-shop conversations recorded on a busy Saturday.
Its first three minutes are normalized to -16 LUFS with a -2 dBTP target, so
100% can deliver a useful level instead of amplifying an unusually quiet file.
The active Medieval strings option uses a slow violin recording, with softened
high frequencies, subtle hall echo and a quieter -24 LUFS target. This is a
medieval-inspired ambience treatment of the creator's "Classical slow violin",
not a claim of an authentic historical performance. The previous two-chord lute
file remains immutable for cached clients but is no longer selected.
Library is an excerpt of a
quiet university reading room, with pages, pens, chairs and ventilation.
Castle hearth is a fireplace recording with low-pass filtering and a subtle
hall echo, a designed castle-like soundscape rather than a claim of a recording
inside a historic castle.

Sources are the creators' public HQ MP3 previews. Exact URLs and ffmpeg filters
are in `scripts/ambience-sources.json`. Use the existing ffmpeg installation:

For library v2, the source is over nine minutes long. Only bytes 0–4,999,999 of
its HQ preview are downloaded; the input hash below refers to that bounded
excerpt. The output is then trimmed to three minutes.

```powershell
node scripts/prepare-ambience.mjs C:/path/to/ffmpeg.exe
# To prepare a single new catalog entry:
node scripts/prepare-ambience.mjs C:/path/to/ffmpeg.exe effect-library-v2.mp3
```

The helper checks the source page for CC0, refuses existing output names,
limits length to 180 seconds and size to 8 MB, encodes 128 kbps stereo MP3,
and reports input/output SHA256 hashes. Runtime crossfades cover the wrap seam.
Already published assets are unchanged. No YouTube or radio audio was copied.

| Asset | Source SHA256 | Output SHA256 |
| --- | --- | --- |
| effect-cafe-v3.mp3 | b2b2dd2c491ebc4ba2ff79c1906a5ec764ccd76c525fdcf926846b1b567e96f6 | 9acee8e0d6bde09623d3a55911160be02c48e8dd2d5839e75fddc34ee0bd3758 |
| effect-medieval-v1.mp3 | 6519ac01d4f78429343bfeef5be05b6cffaede6b2579b9d737c287abdd62ae64 | 77e1fe82130b6bde77d534370d3ecc31853ac47c083ffd65ad7254a403251506 |
| effect-medieval-v2.mp3 | e9dfefa13073800d4ca08a8c128edc750a91a77fd831d86e8426711a8ca7e6ec | c7055e7cb2ce0843c50fb32f4d1d1cf2d180323dc43a2b5c9af2ab88808794ae |
| effect-library-v2.mp3 | a7edd4688e867021c0a49156dcab3d15d43a737dbc0af75a02fa5596996f0d2e | 7b7cf7412ae8f50de6fee34266735a72d72555100815789312a61f40fe9ba8c4 |
| effect-castle-v1.mp3 | d392cb5b057faf8ca3ed28ee0019a7bd9f159ff7627f1a5a8a951cfb7bed5ef7 | 534a326981fcc131b4c1bd5df0cc8296d4123c2a3eb5ce5ae456e67aa1b858c8 |

## Additional medieval-inspired choices (18 October 2026)

The existing Medieval strings recording and its saved key are unchanged.
Medieval flute uses f-r-a-g-i-l-e's gentle flute loop, "Medieval Flute Riff":
https://freesound.org/people/f-r-a-g-i-l-e/sounds/506265/
Medieval lyre uses Hedmarking's "Lyre.flac", described by its creator as an
Iron Age lyre: https://freesound.org/people/Hedmarking/sounds/191883/
Both source pages explicitly grant CC0 commercial use and modification.
These are medieval-inspired sound choices, not claims of historical authenticity.
Both are slowed to 85% tempo without pitch shifting, low-pass softened at
5.5 kHz, given gentle hall echo and normalized to -24 LUFS / -4 dBTP.
They retain independent saved volume levels and the existing runtime crossfade.
Each is under 0.31 MB, within the 8 MB per-file budget.

| Asset | Source SHA256 | Output SHA256 |
| --- | --- | --- |
| effect-medieval-flute-v1.mp3 | 43ca6b508f9d05eaf4fef957e3fdac106092dd514af60779caaf73264b58cc42 | 8eeb4950d13dea9766e4841908d7d604b018264d9bb22d95908a104ece6bb93f |
| effect-medieval-lyre-v1.mp3 | dc42390f58d3d0b9508bddfd824580e4459e6f576fe74c4321972af3322535b5 | 28b6798831eaf4d6e5811020fd22641214c0e18740aac6144ed7a7f2277da696 |
