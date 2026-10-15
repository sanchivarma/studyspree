# StudySpree feature implementation checklist

Requested order: **17 → 1 → 6 → 5 → 7 → 4 → 15 → 2 → 3 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16**.

Checkboxes mean implemented and verified, not merely scaffolded. Existing features are reused. Backend-dependent work must be verified against a running backend before its feature is marked complete.

- [x] **17. Virtual study characters** — local flow and database migration verified
  - [x] Eight distinct original animated GIFs: four adult male, four adult female; static posters and licence ledger.
  - [x] Typed registry, validation, asset preparation and asset checks.
  - [x] Accessible character picker; reduced-motion, visibility and missing-media handling.
  - [x] Persist local profile preferences and session snapshots independently from themes.
  - [x] Character-only sessions, refresh recovery and timer continuity browser tests.
  - [x] Migration 0004 applied, pgTAP passed, and database types generated from running local Supabase.
- [ ] **1. Home/dashboard** — local dashboard verified; real room discovery awaits feature 2
  - [x] Solo/Virtual Partners shortcuts, preserved preferences and immediate personal Start.
  - [x] Typed repository query, latest-room/directory/online components and honest unavailable human mode.
  - [x] Five-language copy, unit coverage and two passing browser journeys.
  - [ ] Connect authorised remote room discovery and presence when real room infrastructure is implemented.
- [ ] **6. Stats/history** — local implementation verified; server adapter/API rollout pending
  - [x] All-time, 7/30/90-day and custom ranges; bounded charts with accessible tables.
  - [x] Cursor-based history with date/companion filters and per-session companion labels.
  - [x] Saved-date grouping, tied-timestamp pagination, invalid-range and DST tests.
  - [x] Browser checks for filters, all five languages, seed conservation, pagination, mobile heatmap, streak visibility and completion-to-Stats updates.
  - [ ] Implement/verify equivalent filtered-history endpoints in the server repository rollout.
- [x] **5. Profile** — private/public DTOs, editing, uploads, follow relationships and access controls verified.
  - [x] Private-by-default account cards, narrow public DTOs and owner editing.
  - [x] Profile/cover uploads to a private bucket; owner paths, size/MIME/signature validation and no-store authenticated delivery.
  - [x] Real follow/unfollow, unique relationships, counts and cross-user access rules.
  - [x] Five-language mobile UI, persisted development preview and two-account Supabase browser verification.
  - [x] Migration 0005 applied; generated types updated; 22 profile pgTAP assertions passed.
  - [x] Start and permanent webcam privacy regressions; profile transport isolated from the session import graph.
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
- Real video rooms will use **LiveKit Cloud**, selected by the user. Keep virtual GIF partners entirely local to the app; they must not consume LiveKit participant minutes. No paid plan activation is authorised. Cloud project credentials are still needed before live rooms can be tested. Commercial limits and payments require explicit product/provider configuration.
- No schema migration is marked verified until database tests and generated types can run.

## Verification log

- Feature 17: eight distinct GIFs validated (32 frames each, infinite loop, 106–141 KB); all 284 unit tests passed in the first implementation check.
- Character browser coverage: selection, independent themes, refresh, switching without resetting timestamps, zero camera requests, reduced motion, missing media, keyboard navigation, and tab visibility.
- Start/privacy regressions: 20 cases passed in the combined run; the four affected cases passed after correcting companion-control overlap with the self-view/permission note. The permanent 20-second camera request audit passed.
- Docker initially unavailable; starting Docker Desktop brought the engine up (29.8.2). Local Supabase startup and database verification are now in progress.
- Home: both browser journeys passed; local dashboard contract is covered by the 285-test unit suite. Real room discovery remains a dependency on feature 2, with no fabricated users/rooms in local mode.
- Stats: 292 unit tests passed; all nine relevant Stats browser cases passed across the initial and targeted verification runs. The completion regression passed unchanged once the resource-heavy initial container startup stopped. Existing deadlines and privacy assertions were retained.
- LiveKit Cloud selected for feature 2; pricing/self-hosting notes and server-only environment placeholders are recorded in docs/LIVEKIT.md. No subscription was activated.
- Local Supabase is healthy after excluding unused analytics/edge services. Database verification: 27 pgTAP assertions passed across auth, progress/RLS and companions; generated src/types/database.ts from the live local schema. Ended companion immutability and cross-user session isolation are verified.
- Local accounts: seven authentication UI browser tests passed, including wrong-password feedback and all five languages. A separate real-backend test passed for local magic-link delivery, session exchange, exactly three onboarding steps and authenticated refresh. Run `npm run test:e2e:supabase` with the local stack running; this does not replace the offline UI/privacy suites.
- Profile: local editing/refresh, all five languages and mobile layout passed; two real local accounts verified uploads, private/public/private visibility and follow/unfollow. Database suite: 49 assertions passed, including 22 new profile checks. Unit suite: 304 tests passed. Start/privacy regression run passed 17 cases initially; the four affected cases passed unchanged after removing the profile transport from the session import graph and allowing compilation to settle. Cold Start retained its 20-second deadline. No webcam privacy assertions were changed.
