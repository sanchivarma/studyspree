# Reading piano recordings — 19 October 2026

Three complete solo-piano recordings are bundled in `public/audio/`. Playback
fetches those local assets; it does not contact Wikimedia or Musopen. Each file
is below 8 MB. Selection and individual volume use the existing saved effects
preferences. Audio remains gesture-initiated and continues in background tabs.

| Composition | Recording credit | Permission evidence |
| --- | --- | --- |
| Chopin, Nocturne Op. 9 No. 2 | Musopen; performer not identified on this file page | [Exact MP3 file page, CC0 1.0](https://commons.wikimedia.org/wiki/File:Nocturne_Op._9_no._2_in_E_flat_major.mp3) |
| Satie, Gymnopédie No. 1 | Robin Alciatore / Musopen | [Recording author's worldwide public-domain dedication](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) |
| Beethoven, Moonlight Sonata, first movement | Paul Pitman / Musopen | [Recording release, permission ticket 2008012110017088 and commercial-use grant with attribution](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg) |

The permissions above cover the recordings, separately from the old compositions.
Musopen/performer credits and source links are retained in the licence ledger;
the piano controls show no source or credit links, as requested by the user.
Source and output hashes, byte sizes, and permission links are preserved in
`reading-piano-sources.json`. Downloads were converted with the existing FFmpeg:
`-map 0:a:0 -af loudnorm=I=-20:TP=-2:LRA=11 -c:a libmp3lame -b:a 160k`.
No excerpt, generated substitute, or paid dependency was used.

The suggested “Chopin Spring Waltz” is commonly a misattribution of Paul de
Senneville's *Mariage d'Amour*: [performer's explanation](https://jacobspiano.com/music/mariage-damour/).
No reusable recording permission was established for it; the user explicitly
approved three other pieces instead. It is not included.

These are calm listening choices, not a treatment or a claim of proven ADHD benefit.
