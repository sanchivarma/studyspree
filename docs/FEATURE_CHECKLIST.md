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
- [ ] **1. Home/dashboard** — mode shortcuts, real room directory, honest offline state.
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
- Docker engine check: unavailable (dockerDesktopLinuxEngine pipe absent). Database migration/tests/type generation are not claimed as verified.
