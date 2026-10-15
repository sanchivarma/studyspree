# StudySpree feature implementation checklist

Requested order: **17 → 1 → 6 → 5 → 7 → 4 → 15 → 2 → 3 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16**.

Checkboxes mean implemented and verified, not merely scaffolded. Existing features are reused. Backend-dependent work must be verified against a running backend before its feature is marked complete.

- [ ] **17. Virtual study characters** — local implementation verified; database rollout pending
  - [x] Eight distinct original animated GIFs: four adult male, four adult female; static posters and licence ledger.
  - [x] Typed registry, validation, asset preparation and asset checks.
  - [x] Accessible character picker; reduced-motion, visibility and missing-media handling.
  - [x] Persist local profile preferences and session snapshots independently from themes.
  - [x] Character-only sessions, refresh recovery and timer continuity browser tests.
  - [ ] Apply migration 0004, run pgTAP and generate database types when Docker/Supabase is available.
- [ ] **1. Home/dashboard** — local dashboard verified; real room discovery awaits feature 2
  - [x] Solo/Virtual Partners shortcuts, preserved preferences and immediate personal Start.
  - [x] Typed repository query, latest-room/directory/online components and honest unavailable human mode.
  - [x] Five-language copy, unit coverage and two passing browser journeys.
  - [ ] Connect authorised remote room discovery and presence when real room infrastructure is implemented.
- [ ] **6. Stats/history** — date ranges, accessible charts, filtered history and companion information.
- [ ] **5. Profile** — private/public DTOs, editing, uploads, follow relationships and access controls.
- [ ] **7. Achievements** — pure eligibility, persisted idempotent awards and profile badges.
- [ ] **4. Camera/personal tile** — mirror preference, tile visibility, status/history and explicit sharing boundary.
- [ ] **15. Navigation/utilities** — feature-aware routes, tasks, notifications, search and feedback.
- [ ] **2. Live session/room** — authorised room membership, presence, real media adapter and grid/pins.
- [ ] **3. Spaces** — discovery, categories, invitations and atomic capacity enforcement.
- [ ] **8. Focus partners** — merged participation overlaps, private history and favourites.
- [ ] **9. Study-buddy discovery** — listings, search, owner editing, messaging and reporting/blocking.
- [ ] **10. Conversations** — channels, private chats, threads, saved messages and reliable delivery.
- [ ] **11. Groups** — discovery, private membership, moderation roles and ownership transfer.
- [ ] **12. Feed/posting** — following/popular feeds, replies, reactions, saves and validated attachments.
- [ ] **13. Scheduled focus sessions** — timezone-safe calendar, bookings, capacity and session entry.
- [ ] **14. Leaderboards** — opt-in, trusted rankings, stable pagination and privacy.
- [ ] **16. Entitlements/limits** — configured server-authoritative access and interval metering; no invented prices.

## Constraints and dependencies

- Themes remain environments. Characters are virtual companions. People are real users.
- Existing local-camera privacy tests remain mandatory.
- Supabase account/storage work already in progress must be preserved; local social previews cannot impersonate a real backend.
- Real video rooms require a configured media transport. Commercial limits and payments require explicit product/provider configuration.
- No schema migration is marked verified until database tests and generated types can run.

## Verification log

- Feature 17: eight distinct GIFs validated (32 frames each, infinite loop, 106–141 KB); all 284 unit tests passed in the first implementation check.
- Character browser coverage: selection, independent themes, refresh, switching without resetting timestamps, zero camera requests, reduced motion, missing media, keyboard navigation, and tab visibility.
- Start/privacy regressions: 20 cases passed in the combined run; the four affected cases passed after correcting companion-control overlap with the self-view/permission note. The permanent 20-second camera request audit passed.
- Docker initially unavailable; starting Docker Desktop brought the engine up (29.8.2). Local Supabase startup and database verification are now in progress.
- Home: both browser journeys passed; local dashboard contract is covered by the 285-test unit suite. Real room discovery remains a dependency on feature 2, with no fabricated users/rooms in local mode.
