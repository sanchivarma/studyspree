# Completion audit — 17 October 2026

The 17 feature categories are implemented; their detailed checklist is
[FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md). Implementation is distinct from
deployment, provider credentials and verification on this machine.

## Follow-up requests

- [x] Background environments are named themes, separate from virtual characters.
- [x] Four male and four female original, infinitely looping GIF study partners.
- [x] Calendar/Contacts navigation icons and translated pages.
- [x] Monthly completed reading and scheduled sessions; title and start/end dates.
- [x] Accepted real contacts, private contact lists, calendar invitations and RSVP.
- [x] Shareable session/room links with membership checks.
- [x] Self-video pinning first, narrow margins, mixed human/virtual grids.
- [x] Navigation scrollbar fix and correct People messaging for `ss_admin`.
- [x] Direct email invitation code, preview/real-account entry points, five languages,
  Gmail/SMTP support, optional Resend, honest local capture and registration links.

## Items finished during this audit

- [x] Four original illustrated theme scenes, each with a static poster and muted
  WebM/MP4 loop; guaranteed gradient fallbacks retained. Versioned immutable URLs.
- [x] Four distinct audible synthesized room sounds plus original Still Water
  music; opt-in behavior and the earlier silent selection are preserved.
- [x] Media provenance and licence records; build-time file checks and browser
  decoding checks for both video formats, loop-seam differences and non-silent audio.
- [x] `npm run dev:local` starts both the app and its one-minute maintenance worker.
- [x] Corrected stale README, asset, profile and authentication descriptions.

Verification: production build, typecheck, lint and all 366 unit tests passed. Thirty existing
Start/scene/ambience/local-camera browser checks passed, including the full
twenty-second camera network audit. Two new media browser checks passed:
both formats decode for all four themes with small loop-seam differences,
and all five original audio files decode to distinct, non-silent signals.
Theme files total approximately 5 MB across all formats/posters; every file
is below 1 MB. Character and audio licence checks also passed.

## Outstanding setup and verification

- [ ] Apply additive migration `0021_original_ambience.sql`, regenerate types and
  run database tests. Windows currently reserves ports 54293–54392, including
  the project's local Supabase ports. The user has been asked whether to move
  this project's ports to 55321–55324 or keep them and repair Windows networking.
  Existing data was backed up normally by Supabase; no database reset was run.
- [ ] Real Gmail delivery: `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are missing.
  Configure server-only values as described in [EMAIL_INVITATIONS.md](EMAIL_INVITATIONS.md).
  Resend settings are present but have not been used to send external test mail.
  A recipient must have a reachable public HTTPS app address.
- [ ] Production hosting and its protected one-minute maintenance scheduler.
  Local worker startup is implemented; a running production scheduler cannot be
  asserted without a configured deployment. See [COMMUNITY.md](COMMUNITY.md).
- [ ] Google/Facebook sign-in outside local development requires the owner's
  provider credentials and redirect configuration, per the agreed local-auth scope.
  No provider credentials, paid plan or checkout have been created on the user's behalf.

The `ss_admin` login deliberately remains a development preview. It can run
personal sessions and send configured email invitations; real shared rooms,
contacts, social data and bookings require a registered Supabase account.
