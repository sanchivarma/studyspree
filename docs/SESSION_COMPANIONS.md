# Session companions and chat

Email configuration is paused at the user's request. Local Supabase now uses
API 55321, database 55322, Studio 55323 and the local inbox 55324. Existing history
was restored from its normal backup; no reset was run. Migrations 0021–0025 are
applied and database types were regenerated.

## Choose and mix styles

Open Study → Choose companions → Virtual partners. Filter by All, Illustrated
people, Whimsical or Realistic. Mix up to eight companions across styles.
Selections persist across refresh and can change during a session without
changing its start timestamp. Real people in shared rooms remain separate users.

- Eight illustrated adults: Noah, Amir, Leo, Kai, Maya, Zara, Mei and Eva.
- Three original whimsical partners: Moss the Fox, Pip the Owl and Momo the Cloud.
- Twelve realistic fictional adults, six men and six women: Arun (South Asian),
  Lin (East Asian), Amina (Black African heritage), Omar (Middle Eastern / North
  African), Sofia (Latin American), Elias (European), Minh (Southeast Asian),
  Samira (mixed heritage), Timur (Central Asian), Leilani (Pacific Islander),
  Valeria (Indigenous Andean), and Andre (Afro-Caribbean). These are character design briefs, not inferred
  identities or an exhaustive list of ethnicities. Cards translate their background
  subtitles into all five supported languages.
- Seven realistic partners have an actual 16-frame, 5.02-second infinitely looping
  GIF showing reading/page-turning or note-taking. These generated frame sequences
  can have pose/background drift; they are not continuous photorealistic video.
  Lin uses a corrected three-column crop and 109 motion-interpolated frames at
  20fps (5.45 seconds). The v4 GIF fixes sideways jumping caused by the old crop.
  The four expanded partners use 106 frames at 20fps (5.3 seconds); each is under
  1.5 MB. Natural continuous source video remains a separate quality improvement.

Exact prompts and source sheets: `docs/realistic-gifs/sources.json`, generated using
built-in imagegen. Reproduce extraction with `node scripts/assemble-realistic-gifs.mjs`
(only when the target revision does not exist). Assets use immutable `study-v3.gif`
and matching `poster-v3.webp` URLs (Lin: v4; expanded cast: v1). All twelve
remain below the 2 MiB GIF budget. No application dependency was added.

All eleven illustrated/whimsical partners have actual 150-second recordings in
muted WebM and MP4. The source renderer spans reading, blinking, posture and
page-turn states over that timeline. It does not concatenate a four-second GIF
to pretend that it contains several minutes of varied motion. The original
short GIFs remain lightweight picker previews; session tiles use the long video.
Each long file is under 600 KB. Reduced motion shows a static poster; hidden or
offscreen animations unmount; missing video falls back to GIF and then poster.
No character requests camera or microphone access.

Reproducible vector sources: `scripts/generate-character-loops.mjs` and
`scripts/generate-session-companions.mjs`. Assets are immutable and generators
refuse to replace published versions. Provenance: `public/characters/LICENCES.md`.

## Realistic video still needed

The available built-in image tool produces still images, not natural two-minute
human videos. A realistic motion source must be supplied through an AI-video
workflow or another appropriately licensed fictional-adult video source.
The app does not label a still photo with camera movement as human motion.

Once an eligible source exists, install ffmpeg/ffprobe and run:

```sh
node scripts/prepare-companion-video.mjs source.mp4 realistic-01 video-v1
```

The helper requires 120–180 seconds of source motion, strips audio, prepares
WebM/MP4 and a poster, enforces size budgets and refuses existing versioned URLs.
Record the source and commercial rights in the character licence ledger, then
connect the emitted paths and measured loopSeconds in `registry.ts`. The
helper was syntax-checked; full transcoding awaits ffmpeg and source footage.

## Existing characters and commercial assets

