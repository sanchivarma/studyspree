# Session sound controls

Edit `src/lib/audio/radio-stations.json` to add or remove stations, then restart
the development server (or rebuild the deployed app). No component edits or
database migrations are needed for station-list changes. IDs must be unique and
stable; removing an entry does not erase the user's other preferences.

Each row includes `id`, `name`, `website`, `permissionUrl`, and one of:

- `embedUrl`: the provider's official, permitted iframe player, with `streamUrl: null`.
- `streamUrl`: a permitted direct HTTPS MP3 stream, with `embedUrl: null`.

Record the provider's actual permission page in `permissionUrl`; a public stream
URL alone does not grant embedding permission. Do not extract streams from
official players. The initial Studying, Working and Sleeping entries use Lofi
Cafe's published website embeds: https://loficafe.net/embed (checked 2026-10-18).
All six free stations are included: Studying, Working, Sleeping, Chilling,
Gaming and Japanese Lofi. These are actual in-app players with provider play
and volume controls; no paid radio account or StudySpree stream hosting is needed.
SomaFM is deliberately excluded because its current terms prohibit new app embeds.

Official embedded players retain their own play and volume controls. StudySpree
does not show a separate Music Volume slider. Lofi Cafe hides its volume below
a 640px iframe viewport, so RadioPlayer retains that viewport and aligns the
right-hand controls inside the panel, including on phones. Station names are
shown in StudySpree's station list; no provider audio or scripts are modified.
Closing the sound popover keeps the mounted player alive; changing station,
selecting Off, hiding the browser tab or leaving the session unloads it. Returning
to a hidden tab requires pressing the provider's Play button again. No provider
iframe is mounted before the user selects a station and opens sound controls.

Direct streams use a contextual Radio volume slider and a single streaming Howl rather
than the finite-track crossfade engine. No station audio is downloaded into the
repository, proxied, recorded, published to LiveKit or shared with participants.

Cafe, wind, rain and thunderstorm use distinct CC0 field recordings, including
real café conversations. Brown noise and white noise remain original synthetic
textures. Source pages and download hashes are in FIELD_RECORDINGS_LICENCE.md.
Check multiple boxes to mix them. Each row has a saved individual volume (0–100%);
the separate effects slider controls their shared master volume. Their gain is
normalized by the square root of the number selected to avoid multiplying the
mix's energy. Each source is released when deselected, disabled, or unmounted.
Both selection and individual volumes are stored through the existing profile
repository (`background_effects`, `effect_volumes` for server accounts). Muting
the master stops and unloads each source without discarding saved relative levels.
New profiles
start with no selected effects and no playing music.

The café now uses a louder normalized public coffee-shop recording. Medieval
lute, Library ambience and Castle hearth add three independent effects, each
with a saved level. See `docs/audio/expanded-ambience.md` for sources, licences,
processing and the exact meaning of the designed castle-hearth soundscape.
