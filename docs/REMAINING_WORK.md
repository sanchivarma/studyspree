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

- [ ] Natural photorealistic 2–3-minute companion motion still needs eligible
  source video. Twelve realistic AI studying GIFs are selectable (about five seconds each; Lin at 20fps);
  eleven illustrated/whimsical companions have 150-second loops.
  Session chat and automatic join goals are implemented. See
  [SESSION_COMPANIONS.md](SESSION_COMPANIONS.md).

- [x] The user approved moving local Supabase to 55321–55324. The stack is
  running with preserved history; migrations 0021–0025 and generated types are
  current. All 185 database assertions pass, including room chat and mixed styles.
- [ ] **Paused by the user:** real Gmail delivery. `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are missing.
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