No famous franchise character has been bundled or claimed as cleared for
commercial use. An independently verified alternative is [Kenney Animal Pack](https://kenney.nl/assets/animal-pack):
the official page identifies CC0, and [Kenney's own support page](https://kenney.nl/support)
explicitly permits commercial projects without mandatory attribution. That
permission applies to those asset files; Kenney reserves its own studio logo.
Checked 17 October 2026. This build uses original fox/owl/cloud designs instead.

## Realistic poster provenance and exact generation prompts

Generated using the built-in imagegen skill/tool; no API runner or reference
photograph was used. Outputs were inspected and converted to project-local WebP
posters. They depict fictional adults and are always identified as virtual.
Generation-service terms apply; no third-party character licence is asserted.

`public/characters/realistic-01/poster-v1.webp`:

> A natural editorial photograph of a completely fictional adult man, around thirty, medium brown skin and dark wavy hair, quietly reading an open textbook at a wooden desk in a calm library. Chest-up candid three-quarter view, looking down at book, hands resting naturally on pages. Warm soft side light, realistic skin texture, casual muted blue sweater. 4:3 landscape composition, entire head and hands in frame, no text, no logos, no famous person, no resemblance to a real identifiable person. This is a static poster for a clearly labelled virtual study partner.

`public/characters/realistic-02/poster-v1.webp`:

> A natural editorial photograph of a completely fictional adult woman, around thirty, East Asian appearance with shoulder-length dark hair, quietly taking handwritten notes from an open textbook at a wooden desk by a library window. Chest-up candid three-quarter view, looking down, hands and pen resting naturally by notebook. Warm soft daylight, realistic skin texture, casual muted green cardigan. 4:3 landscape composition, entire head and hands in frame, no text, no logos, no famous person, no resemblance to a real identifiable person. This is a static poster for a clearly labelled virtual study partner.

## Room chat

Use real Supabase accounts, join the same shared room, and open Session chat.
Participants can introduce themselves or say hi. The latest 100 messages appear
chronologically and refresh every three seconds while the chat is open and the
page is visible. The panel overlays the grid without reducing video tile sizes.
Escape closes chat and restores its trigger's focus; it does not finish the timer.

Before joining, the optional goal is visible with a sharing notice. A nonempty
goal is posted as a goal announcement once per room visit. Clearing the input
opts out. Refresh/repeated Join does not duplicate it. Message authors and kinds
come from authenticated database functions, never caller-supplied identities.
Only active room participants can read/send; leaving, closure or blocked presence
revokes access. Messages from blocked people are suppressed. Retrying an unchanged
send is idempotent; the database allows at most twenty user messages per minute.

The local `ss_admin` preview can use virtual partners; it cannot impersonate an
account to post shared chat. Local camera self-view still never enters the network.

## Verification

- Production build, typecheck, lint, asset gates and 368 unit tests passed.
- All 181 database assertions passed, including 17 room-chat and three mixed-style assertions.
- Twenty-six companion/style/timer/camera browser checks passed, including decoding
  all eleven 150-second recordings in both formats and the twenty-second privacy audit.
- Two real-account journeys passed: local magic-link onboarding and two-person room chat,
  once-per-visit goals, persistence, timer continuity and Escape behavior. Chat was
  verified with the independent media transport unavailable; no Cloud camera minutes
  were needed for this test.
- Maintenance returned 401 without credentials and 200 with its configured bearer token.
- The optional realistic-video importer was syntax-checked; actual transcoding awaits
  ffmpeg and source footage. Realistic motion is not marked complete.

Lin rebuild: install FFmpeg or set `FFMPEG_PATH`, then run `node scripts/prepare-lin-gif.mjs` with no v4 target files present. The local media tool was obtained through imageio-ffmpeg for this task; no application package dependency was added. FFmpeg motion compensation documentation: https://ffmpeg.org/ffmpeg-filters.html#minterpolate.

Expanded cast: exact built-in imagegen prompts and inspected 4x4 sheets are recorded in `docs/realistic-gifs/expanded-cast.json`. Rebuild with `FFMPEG_PATH` configured and `node scripts/prepare-expanded-gifs.mjs`; the script refuses existing immutable targets. New assets use `realistic-09` through `realistic-12` with `study-v1.gif` and `poster-v1.webp`. All five languages include the new names and background subtitles. There are now 23 selectable companions across styles, with the existing eight-at-once cap.

## Personal-session tile controls

Partner selection and visibility buttons sit in a reserved left-side rail. Each virtual tile has a translated remove button, hidden with the rest of the idle controls. Removing a partner updates the existing session selection, persists on refresh, and preserves its ID/start timestamp. Responsive resizing and pagination are pending clarification of the requested page size and video fit; the existing selection cap is unchanged in this partial update.
